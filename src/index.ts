/* eslint-disable @typescript-eslint/ban-types */
import { existsSync, readFileSync } from 'fs';
import { URLSearchParams } from 'url';

import FormData from 'form-data';
import got, { Options as GotOptions, Response } from 'got';
import { Cookie } from 'tough-cookie';

import {
  AddTorrentOptions as NormalizedAddTorrentOptions,
  Label,
  TorrentClient,
  TorrentSettings,
  TorrentState as NormalizedTorrentState,
} from '@ctrl/shared-torrent';
import { hash } from '@ctrl/torrent-file';
import { urlJoin } from '@ctrl/url-join';

import {
  AddMagnetOptions,
  AddTorrentOptions,
  AllClientDataQbittorrent,
  BuildInfo,
  Categories,
  NormalizedTorrentQbittorrent,
  Preferences,
  Torrent,
  TorrentFile,
  TorrentFilePriority,
  TorrentFilters,
  TorrentPieceState,
  TorrentProperties,
  TorrentState,
  TorrentTrackers,
  TorrentTrackerStatus,
  WebSeed,
} from './types';

export { TorrentState, TorrentTrackerStatus, TorrentFilePriority, TorrentPieceState };

const defaults: TorrentSettings = {
  baseUrl: 'http://localhost:9091/',
  path: '/api/v2',
  username: '',
  password: '',
  timeout: 5000,
};

export class QBittorrent implements TorrentClient {
  config: TorrentSettings;

  /**
   * auth cookie
   */
  private _sid?: string;
  /**
   * cookie expiration
   */
  private _exp?: Date;

  constructor(options: Partial<TorrentSettings> = {}) {
    this.config = { ...defaults, ...options };
  }

  /**
   * @deprecated
   */
  async version(): Promise<string> {
    return this.getAppVersion();
  }

  /**
   * Get application version
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-application-version}
   */
  async getAppVersion(): Promise<string> {
    const res = await this.request<string>(
      '/app/version',
      'GET',
      undefined,
      undefined,
      undefined,
      false,
    );
    return res.body;
  }

  async getApiVersion(): Promise<string> {
    const res = await this.request<string>(
      '/app/webapiVersion',
      'GET',
      undefined,
      undefined,
      undefined,
      false,
    );
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-build-info}
   */
  async getBuildInfo(): Promise<BuildInfo> {
    const res = await this.request<BuildInfo>('/app/buildInfo', 'GET');
    return res.body;
  }

  async getTorrent(hash: string): Promise<NormalizedTorrentQbittorrent> {
    const torrentsResponse = await this.listTorrents(hash);
    const torrentData = torrentsResponse[0];
    if (!torrentData) {
      throw new Error('Torrent not found');
    }

    return this._normalizeTorrentData(torrentData);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-application-preferences}
   */
  async getPreferences(): Promise<Preferences> {
    const res = await this.request<Preferences>('/app/preferences', 'GET');
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-application-preferences}
   */
  async setPreferences(preferences: Partial<Preferences>): Promise<boolean> {
    const form = new FormData();
    form.append('json', JSON.stringify(preferences));

    await this.request('/app/setPreferences', 'POST', undefined, form);
    return true;
  }

  /**
   * Torrents list
   * @param hashes Filter by torrent hashes
   * @param [filter] Filter torrent list
   * @param category Get torrents with the given category (empty string means "without category"; no "category" parameter means "any category")
   * @returns list of torrents
   */
  // eslint-disable-next-line max-params
  async listTorrents(
    hashes?: string | string[],
    filter?: TorrentFilters,
    category?: string,
    sort?: string,
    offset?: number,
    reverse?: boolean,
    // TODO: refactor filters into an object with optional properties
    tag?: string,
  ): Promise<Torrent[]> {
    const params: Record<string, string> = {};
    if (hashes) {
      params.hashes = this._normalizeHashes(hashes);
    }

    if (filter) {
      params.filter = filter;
    }

    if (category) {
      params.category = category;
    }

    if (tag) {
      params.tag = tag;
    }

    if (offset !== undefined) {
      params.offset = `${offset}`;
    }

    if (sort) {
      params.sort = sort;
    }

    if (reverse) {
      params.reverse = JSON.stringify(reverse);
    }

    const res = await this.request<Torrent[]>('/torrents/info', 'GET', params);
    return res.body;
  }

  async getAllData(): Promise<AllClientDataQbittorrent> {
    const listTorrents = await this.listTorrents();
    const results: AllClientDataQbittorrent = {
      torrents: [],
      labels: [],
    };
    const labels: Record<string, Label> = {};
    for (const torrent of listTorrents) {
      const torrentData: NormalizedTorrentQbittorrent = this._normalizeTorrentData(torrent);
      results.torrents.push(torrentData);

      // setup label
      if (torrentData.label) {
        if (labels[torrentData.label] === undefined) {
          labels[torrentData.label] = {
            id: torrentData.label,
            name: torrentData.label,
            count: 1,
          };
        } else {
          labels[torrentData.label].count += 1;
        }
      }
    }

    return results;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-generic-properties}
   */
  async torrentProperties(hash: string): Promise<TorrentProperties> {
    const res = await this.request<TorrentProperties>('/torrents/properties', 'GET', { hash });
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-trackers}
   */
  async torrentTrackers(hash: string): Promise<TorrentTrackers[]> {
    const res = await this.request<TorrentTrackers[]>('/torrents/trackers', 'GET', { hash });
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-web-seeds}
   */
  async torrentWebSeeds(hash: string): Promise<WebSeed[]> {
    const res = await this.request<WebSeed[]>('/torrents/webseeds', 'GET', { hash });
    return res.body;
  }

  async torrentFiles(hash: string): Promise<TorrentFile[]> {
    const res = await this.request<TorrentFile[]>('/torrents/files', 'GET', { hash });
    return res.body;
  }

  async setFilePriority(
    hash: string,
    fileIds: string | string[],
    priority: TorrentFilePriority,
  ): Promise<TorrentFile[]> {
    const res = await this.request<TorrentFile[]>('/torrents/filePrio', 'GET', {
      hash,
      id: this._normalizeHashes(fileIds),
      priority,
    });
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-pieces-states}
   */
  async torrentPieceStates(hash: string): Promise<TorrentPieceState[]> {
    const res = await this.request<TorrentPieceState[]>('/torrents/pieceStates', 'GET', { hash });
    return res.body;
  }

  /**
   * Torrents piece hashes
   * @returns an array of hashes (strings) of all pieces (in order) of a specific torrent
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-pieces-hashes}
   */
  async torrentPieceHashes(hash: string): Promise<string[]> {
    const res = await this.request<string[]>('/torrents/pieceHashes', 'GET', { hash });
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-location}
   */
  async setTorrentLocation(hashes: string | string[] | 'all', location: string): Promise<boolean> {
    const form = new FormData();
    form.append('location', location);
    form.append('hashes', this._normalizeHashes(hashes));

    await this.request('/torrents/setLocation', 'POST', undefined, form);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-name}
   */
  async setTorrentName(hash: string, name: string): Promise<boolean> {
    const form = new FormData();
    form.append('hash', hash);
    form.append('name', name);

    await this.request('/torrents/rename', 'POST', undefined, form);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-all-tags}
   */
  async getTags(): Promise<string[]> {
    const res = await this.request<string[]>('/torrents/tags', 'get');
    return res.body;
  }

  /**
   * @param tags comma separated list
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#create-tags}
   */
  async createTags(tags: string): Promise<boolean> {
    const form = new FormData();
    form.append('tags', tags);
    await this.request('/torrents/createTags', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * @param tags comma separated list
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#delete-tags}
   */
  async deleteTags(tags: string): Promise<boolean> {
    const form = new FormData();
    form.append('tags', tags);
    await this.request('/torrents/deleteTags', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-all-categories}
   */
  async getCategories(): Promise<Categories> {
    const res = await this.request<Categories>('/torrents/categories', 'get');
    return res.body;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-new-category}
   */
  async createCategory(category: string, savePath = ''): Promise<boolean> {
    const form = new FormData();
    form.append('category', category);
    form.append('savePath', savePath);

    await this.request('/torrents/createCategory', 'POST', undefined, form);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#edit-category}
   */
  async editCategory(category: string, savePath = ''): Promise<boolean> {
    const form = new FormData();
    form.append('category', category);
    form.append('savePath', savePath);

    await this.request('/torrents/editCategory', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-categories}
   */
  async removeCategory(categories: string): Promise<boolean> {
    const form = new FormData();
    form.append('categories', categories);
    await this.request('/torrents/removeCategories', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-torrent-tags}
   */
  async addTorrentTags(hashes: string | string[] | 'all', tags: string): Promise<boolean> {
    const form = new FormData();
    form.append('hashes', this._normalizeHashes(hashes));
    form.append('tags', tags);
    await this.request('/torrents/addTags', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * if tags are not passed, removes all tags
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-torrent-tags}
   */
  async removeTorrentTags(hashes: string | string[] | 'all', tags?: string): Promise<boolean> {
    const form = new FormData();
    form.append('hashes', this._normalizeHashes(hashes));
    if (tags) {
      form.append('tags', tags);
    }

    await this.request('/torrents/removeTags', 'POST', undefined, form, undefined, false);
    return true;
  }

  /**
   * helper function to remove torrent category
   */
  async resetTorrentCategory(hashes: string | string[] | 'all'): Promise<boolean> {
    return this.setTorrentCategory(hashes);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-category}
   */
  async setTorrentCategory(hashes: string | string[] | 'all', category = ''): Promise<boolean> {
    const form = new FormData();
    form.append('hashes', this._normalizeHashes(hashes));
    form.append('category', category);

    await this.request('/torrents/setCategory', 'POST', undefined, form);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#pause-torrents}
   */
  async pauseTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/pause', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#resume-torrents}
   */
  async resumeTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/resume', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#delete-torrents}
   */
  async removeTorrent(hashes: string | string[] | 'all', deleteFiles = true): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
      deleteFiles,
    };
    await this.request('/torrents/delete', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#recheck-torrents}
   */
  async recheckTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/recheck', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#reannounce-torrents}
   */
  async reannounceTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/reannounce', 'GET', params);
    return true;
  }

  async addTorrent(
    torrent: string | Buffer,
    options: Partial<AddTorrentOptions> = {},
  ): Promise<boolean> {
    const form = new FormData();
    const fileOptions: FormData.AppendOptions = {
      contentType: 'application/x-bittorrent',
      filename: options.filename ?? 'torrent',
    };

    // remove options.filename, not used in form
    if (options.filename) {
      delete options.filename;
    }

    if (typeof torrent === 'string') {
      if (existsSync(torrent)) {
        form.append('file', Buffer.from(readFileSync(torrent)), fileOptions);
      } else {
        form.append('file', Buffer.from(torrent, 'base64'), fileOptions);
      }
    } else {
      form.append('file', torrent, fileOptions);
    }

    if (options) {
      // disable savepath when autoTMM is defined
      if (options.useAutoTMM === 'true') {
        options.savepath = '';
      } else {
        options.useAutoTMM = 'false';
      }

      for (const [key, value] of Object.entries(options)) {
        form.append(key, value);
      }
    }

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      form.getHeaders(),
      false,
    );

    if (res.body === 'Fails.') {
      throw new Error('Failed to add torrent');
    }

    return true;
  }

  async normalizedAddTorrent(
    torrent: string | Buffer,
    options: Partial<NormalizedAddTorrentOptions> = {},
  ): Promise<NormalizedTorrentQbittorrent> {
    const torrentOptions: Partial<AddTorrentOptions> = {};

    if (options.startPaused) {
      torrentOptions.paused = 'true';
    }

    if (options.label) {
      torrentOptions.category = options.label;
    }

    if (!Buffer.isBuffer(torrent)) {
      torrent = Buffer.from(torrent);
    }

    const torrentHash = await hash(torrent);
    await this.addTorrent(torrent, torrentOptions);
    return this.getTorrent(torrentHash);
  }

  /**
   * @param hash Hash for desired torrent
   * @param id id of the file to be renamed
   * @param name new name to be assigned to the file
   */
  async renameFile(hash: string, id: number, name: string): Promise<boolean> {
    const form = new FormData();
    form.append('hash', hash);
    form.append('id', id);
    form.append('name', name);

    await this.request<string>(
      '/torrents/renameFile',
      'POST',
      undefined,
      form,
      form.getHeaders(),
      false,
    );

    return true;
  }

  /**
   * @param urls URLs separated with newlines
   * @param options
   */
  async addMagnet(urls: string, options: Partial<AddMagnetOptions> = {}): Promise<boolean> {
    const form = new FormData();
    form.append('urls', urls);

    if (options) {
      // disable savepath when autoTMM is defined
      if (options.useAutoTMM === 'true') {
        options.savepath = '';
      } else {
        options.useAutoTMM = 'false';
      }

      for (const [key, value] of Object.entries(options)) {
        form.append(key, value);
      }
    }

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      form.getHeaders(),
      false,
    );

    if (res.body === 'Fails.') {
      throw new Error('Failed to add torrent');
    }

    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-trackers-to-torrent}
   */
  async addTrackers(hash: string, urls: string): Promise<boolean> {
    const params = { hash, urls };
    await this.request('/torrents/addTrackers', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#edit-trackers}
   */
  async editTrackers(hash: string, origUrl: string, newUrl: string): Promise<boolean> {
    const params = { hash, origUrl, newUrl };
    await this.request('/torrents/editTrackers', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-trackers}
   */
  async removeTrackers(hash: string, urls: string): Promise<boolean> {
    const params = { hash, urls };
    await this.request('/torrents/editTrackers', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#increase-torrent-priority}
   */
  async queueUp(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/increasePrio', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#decrease-torrent-priority}
   */
  async queueDown(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/decreasePrio', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#maximal-torrent-priority}
   */
  async topPriority(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/topPrio', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#minimal-torrent-priority}
   */
  async bottomPriority(hashes: string | string[] | 'all'): Promise<boolean> {
    const params = {
      hashes: this._normalizeHashes(hashes),
    };
    await this.request('/torrents/bottomPrio', 'GET', params);
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#login}
   */
  async login(): Promise<boolean> {
    const url = urlJoin(this.config.baseUrl, this.config.path, '/auth/login');
    const form = new FormData();
    form.append('username', this.config.username);
    form.append('password', this.config.password);

    const res = await got.post(url, {
      isStream: false as any,
      body: form,
      followRedirect: false,
      retry: 0,
      // allow proxy agent
      agent: this.config.agent,
      timeout: this.config.timeout,
    });
    if (!res.headers['set-cookie'] || !res.headers['set-cookie'].length) {
      throw new Error('Cookie not found. Auth Failed.');
    }

    const cookie = Cookie.parse(res.headers['set-cookie'][0]);
    if (!cookie || cookie.key !== 'SID') {
      throw new Error('Invalid cookie');
    }

    this._sid = cookie.value;
    this._exp = cookie.expiryDate();
    return true;
  }

  logout(): boolean {
    this._sid = undefined;
    this._exp = undefined;
    return true;
  }

  // eslint-disable-next-line max-params
  async request<T extends object | string>(
    path: string,
    method: GotOptions['method'],
    params: any = {},
    body?: GotOptions['body'],
    headers: any = {},
    json = true,
  ): Promise<Response<T>> {
    if (!this._sid || !this._exp || this._exp.getTime() < new Date().getTime()) {
      const authed = await this.login();
      if (!authed) {
        throw new Error('Auth Failed');
      }
    }

    const url = urlJoin(this.config.baseUrl, this.config.path, path);
    const res = await got<T>(url, {
      isStream: false,
      resolveBodyOnly: false,
      method,
      headers: {
        Cookie: `SID=${this._sid ?? ''}`,
        ...headers,
      },
      retry: 0,
      body,
      searchParams: new URLSearchParams(params),
      // allow proxy agent
      agent: this.config.agent,
      timeout: this.config.timeout,
      responseType: json ? 'json' : ('text' as 'json'),
    });

    return res;
  }

  /**
   * Normalizes hashes
   * @returns hashes as string seperated by `|`
   */
  private _normalizeHashes(hashes: string | string[]): string {
    if (Array.isArray(hashes)) {
      return hashes.join('|');
    }

    return hashes;
  }

  private _normalizeTorrentData(torrent: Torrent): NormalizedTorrentQbittorrent {
    let state = NormalizedTorrentState.unknown;

    switch (torrent.state) {
      case TorrentState.ForcedDL:
      case TorrentState.MetaDL:
        state = NormalizedTorrentState.downloading;
        break;
      case TorrentState.Allocating:
        // state = 'stalledDL';
        state = NormalizedTorrentState.queued;
        break;
      case TorrentState.ForcedUP:
        state = NormalizedTorrentState.seeding;
        break;
      case TorrentState.PausedDL:
        state = NormalizedTorrentState.paused;
        break;
      case TorrentState.PausedUP:
        // state = 'completed';
        state = NormalizedTorrentState.paused;
        break;
      case TorrentState.QueuedDL:
      case TorrentState.QueuedUP:
        state = NormalizedTorrentState.queued;
        break;
      case TorrentState.CheckingDL:
      case TorrentState.CheckingUP:
      case TorrentState.QueuedForChecking:
      case TorrentState.CheckingResumeData:
      case TorrentState.Moving:
        state = NormalizedTorrentState.checking;
        break;
      case TorrentState.Unknown:
      case TorrentState.MissingFiles:
        state = NormalizedTorrentState.error;
        break;
      default:
        break;
    }

    const isCompleted = torrent.progress === 1;

    const result: NormalizedTorrentQbittorrent = {
      id: torrent.hash,
      name: torrent.name,
      stateMessage: '',
      state,
      dateAdded: new Date(torrent.added_on * 1000).toISOString(),
      isCompleted,
      progress: torrent.progress,
      label: torrent.category,
      dateCompleted: new Date(torrent.completion_on * 1000).toISOString(),
      savePath: torrent.save_path,
      uploadSpeed: torrent.upspeed,
      downloadSpeed: torrent.dlspeed,
      eta: torrent.eta,
      queuePosition: torrent.priority,
      connectedPeers: torrent.num_leechs,
      connectedSeeds: torrent.num_seeds,
      totalPeers: torrent.num_incomplete,
      totalSeeds: torrent.num_complete,
      totalSelected: torrent.size,
      totalSize: torrent.total_size,
      totalUploaded: torrent.uploaded,
      totalDownloaded: torrent.downloaded,
      ratio: torrent.ratio,
    };
    return result;
  }
}
