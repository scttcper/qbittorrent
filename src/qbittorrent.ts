import { FormData } from 'node-fetch-native';
import { ofetch } from 'ofetch';
import { Cookie } from 'tough-cookie';
import { joinURL } from 'ufo';

import { magnetDecode } from '@ctrl/magnet-link';
import type {
  AddTorrentOptions as NormalizedAddTorrentOptions,
  AllClientData,
  Label,
  NormalizedTorrent,
  TorrentClient,
  TorrentSettings,
} from '@ctrl/shared-torrent';
import { hash } from '@ctrl/torrent-file';

import { normalizeTorrentData } from './normalizeTorrentData.js';
import type {
  AddMagnetOptions,
  AddTorrentOptions,
  BuildInfo,
  Preferences,
  Torrent,
  TorrentCategories,
  TorrentFile,
  TorrentFilePriority,
  TorrentFilters,
  TorrentPeersResponse,
  TorrentPieceState,
  TorrentProperties,
  TorrentTrackers,
  WebSeed,
} from './types.js';

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
    return res;
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
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-build-info}
   */
  async getBuildInfo(): Promise<BuildInfo> {
    const res = await this.request<BuildInfo>('/app/buildInfo', 'GET');
    return res;
  }

  async getTorrent(hash: string): Promise<NormalizedTorrent> {
    const torrentsResponse = await this.listTorrents({ hashes: hash });
    const torrentData = torrentsResponse[0];
    if (!torrentData) {
      throw new Error('Torrent not found');
    }

    return normalizeTorrentData(torrentData);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-application-preferences}
   */
  async getPreferences(): Promise<Preferences> {
    const res = await this.request<Preferences>('/app/preferences', 'GET');
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-application-preferences}
   */
  async setPreferences(preferences: Partial<Preferences>): Promise<boolean> {
    await this.request(
      '/app/setPreferences',
      'POST',
      undefined,
      objToUrlSearchParams({
        json: JSON.stringify(preferences),
      }),
    );
    return true;
  }

  /**
   * Torrents list
   * @param hashes Filter by torrent hashes
   * @param [filter] Filter torrent list
   * @param category Get torrents with the given category (empty string means "without category"; no "category" parameter means "any category")
   * @returns list of torrents
   */
  async listTorrents({
    hashes,
    filter,
    category,
    sort,
    offset,
    reverse,
    tag,
  }: {
    hashes?: string | string[];
    filter?: TorrentFilters;
    sort?: string;
    tag?: string;
    category?: string;
    offset?: number;
    reverse?: boolean;
  } = {}): Promise<Torrent[]> {
    const params: Record<string, string> = {};
    if (hashes) {
      params.hashes = normalizeHashes(hashes);
    }

    if (filter) {
      params.filter = filter;
    }

    if (category !== undefined) {
      params.category = category;
    }

    if (tag !== undefined) {
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
    return res;
  }

  async getAllData(): Promise<AllClientData> {
    const listTorrents = await this.listTorrents();
    const results: AllClientData = {
      torrents: [],
      labels: [],
      raw: listTorrents,
    };
    const labels: Record<string, Label> = {};
    for (const torrent of listTorrents) {
      const torrentData: NormalizedTorrent = normalizeTorrentData(torrent);
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
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-trackers}
   */
  async torrentTrackers(hash: string): Promise<TorrentTrackers[]> {
    const res = await this.request<TorrentTrackers[]>('/torrents/trackers', 'GET', { hash });
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-web-seeds}
   */
  async torrentWebSeeds(hash: string): Promise<WebSeed[]> {
    const res = await this.request<WebSeed[]>('/torrents/webseeds', 'GET', { hash });
    return res;
  }

  async torrentFiles(hash: string): Promise<TorrentFile[]> {
    const res = await this.request<TorrentFile[]>('/torrents/files', 'GET', { hash });
    return res;
  }

  async setFilePriority(
    hash: string,
    fileIds: string | string[],
    priority: TorrentFilePriority,
  ): Promise<TorrentFile[]> {
    const res = await this.request<TorrentFile[]>('/torrents/filePrio', 'GET', {
      hash,
      id: normalizeHashes(fileIds),
      priority,
    });
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-pieces-states}
   */
  async torrentPieceStates(hash: string): Promise<TorrentPieceState[]> {
    const res = await this.request<TorrentPieceState[]>('/torrents/pieceStates', 'GET', { hash });
    return res;
  }

  /**
   * Torrents piece hashes
   * @returns an array of hashes (strings) of all pieces (in order) of a specific torrent
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-pieces-hashes}
   */
  async torrentPieceHashes(hash: string): Promise<string[]> {
    const res = await this.request<string[]>('/torrents/pieceHashes', 'GET', { hash });
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-location}
   */
  async setTorrentLocation(hashes: string | string[] | 'all', location: string): Promise<boolean> {
    await this.request('/torrents/setLocation', 'POST', undefined, undefined, {
      location,
      hashes: normalizeHashes(hashes),
    });
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-name}
   */
  async setTorrentName(hash: string, name: string): Promise<boolean> {
    const data = { hash, name };
    await this.request('/torrents/rename', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-all-tags}
   */
  async getTags(): Promise<string[]> {
    const res = await this.request<string[]>('/torrents/tags', 'GET');
    return res;
  }

  /**
   * @param tags comma separated list
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#create-tags}
   */
  async createTags(tags: string): Promise<boolean> {
    const data = { tags };
    await this.request(
      '/torrents/createTags',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * @param tags comma separated list
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#delete-tags}
   */
  async deleteTags(tags: string): Promise<boolean> {
    const data = { tags };
    await this.request(
      '/torrents/deleteTags',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-all-categories}
   */
  async getCategories(): Promise<TorrentCategories> {
    const res = await this.request<TorrentCategories>('/torrents/categories', 'GET');
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-new-category}
   */
  async createCategory(category: string, savePath = ''): Promise<boolean> {
    const data = { category, savePath };
    await this.request(
      '/torrents/createCategory',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#edit-category}
   */
  async editCategory(category: string, savePath = ''): Promise<boolean> {
    const data = { category, savePath };
    await this.request(
      '/torrents/editCategory',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-categories}
   */
  async removeCategory(categories: string): Promise<boolean> {
    const data = { categories };
    await this.request(
      '/torrents/removeCategories',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-torrent-tags}
   */
  async addTorrentTags(hashes: string | string[] | 'all', tags: string): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes), tags };
    await this.request(
      '/torrents/addTags',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
    return true;
  }

  /**
   * if tags are not passed, removes all tags
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-torrent-tags}
   */
  async removeTorrentTags(hashes: string | string[] | 'all', tags?: string): Promise<boolean> {
    const data: Record<string, string> = { hashes: normalizeHashes(hashes) };
    if (tags) {
      data.tags = tags;
    }

    await this.request(
      '/torrents/removeTags',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
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
    const data = {
      hashes: normalizeHashes(hashes),
      category,
    };
    await this.request('/torrents/setCategory', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#pause-torrents}
   */
  async pauseTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/pause', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#resume-torrents}
   */
  async resumeTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/resume', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#delete-torrents}
   */
  async removeTorrent(hashes: string | string[] | 'all', deleteFiles = true): Promise<boolean> {
    const data = {
      hashes: normalizeHashes(hashes),
      deleteFiles,
    };
    await this.request('/torrents/delete', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#recheck-torrents}
   */
  async recheckTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/recheck', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#reannounce-torrents}
   */
  async reannounceTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/reannounce', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  async addTorrent(
    torrent: string | Buffer,
    options: Partial<AddTorrentOptions> = {},
  ): Promise<boolean> {
    const form = new FormData();

    // remove options.filename, not used in form
    if (options.filename) {
      delete options.filename;
    }

    const type = { type: 'application/x-bittorrent' };
    if (typeof torrent === 'string') {
      form.set('file', new File([Buffer.from(torrent, 'base64')], 'file.torrent', type));
    } else {
      const file = new File([torrent], options.filename ?? 'torrent', type);
      form.set('file', file);
    }

    if (options) {
      // disable savepath when autoTMM is defined
      if (options.useAutoTMM === 'true') {
        options.savepath = '';
      } else {
        options.useAutoTMM = 'false';
      }

      for (const [key, value] of Object.entries(options)) {
        form.append(key, `${value}`);
      }
    }

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      undefined,
      false,
    );

    if (res === 'Fails.') {
      throw new Error('Failed to add torrent');
    }

    return true;
  }

  async normalizedAddTorrent(
    torrent: string | Buffer,
    options: Partial<NormalizedAddTorrentOptions> = {},
  ): Promise<NormalizedTorrent> {
    const torrentOptions: Partial<AddTorrentOptions> = {};

    if (options.startPaused) {
      torrentOptions.paused = 'true';
    }

    if (options.label) {
      torrentOptions.category = options.label;
    }

    let torrentHash: string | undefined;
    if (typeof torrent === 'string' && torrent.startsWith('magnet:')) {
      torrentHash = magnetDecode(torrent).infoHash;
      if (!torrentHash) {
        throw new Error('Magnet did not contain hash');
      }

      await this.addMagnet(torrent, torrentOptions);
    } else {
      if (!Buffer.isBuffer(torrent)) {
        torrent = Buffer.from(torrent);
      }

      torrentHash = await hash(torrent);
      await this.addTorrent(torrent, torrentOptions);
    }

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
    form.append('id', id.toString());
    form.append('name', name);

    await this.request<string>('/torrents/renameFile', 'POST', undefined, undefined, form, false);

    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#rename-folder}
   */
  async renameFolder(hash: string, oldPath: string, newPath: string): Promise<boolean> {
    const form = new FormData();
    form.append('hash', hash);
    form.append('oldPath', oldPath);
    form.append('newPath', newPath);

    await this.request<string>('/torrents/renameFolder', 'POST', undefined, undefined, form, false);

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
        form.append(key, `${value}`);
      }
    }

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      undefined,
      false,
    );

    if (res === 'Fails.') {
      throw new Error('Failed to add torrent');
    }

    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-trackers-to-torrent}
   */
  async addTrackers(hash: string, urls: string): Promise<boolean> {
    const data = { hash, urls };
    await this.request('/torrents/addTrackers', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#edit-trackers}
   */
  async editTrackers(hash: string, origUrl: string, newUrl: string): Promise<boolean> {
    const data = { hash, origUrl, newUrl };
    await this.request('/torrents/editTrackers', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-trackers}
   */
  async removeTrackers(hash: string, urls: string): Promise<boolean> {
    const data = { hash, urls };
    await this.request('/torrents/removeTrackers', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#increase-torrent-priority}
   */
  async queueUp(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/increasePrio', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#decrease-torrent-priority}
   */
  async queueDown(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/decreasePrio', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#maximal-torrent-priority}
   */
  async topPriority(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/topPrio', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#minimal-torrent-priority}
   */
  async bottomPriority(hashes: string | string[] | 'all'): Promise<boolean> {
    const data = { hashes: normalizeHashes(hashes) };
    await this.request('/torrents/bottomPrio', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-peers-data}
   * @param rid - Response ID. If not provided, rid=0 will be assumed. If the given rid is
   *  different from the one of last server reply, full_update will be true (see the server reply details for more info)
   */
  async torrentPeers(hash: string, rid?: number): Promise<TorrentPeersResponse> {
    const params: { hash: string; rid?: number } = { hash };
    if (rid) {
      params.rid = rid;
    }

    const res = await this.request<TorrentPeersResponse>('/sync/torrentPeers', 'GET', params);
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#login}
   */
  async login(): Promise<boolean> {
    const url = joinURL(this.config.baseUrl, this.config.path, '/auth/login');

    const res = await ofetch.raw(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: this.config.username ?? '',
        password: this.config.password ?? '',
      }),
      redirect: 'manual',
      retry: false,
      timeout: this.config.timeout,
      // ...(this.config.agent ? { agent: this.config.agent } : {}),
    });

    if (!res.headers.get('set-cookie')?.length) {
      throw new Error('Cookie not found. Auth Failed.');
    }

    const cookie = Cookie.parse(res.headers.get('set-cookie'));
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
  async request<T>(
    path: string,
    method: 'GET' | 'POST',
    params?: Record<string, string | number>,
    body?: URLSearchParams | FormData,
    headers: any = {},
    json = true,
  ): Promise<T> {
    if (!this._sid || !this._exp || this._exp.getTime() < new Date().getTime()) {
      const authed = await this.login();
      if (!authed) {
        throw new Error('Auth Failed');
      }
    }

    const url = joinURL(this.config.baseUrl, this.config.path, path);
    const res = await ofetch<T>(url, {
      method,
      headers: {
        Cookie: `SID=${this._sid ?? ''}`,
        ...headers,
      },
      body,
      params,
      // allow proxy agent
      retry: 0,
      timeout: this.config.timeout,
      responseType: json ? 'json' : ('text' as 'json'),
      // @ts-expect-error for some reason agent is not in the type
      agent: this.config.agent,
    });

    return res;
  }
}

/**
 * Normalizes hashes
 * @returns hashes as string seperated by `|`
 */
function normalizeHashes(hashes: string | string[]): string {
  if (Array.isArray(hashes)) {
    return hashes.join('|');
  }

  return hashes;
}

function objToUrlSearchParams(obj: Record<string, string | boolean>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    params.append(key, value.toString());
  }

  return params;
}
