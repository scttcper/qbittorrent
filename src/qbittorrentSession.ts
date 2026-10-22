import {
  TorrentClientError,
  type TorrentClientConfig,
  type TorrentClientState,
} from '@ctrl/shared-torrent';
import { parseSetCookie } from 'cookie';
import { FetchError, ofetch } from 'ofetch';
import type { Jsonify } from 'type-fest';
import { joinURL } from 'ufo';

import { isGreater } from './requestUtils.js';

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
    /**
     * WebAPI version, fetched the first time an option depends on it
     */
    apiVersion?: string;
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
      await this.refreshVersion();
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

    const cookieHeader = res.headers.get('set-cookie');
    if (!cookieHeader?.length) {
      throw new TorrentClientError('Cookie not found. Auth Failed.', 'unauthorized');
    }

    const auth = parseSessionCookie(cookieHeader);
    if (!auth) {
      throw new TorrentClientError('Invalid cookie', 'unauthorized');
    }

    this.state.auth = auth;

    // Always fetch the version again, a new login is usually a restarted (maybe upgraded) server
    await this.refreshVersion();

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
        throw new TorrentClientError('Auth Failed', 'unauthorized');
      }
    }
  }

  protected authHeaders(): Record<string, string> {
    if (this.config.apiKey) {
      return { Authorization: `Bearer ${this.config.apiKey}` };
    }

    // qBittorrent 5.2+ accepts Basic auth on regular API requests. Keep the
    // SID cookie for older versions, but send Basic too so stale/missing cookies
    // still work for clients configured with username/password.
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
      // API key auth is stateless and cannot use /auth/login, so only cookie
      // auth gets a one-shot re-login when the server rejects the session.
      if (this.config.apiKey || !isAuthError(error)) {
        throw toClientError(error);
      }

      delete this.state.auth;
      return this.requestOnce<T>(options).catch((retryError: unknown) => {
        throw toClientError(retryError);
      });
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
      onResponse: ({ response }) => {
        this.updateSessionCookie(response.headers);
      },
    });
  }

  /**
   * qBittorrent sends a new SID when it starts a session from the Basic auth header, which
   * happens once ours has expired or was evicted (5.3 keeps 15 sessions by default), and
   * extends the expiry of long-lived sessions. Keep the latest one, otherwise every request
   * after an eviction starts another session and pushes out the WebUI and other clients.
   */
  private updateSessionCookie(headers: Headers): void {
    if (this.config.apiKey || !this.state.auth) {
      return;
    }

    const cookieName = this.state.auth.cookieName ?? 'SID';
    const cookieHeader = headers
      .getSetCookie()
      .find(setCookie => setCookie.startsWith(`${cookieName}=`));
    const auth = cookieHeader ? parseSessionCookie(cookieHeader) : undefined;
    if (auth) {
      this.state.auth = auth;
    }
  }

  /**
   * qBittorrent v5 renamed pause/resume to stop/start, so requests that depend on the version
   * need it before picking an endpoint. Logging in already fetches it for cookie auth.
   */
  protected async ensureVersion(): Promise<NonNullable<QBittorrentState['version']>> {
    await this.ensureAuthenticated('/app/version');
    await this.checkVersion();
    return this.state.version!;
  }

  protected async refreshVersion(): Promise<NonNullable<QBittorrentState['version']>> {
    const version = await this.request<string>(
      '/app/version',
      'GET',
      undefined,
      undefined,
      undefined,
      false,
    );
    return this.storeVersion(version);
  }

  protected storeVersion(version: string): NonNullable<QBittorrentState['version']> {
    // Remove potential 'v' prefix and any extra info after version number
    const cleanVersion = version.replace(/^v/, '').split('-')[0]!;
    this.state.version = {
      version,
      isVersion5OrHigher: cleanVersion === '5.0.0' || isGreater(cleanVersion, '5.0.0'),
    };
    return this.state.version;
  }

  private async checkVersion(): Promise<void> {
    if (!this.state.version?.version) {
      await this.refreshVersion();
    }
  }
}

function parseSessionCookie(cookieHeader: string): QBittorrentState['auth'] {
  const cookie = parseSetCookie(cookieHeader);
  if (!cookie.value) {
    return undefined;
  }

  return {
    sid: cookie.value,
    cookieName: cookie.name,
    expires: cookie.expires
      ? cookie.expires
      : cookie.maxAge !== undefined
        ? new Date(Date.now() + cookie.maxAge * 1000)
        : new Date(Date.now() + 3_600_000),
  };
}

/**
 * qBittorrent also responds 404 for missing categories, directories and search jobs,
 * so only the explicit torrent lookups throw `torrent_not_found`
 */
function toClientError(error: unknown): TorrentClientError {
  if (error instanceof TorrentClientError) {
    return error;
  }

  if (error instanceof FetchError) {
    return new TorrentClientError(
      error.message,
      isAuthError(error) ? 'unauthorized' : 'request_failed',
      {
        status: error.status,
        cause: error,
      },
    );
  }

  return new TorrentClientError((error as Error).message, 'request_failed', { cause: error });
}

function isAuthError(error: unknown): boolean {
  const status =
    typeof error === 'object' && error
      ? ((error as { status?: unknown; statusCode?: unknown }).statusCode ??
        (error as { status?: unknown; statusCode?: unknown }).status)
      : undefined;

  return status === 401 || status === 403;
}
