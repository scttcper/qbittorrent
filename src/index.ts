import urljoin from 'url-join';
import {
  AllClientData,
  NormalizedTorrent,
  TorrentClient,
  TorrentSettings,
  TorrentState,
  Label,
} from '@ctrl/shared-torrent';
import got, { Response, GotJSONOptions, GotBodyOptions, GotFormOptions } from 'got';
import { Cookie } from 'tough-cookie';

const defaults: TorrentSettings = {
  baseUrl: 'http://localhost:9091/',
  path: '/api/v2',
  username: '',
  password: '',
  timeout: 5000,
};

export class QBittorrent {
  config: TorrentSettings;

  /**
   * auth cookie
   */
  private _sid?: string;

  constructor(options: Partial<TorrentSettings> = {}) {
    this.config = { ...defaults, ...options };
  }

  async listTorrents() {

  }

  async login(): Promise<boolean> {
    const url = urljoin(this.config.baseUrl, this.config.path, '/auth/login');
    console.log(url)
    const options: GotFormOptions<string> = {
      form: true,
      body: {
        username: this.config.username,
        password: this.config.password,
      },
      retry: 0,
    };

    // allow proxy agent
    if (this.config.agent) {
      options.agent = this.config.agent;
    }

    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    const res = await got.post(url, options);
    console.log(res.headers)
    if (!res.headers['set-cookie'] || !res.headers['set-cookie'].length) {
      throw new Error('Cookie not found');
    }

    const cookie = Cookie.parse(res.headers['set-cookie'][0]);
    if (!cookie || cookie.key !== 'SID') {
      throw new Error('Invalid cookie');
    }

    this._sid = cookie.value;
    return true;
  }

  // async request<T extends object>(
  //   method: string,
  //   params: any[] = [],
  //   body?: any,
  // ): Promise<Response<T>> {
  //   const headers: any = {
  //     Cookie: this._sid,
  //   };
  //   const url = urljoin(this.config.baseUrl, this.config.path);
  //   const options: GotJSONOptions = {
  //     body: {
  //       method,
  //       params,
  //       id: this._msgId++,
  //     },
  //     headers,
  //     retry: 0,
  //     json: true,
  //   };

  //   // allow proxy agent
  //   if (this.config.agent) {
  //     options.agent = this.config.agent;
  //   }

  //   if (this.config.timeout) {
  //     options.timeout = this.config.timeout;
  //   }

  //   return got.post(url, options);
  // }
}
