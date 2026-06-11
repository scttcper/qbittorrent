import type { TorrentClientConfig, TorrentClientState } from '@ctrl/shared-torrent';
import { parse as cookieParse } from 'cookie';
import { ofetch } from 'ofetch';
import type { Jsonify } from 'type-fest';
import { joinURL } from 'ufo';

import { getAuthCookieName, isGreater } from './requestUtils.js';

export interface QBittorrentState extends TorrentClientState {
  auth?: {
    /**
     * auth cookie
     */
    sid: string;
    /**
     * auth cookie name
     */
    cookieName?: string;
    /**
     * cookie expiration
     */
    expires: Date;
  };
  version?: {
    version: string;
    isVersion5OrHigher: boolean;
  };
}

export interface QBittorrentConfig extends TorrentClientConfig {
  /**
   * qBittorrent WebAPI key. Added in qBittorrent v5.2.0.
   * When set, the client uses `Authorization: Bearer <apiKey>` instead of cookie login.
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/API-Key-Authentication-%28%E2%89%A5v5.2.0%29}
   */
  apiKey?: string;
}

type RequestOptions = {
  path: string;
  method: 'GET' | 'POST';
  params?: Record<string, string | number>;
  body?: URLSearchParams | FormData;
  headers?: Record<string, string>;
  responseType?: 'arrayBuffer' | 'json' | 'text';
};

const defaults: QBittorrentConfig = {
  baseUrl: 'http://localhost:9091/',
  path: '/api/v2',
  username: '',
  password: '',
  timeout: 5000,
};

export class QBittorrentSession {
  config: QBittorrentConfig;
  state: QBittorrentState = {};

  constructor(options: Partial<QBittorrentConfig> = {}) {
    this.config = { ...defaults, ...options };
  }

  /**
   * Export the state of the client as JSON
   */
  exportState(): Jsonify<QBittorrentState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#login}
   */
  async login(): Promise<boolean> {
    if (this.config.apiKey) {
      await this.checkVersion();
      return true;
    }

    const url = joinURL(this.config.baseUrl, this.config.path ?? '', '/auth/login');

    const res = await ofetch.raw(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: this.config.username ?? '',
        password: this.config.password ?? '',
      }).toString(),
      redirect: 'manual',
      retry: false,
      timeout: this.config.timeout,
      dispatcher: this.config.dispatcher,
    });

    if (!res.headers.get('set-cookie')?.length) {
      throw new Error('Cookie not found. Auth Failed.');
    }

    const cookieHeader = res.headers.get('set-cookie') ?? '';
    const cookieName = getAuthCookieName(cookieHeader);
    const cookie = cookieParse(cookieHeader);
    const sid = cookieName ? cookie[cookieName] : undefined;
    if (!sid) {
      throw new Error('Invalid cookie');
    }

    const expires = cookie.Expires ?? cookie.expires;
    const maxAge = cookie['Max-Age'] ?? cookie['max-age'];
    this.state.auth = {
      sid,
      cookieName,
      expires: expires
        ? new Date(expires)
        : maxAge
          ? new Date(Date.now() + Number(maxAge) * 1000)
          : new Date(Date.now() + 3_600_000),
    };

    // Check version after successful login
    await this.checkVersion();

    return true;
  }

  logout(): boolean {
    delete this.state.auth;
    return true;
  }

  // eslint-disable-next-line max-params
  async request<T>(
    path: string,
    method: 'GET' | 'POST',
    params?: Record<string, string | number>,
    body?: URLSearchParams | FormData,
    headers: Record<string, string> = {},
    isJson = true,
  ): Promise<T> {
    return this.requestWithAuth<T>({
      path,
      method,
      params,
      body,
      headers,
      responseType: isJson ? 'json' : 'text',
    });
  }

  async requestArrayBuffer(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<ArrayBuffer> {
    return this.requestWithAuth<ArrayBuffer>({
      path,
      method: 'GET',
      params,
      responseType: 'arrayBuffer',
    });
  }

  protected async ensureAuthenticated(path: string): Promise<void> {
    if (this.config.apiKey) {
      if (!this.state.version?.version && path !== '/app/version') {
        await this.checkVersion();
      }
    } else if (
      !this.state.auth?.sid ||
      !this.state.auth.expires ||
      this.state.auth.expires.getTime() < Date.now()
    ) {
      const authed = await this.login();
      if (!authed) {
        throw new Error('Auth Failed');
      }
    }
  }

  protected authHeaders(): Record<string, string> {
    if (this.config.apiKey) {
      return { Authorization: `Bearer ${this.config.apiKey}` };
    }

    const headers: Record<string, string> = {
      Cookie: `${this.state.auth!.cookieName ?? 'SID'}=${this.state.auth!.sid ?? ''}`,
    };
    const basicAuth = this.basicAuthHeader();
    if (basicAuth) {
      headers.Authorization = basicAuth;
    }

    return headers;
  }

  protected basicAuthHeader(): string | undefined {
    if (!this.config.username && !this.config.password) {
      return undefined;
    }

    const credentials = Buffer.from(`${this.config.username ?? ''}:${this.config.password ?? ''}`);
    return `Basic ${credentials.toString('base64')}`;
  }

  private async requestWithAuth<T>(options: RequestOptions): Promise<T> {
    try {
      return await this.requestOnce<T>(options);
    } catch (error) {
      if (this.config.apiKey || !isAuthError(error)) {
        throw error;
      }

      delete this.state.auth;
      return this.requestOnce<T>(options);
    }
  }

  private async requestOnce<T>({
    path,
    method,
    params,
    body,
    headers = {},
    responseType = 'json',
  }: RequestOptions): Promise<T> {
    await this.ensureAuthenticated(path);

    const url = joinURL(this.config.baseUrl, this.config.path ?? '', path);
    return ofetch<T>(url, {
      method,
      headers: {
        ...this.authHeaders(),
        ...headers,
      },
      body,
      params,
      retry: 0,
      timeout: this.config.timeout,
      responseType: responseType as 'json',
      dispatcher: this.config.dispatcher,
    });
  }

  private async checkVersion(): Promise<void> {
    if (!this.state.version?.version) {
      const newVersion = await this.request<string>(
        '/app/version',
        'GET',
        undefined,
        undefined,
        undefined,
        false,
      );
      // Remove potential 'v' prefix and any extra info after version number
      const cleanVersion = newVersion.replace(/^v/, '').split('-')[0]!;
      this.state.version = {
        version: newVersion,
        isVersion5OrHigher: cleanVersion === '5.0.0' || isGreater(cleanVersion, '5.0.0'),
      };
    }
  }
}

function isAuthError(error: unknown): boolean {
  const status =
    typeof error === 'object' && error
      ? ((error as { status?: unknown; statusCode?: unknown }).statusCode ??
        (error as { status?: unknown; statusCode?: unknown }).status)
      : undefined;

  return status === 401 || status === 403;
}
