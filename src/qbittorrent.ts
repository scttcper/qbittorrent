import { magnetDecode } from '@ctrl/magnet-link';
import type {
  AddTorrentOptions as NormalizedAddTorrentOptions,
  AllClientData,
  Label,
  NormalizedTorrent,
  TorrentClient,
  TorrentClientConfig,
} from '@ctrl/shared-torrent';
import { hash as torrentFileHash } from '@ctrl/torrent-file';
import { FormData } from 'node-fetch-native';
import type { Jsonify } from 'type-fest';
import { isUint8Array, stringToUint8Array } from 'uint8array-extras';

import { buildAddTorrentForm, createTorrentFile } from './addTorrentForm.js';
import { normalizeTorrentData } from './normalizeTorrentData.js';
import { QBittorrentSession, type QBittorrentState } from './qbittorrentSession.js';
import {
  assertAddTorrentSucceeded,
  normalizeHashes,
  objToUrlSearchParams,
} from './requestUtils.js';
import type {
  AddMagnetOptions,
  AddTorrentOptions,
  BuildInfo,
  ClientData,
  Cookies,
  DirectoryContent,
  DirectoryContentMetadata,
  DirectoryContentOptions,
  DownloadSpeed,
  Preferences,
  ProcessInfo,
  RotateApiKeyResponse,
  RssAutoDownloadRule,
  RssAutoDownloadRules,
  SyncMainData,
  Torrent,
  TorrentCategories,
  TorrentCreatorAddTaskOptions,
  TorrentCreatorAddTaskResponse,
  TorrentCreatorTaskStatus,
  TorrentFile,
  TorrentFilePriority,
  TorrentFilters,
  TorrentMetadata,
  TorrentMetadataRequest,
  TorrentPeersResponse,
  TorrentPieceAvailability,
  TorrentPieceState,
  TorrentProperties,
  TorrentTrackers,
  TransferSpeedLimits,
  UploadSpeed,
  WebSeed,
} from './types.js';

export interface QBittorrentConfig extends TorrentClientConfig {
  /**
   * qBittorrent WebAPI key. Added in qBittorrent v5.2.0.
   * When set, the client uses `Authorization: Bearer <apiKey>` instead of cookie login.
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/API-Key-Authentication-%28%E2%89%A5v5.2.0%29}
   */
  apiKey?: string;
}

export class QBittorrent extends QBittorrentSession implements TorrentClient {
  /**
   * Create a new QBittorrent client from a state
   */
  static createFromState(
    config: Readonly<QBittorrentConfig>,
    state: Readonly<Jsonify<QBittorrentState>>,
  ): QBittorrent {
    const client = new QBittorrent(config);
    client.state = {
      ...state,
      auth: state.auth ? { ...state.auth, expires: new Date(state.auth.expires) } : undefined,
    };
    return client;
  }

  constructor(options: Partial<QBittorrentConfig> = {}) {
    super(options);
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
   * Get default save path
   */
  async getDefaultSavePath(): Promise<string> {
    const res = await this.request<string>(
      '/app/defaultSavePath',
      'GET',
      undefined,
      undefined,
      undefined,
      false,
    );
    return res;
  }

  /**
   * Get free disk space at a path.
   * Added in qBittorrent WebUI API v2.15.2.
   * {@link https://github.com/qbittorrent/qBittorrent/pull/23856}
   */
  async getFreeSpaceAtPath(path: string): Promise<number> {
    const res = await this.request<string>(
      '/app/getFreeSpaceAtPath',
      'GET',
      { path },
      undefined,
      undefined,
      false,
    );
    return Number(res);
  }

  /**
   * Get directory contents.
   * `withMetadata` was added in qBittorrent WebUI API v2.11.8.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2118}
   */
  async getDirectoryContent(
    dirPath: string,
    options?: DirectoryContentOptions & { withMetadata?: false },
  ): Promise<string[]>;
  async getDirectoryContent(
    dirPath: string,
    options: DirectoryContentOptions & { withMetadata: true },
  ): Promise<DirectoryContentMetadata[]>;
  async getDirectoryContent(
    dirPath: string,
    options: DirectoryContentOptions = {},
  ): Promise<DirectoryContent> {
    const params: Record<string, string> = { dirPath };
    if (options.mode) {
      params.mode = options.mode;
    }

    if (options.withMetadata !== undefined) {
      params.withMetadata = JSON.stringify(options.withMetadata);
    }

    const res = await this.request<DirectoryContent>('/app/getDirectoryContent', 'GET', params);
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-build-info}
   */
  async getBuildInfo(): Promise<BuildInfo> {
    const res = await this.request<BuildInfo>('/app/buildInfo', 'GET');
    return res;
  }

  /**
   * Get qBittorrent process info.
   * Added in qBittorrent WebUI API v2.15.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2151}
   */
  async getProcessInfo(): Promise<ProcessInfo> {
    const res = await this.request<ProcessInfo>('/app/processInfo', 'GET');
    return res;
  }

  /**
   * Generate or rotate the WebAPI API key.
   * Added in qBittorrent WebUI API v2.14.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2141}
   */
  async rotateApiKey(): Promise<string> {
    const res = await this.request<RotateApiKeyResponse>('/app/rotateAPIKey', 'POST');
    return res.apiKey;
  }

  /**
   * Delete the existing WebAPI API key.
   * Added in qBittorrent WebUI API v2.14.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2141}
   */
  async deleteApiKey(): Promise<boolean> {
    await this.request('/app/deleteAPIKey', 'POST');
    return true;
  }

  /**
   * Get cookies stored by qBittorrent.
   * Added in qBittorrent WebUI API v2.11.3.
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-5.0%29#get-cookies}
   */
  async getCookies(): Promise<Cookies> {
    const res = await this.request<Cookies>('/app/cookies', 'GET');
    return res;
  }

  /**
   * Set cookies stored by qBittorrent.
   * Added in qBittorrent WebUI API v2.11.3.
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-5.0%29#set-cookies}
   */
  async setCookies(cookies: Cookies): Promise<boolean> {
    await this.request(
      '/app/setCookies',
      'POST',
      undefined,
      objToUrlSearchParams({
        cookies: JSON.stringify(cookies),
      }),
    );
    return true;
  }

  async getTorrent(hash: string): Promise<NormalizedTorrent> {
    const torrentsResponse = await this.listTorrents({ hashes: hash });
    const [torrentData] = torrentsResponse;
    if (!torrentData) {
      throw new Error('Torrent not found');
    }

    return normalizeTorrentData(torrentData);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-download-limit}
   */
  async getTorrentDownloadLimit(hash: string | string[]): Promise<DownloadSpeed> {
    const downloadLimit = await this.request<DownloadSpeed>(
      '/torrents/downloadLimit',
      'POST',
      undefined,
      objToUrlSearchParams({
        hashes: normalizeHashes(hash),
      }),
    );
    return downloadLimit;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-download-limit}
   */
  async setTorrentDownloadLimit(
    hash: string | string[],
    limitBytesPerSecond: number,
  ): Promise<boolean> {
    const data = {
      limit: limitBytesPerSecond.toString(),
      hashes: normalizeHashes(hash),
    };

    await this.request('/torrents/setDownloadLimit', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-upload-limit}
   */
  async getTorrentUploadLimit(hash: string | string[]): Promise<UploadSpeed> {
    const UploadLimit = await this.request<UploadSpeed>(
      '/torrents/uploadLimit',
      'POST',
      undefined,
      objToUrlSearchParams({
        hashes: normalizeHashes(hash),
      }),
    );
    return UploadLimit;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-upload-limit}
   */
  async setTorrentUploadLimit(
    hash: string | string[],
    limitBytesPerSecond: number,
  ): Promise<boolean> {
    const data = {
      limit: limitBytesPerSecond.toString(),
      hashes: normalizeHashes(hash),
    };

    await this.request('/torrents/setUploadLimit', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * Pause the BitTorrent session. Added in WebAPI v2.16.2.
   */
  async pauseSession(): Promise<boolean> {
    await this.request('/transfer/pauseSession', 'POST');
    return true;
  }

  /**
   * Resume the BitTorrent session. Added in WebAPI v2.16.2.
   */
  async resumeSession(): Promise<boolean> {
    await this.request('/transfer/resumeSession', 'POST');
    return true;
  }

  /**
   * Retrieve global and alternative speed limits.
   * Added in qBittorrent WebUI API v2.16.0.
   * {@link https://github.com/qbittorrent/qBittorrent/pull/24134}
   */
  async getTransferSpeedLimits(): Promise<TransferSpeedLimits> {
    const res = await this.request<TransferSpeedLimits>('/transfer/getSpeedLimits', 'GET');
    return res;
  }

  /**
   * Set global and alternative speed limits.
   * Added in qBittorrent WebUI API v2.16.0.
   * {@link https://github.com/qbittorrent/qBittorrent/pull/24134}
   */
  async setTransferSpeedLimits(limits: TransferSpeedLimits): Promise<boolean> {
    await this.request(
      '/transfer/setSpeedLimits',
      'POST',
      undefined,
      objToUrlSearchParams({ ...limits }),
    );
    return true;
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
    limit,
    isPrivate,
    includeTrackers,
    includeFiles,
  }: {
    hashes?: string | string[];
    filter?: TorrentFilters;
    sort?: string;
    tag?: string;
    category?: string;
    offset?: number;
    limit?: number;
    reverse?: boolean;
    /**
     * Maps to `private` query parameter.
     * Renamed to avoid conflict with `private` keyword.
     */
    isPrivate?: boolean;
    includeTrackers?: boolean;
    /**
     * Include torrent files in each returned torrent.
     * Added in qBittorrent WebUI API v2.11.8.
     * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2118}
     */
    includeFiles?: boolean;
  } = {}): Promise<Torrent[]> {
    const params: Record<string, string> = {};
    if (hashes) {
      params.hashes = normalizeHashes(hashes);
    }

    if (filter) {
      if (this.state.version?.isVersion5OrHigher) {
        if (filter === 'paused') {
          filter = 'stopped';
        } else if (filter === 'resumed') {
          filter = 'running';
        }
      } else if (filter === 'stopped') {
        // For versions < 5
        filter = 'paused';
      } else if (filter === 'running') {
        // For versions < 5
        filter = 'resumed';
      }
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

    if (limit !== undefined) {
      params.limit = `${limit}`;
    }

    if (sort) {
      params.sort = sort;
    }

    if (reverse) {
      params.reverse = JSON.stringify(reverse);
    }

    if (isPrivate) {
      params.private = JSON.stringify(isPrivate);
    }

    if (includeTrackers) {
      params.includeTrackers = JSON.stringify(includeTrackers);
    }

    if (includeFiles) {
      params.includeFiles = JSON.stringify(includeFiles);
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
          labels[torrentData.label]!.count += 1;
        }
      }
    }

    results.labels = Object.values(labels);
    return results;
  }

  /**
   * Get sync main data.
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-5.0%29#get-main-data}
   */
  async getSyncMainData(rid?: number): Promise<SyncMainData> {
    const params: Record<string, number> = {};
    if (rid !== undefined) {
      params.rid = rid;
    }

    const res = await this.request<SyncMainData>('/sync/maindata', 'GET', params);
    return res;
  }

  /**
   * Load data persisted by qBittorrent's WebUI client data API.
   * Added in qBittorrent WebUI API v2.13.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2131}
   */
  async loadClientData(keys?: string[]): Promise<ClientData> {
    const params: Record<string, string> = {};
    if (keys) {
      params.keys = JSON.stringify(keys);
    }

    const res = await this.request<ClientData>('/clientdata/load', 'GET', params);
    return res;
  }

  /**
   * Store data using qBittorrent's WebUI client data API.
   * Added in qBittorrent WebUI API v2.13.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2131}
   */
  async storeClientData(data: ClientData): Promise<boolean> {
    await this.request(
      '/clientdata/store',
      'POST',
      undefined,
      objToUrlSearchParams({
        data: JSON.stringify(data),
      }),
    );
    return true;
  }

  /**
   * Get RSS auto-download rules.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/rsscontroller.cpp}
   */
  async getRssRules(): Promise<RssAutoDownloadRules> {
    const res = await this.request<RssAutoDownloadRules>('/rss/rules', 'GET');
    return res;
  }

  /**
   * Create or update an RSS auto-download rule.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/rsscontroller.cpp}
   */
  async setRssRule(ruleName: string, ruleDef: RssAutoDownloadRule): Promise<boolean> {
    await this.request(
      '/rss/setRule',
      'POST',
      undefined,
      objToUrlSearchParams({
        ruleName,
        ruleDef: JSON.stringify(ruleDef),
      }),
    );
    return true;
  }

  /**
   * Clone an RSS auto-download rule.
   * Added in qBittorrent WebUI API v2.15.4.
   * {@link https://github.com/qbittorrent/qBittorrent/pull/24056}
   */
  async cloneRssRule(sourceName: string, cloneName: string): Promise<boolean> {
    await this.request(
      '/rss/cloneRule',
      'POST',
      undefined,
      objToUrlSearchParams({ sourceName, cloneName }),
    );
    return true;
  }

  /**
   * Remove an RSS auto-download rule.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/rsscontroller.cpp}
   */
  async removeRssRule(ruleName: string): Promise<boolean> {
    await this.request('/rss/removeRule', 'POST', undefined, objToUrlSearchParams({ ruleName }));
    return true;
  }

  /**
   * Add a torrent creation task.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/torrentcreatorcontroller.cpp}
   */
  async addTorrentCreatorTask(
    sourcePath: string,
    options: TorrentCreatorAddTaskOptions = {},
  ): Promise<TorrentCreatorAddTaskResponse> {
    const { trackers, urlSeeds, ...rest } = options;
    const params: Record<string, string | number | boolean> = { sourcePath };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }

    if (trackers !== undefined) {
      params.trackers = serializeTorrentCreatorUrls(trackers);
    }

    if (urlSeeds !== undefined) {
      params.urlSeeds = serializeTorrentCreatorUrls(urlSeeds);
    }

    const res = await this.request<TorrentCreatorAddTaskResponse>(
      '/torrentcreator/addTask',
      'POST',
      undefined,
      objToUrlSearchParams(params),
    );
    return res;
  }

  /**
   * Get torrent creation task status.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/torrentcreatorcontroller.cpp}
   */
  async getTorrentCreatorStatus(taskID?: string): Promise<TorrentCreatorTaskStatus[]> {
    const params = taskID ? { taskID } : undefined;
    const res = await this.request<TorrentCreatorTaskStatus[]>(
      '/torrentcreator/status',
      'GET',
      params,
    );
    return res;
  }

  /**
   * Download a created .torrent file for a finished torrent creator task.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/torrentcreatorcontroller.cpp}
   */
  async getTorrentCreatorFile(taskID: string): Promise<Uint8Array<ArrayBuffer>> {
    const res = await this.requestArrayBuffer('/torrentcreator/torrentFile', { taskID });
    return new Uint8Array(res);
  }

  /**
   * Delete a torrent creation task.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/api/torrentcreatorcontroller.cpp}
   */
  async deleteTorrentCreatorTask(taskID: string): Promise<boolean> {
    await this.request(
      '/torrentcreator/deleteTask',
      'POST',
      undefined,
      objToUrlSearchParams({ taskID }),
    );
    return true;
  }

  /**
   * Fetch torrent metadata for a magnet URI, torrent hash, or .torrent URL.
   * Metadata retrieval can be asynchronous; a partial hash response means retry later.
   * Added in qBittorrent WebUI API v2.11.9.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2119}
   */
  async fetchTorrentMetadata(
    source: string,
    options: { downloader?: string } = {},
  ): Promise<TorrentMetadata | TorrentMetadataRequest> {
    const params: Record<string, string> = { source };
    if (options.downloader) {
      params.downloader = options.downloader;
    }

    const res = await this.request<TorrentMetadata | TorrentMetadataRequest>(
      '/torrents/fetchMetadata',
      'POST',
      undefined,
      objToUrlSearchParams(params),
    );
    return res;
  }

  /**
   * Parse metadata from a .torrent file.
   * Added in qBittorrent WebUI API v2.11.9. Since v2.13.0 this returns an array
   * in the same order as the uploaded files.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2119}
   */
  async parseTorrentMetadata(
    torrent: string | Uint8Array<ArrayBuffer>,
    filename = 'metadata.torrent',
  ): Promise<TorrentMetadata[]> {
    const form = new FormData();
    form.set('file', createTorrentFile(torrent, filename));

    const res = await this.request<TorrentMetadata | TorrentMetadata[]>(
      '/torrents/parseMetadata',
      'POST',
      undefined,
      form,
    );
    return Array.isArray(res) ? res : [res];
  }

  /**
   * Save previously fetched or parsed torrent metadata as a .torrent file.
   * Added in qBittorrent WebUI API v2.11.9.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2119}
   */
  async saveTorrentMetadata(source: string): Promise<Uint8Array<ArrayBuffer>> {
    const res = await this.requestArrayBuffer('/torrents/saveMetadata', { source });
    return new Uint8Array(res);
  }

  /**
   * Download a completed file from torrent content.
   * Added in qBittorrent WebUI API v2.16.0.
   * {@link https://github.com/qbittorrent/qBittorrent/pull/24135}
   */
  async downloadTorrentFile(hash: string, file: number | string): Promise<Uint8Array<ArrayBuffer>> {
    const res = await this.requestArrayBuffer('/torrents/downloadFile', {
      hash,
      file: file.toString(),
    });
    return new Uint8Array(res);
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
  ): Promise<boolean> {
    await this.request<TorrentFile[]>(
      '/torrents/filePrio',
      'POST',
      undefined,
      objToUrlSearchParams({
        hash,
        id: normalizeHashes(fileIds),
        priority: priority.toString(),
      }),
      undefined,
      false,
    );
    return true;
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
   * Torrents piece availability
   * @returns an array of availability counts for all pieces (in order) of a specific torrent
   * Added in qBittorrent WebUI API v2.15.1
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2151}
   */
  async torrentPieceAvailability(hash: string): Promise<TorrentPieceAvailability> {
    const res = await this.request<TorrentPieceAvailability>('/torrents/pieceAvailability', 'GET', {
      hash,
    });
    return res;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#set-torrent-location}
   */
  async setTorrentLocation(hashes: string | string[] | 'all', location: string): Promise<boolean> {
    const data = {
      location,
      hashes: normalizeHashes(hashes),
    };
    await this.request('/torrents/setLocation', 'POST', undefined, objToUrlSearchParams(data));
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
   * Set torrent comment.
   * Added in qBittorrent WebUI API v2.12.1.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2121}
   */
  async setTorrentComment(hashes: string | string[] | 'all', comment: string): Promise<boolean> {
    const data = {
      hashes: normalizeHashes(hashes),
      comment,
    };
    await this.request('/torrents/setComment', 'POST', undefined, objToUrlSearchParams(data));
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
  async stopTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const endpoint = this.state.version?.isVersion5OrHigher ? '/torrents/stop' : '/torrents/pause';
    const data = { hashes: normalizeHashes(hashes) };
    await this.request(endpoint, 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * @deprecated Alias for {@link stopTorrent}.
   */
  async pauseTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    return this.stopTorrent(hashes);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#resume-torrents}
   */
  async startTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    const endpoint = this.state.version?.isVersion5OrHigher
      ? '/torrents/start'
      : '/torrents/resume';
    const data = { hashes: normalizeHashes(hashes) };
    await this.request(endpoint, 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * @deprecated Alias for {@link startTorrent}.
   */
  async resumeTorrent(hashes: string | string[] | 'all'): Promise<boolean> {
    return this.startTorrent(hashes);
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#delete-torrents}
   * @param deleteFiles (default: false) remove files from disk
   */
  async removeTorrent(hashes: string | string[] | 'all', deleteFiles = false): Promise<boolean> {
    const data = {
      hashes: normalizeHashes(hashes),
      deleteFiles,
    };
    await this.request(
      '/torrents/delete',
      'POST',
      undefined,
      objToUrlSearchParams(data),
      undefined,
      false,
    );
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
   * `trackers` was added in qBittorrent WebUI API v2.11.10.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#21110}
   */
  async reannounceTorrent(hashes: string | string[] | 'all', trackers?: string): Promise<boolean> {
    const data: Record<string, string> = { hashes: normalizeHashes(hashes) };
    if (trackers) {
      data.trackers = trackers;
    }

    await this.request('/torrents/reannounce', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  async addTorrent(
    torrent: string | Uint8Array<ArrayBuffer>,
    options: Partial<AddTorrentOptions> = {},
  ): Promise<boolean> {
    await this.ensureAuthenticated('/torrents/add');
    const supportsSeedMode =
      options.seedMode !== undefined || options.skip_checking !== undefined
        ? (await this.getApiVersion()).localeCompare('2.16.0', undefined, { numeric: true }) >= 0
        : false;
    const form = buildAddTorrentForm({
      source: { type: 'torrent', torrent },
      options,
      isVersion5OrHigher: this.state.version?.isVersion5OrHigher ?? false,
      supportsSeedMode,
    });

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      undefined,
      false,
    );

    assertAddTorrentSucceeded(res);

    return true;
  }

  async normalizedAddTorrent(
    torrent: string | Uint8Array<ArrayBuffer>,
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
      if (!isUint8Array(torrent)) {
        torrent = stringToUint8Array(torrent);
      }

      torrentHash = torrentFileHash(torrent);
      await this.addTorrent(torrent, torrentOptions);
    }

    return this.getTorrent(torrentHash);
  }

  /**
   * @param hash Hash for desired torrent
   * @param oldPath id of the file to be renamed
   * @param newPath new name to be assigned to the file
   */
  async renameFile(hash: string, oldPath: string, newPath: string): Promise<boolean> {
    await this.request<string>(
      '/torrents/renameFile',
      'POST',
      undefined,
      objToUrlSearchParams({
        hash,
        oldPath,
        newPath,
      }),
      undefined,
      false,
    );

    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#rename-folder}
   */
  async renameFolder(hash: string, oldPath: string, newPath: string): Promise<boolean> {
    await this.request<string>(
      '/torrents/renameFolder',
      'POST',
      undefined,
      objToUrlSearchParams({
        hash,
        oldPath,
        newPath,
      }),
      undefined,
      false,
    );

    return true;
  }

  /**
   * @param urls URLs separated with newlines
   * @param options
   */
  async addMagnet(urls: string, options: Partial<AddMagnetOptions> = {}): Promise<boolean> {
    await this.ensureAuthenticated('/torrents/add');
    const supportsSeedMode =
      options.seedMode !== undefined || options.skip_checking !== undefined
        ? (await this.getApiVersion()).localeCompare('2.16.0', undefined, { numeric: true }) >= 0
        : false;
    const form = buildAddTorrentForm({
      source: { type: 'magnet', urls },
      options,
      isVersion5OrHigher: this.state.version?.isVersion5OrHigher ?? false,
      supportsSeedMode,
    });

    const res = await this.request<string>(
      '/torrents/add',
      'POST',
      undefined,
      form,
      undefined,
      false,
    );

    assertAddTorrentSucceeded(res);

    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#add-trackers-to-torrent}
   * Multiple hashes and `all` were added in qBittorrent WebUI API v2.11.9.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2119}
   */
  async addTrackers(hash: string | string[] | 'all', urls: string): Promise<boolean> {
    const data = { hash: normalizeHashes(hash), urls };
    await this.request('/torrents/addTrackers', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#edit-trackers}
   * Tracker tier editing was added in qBittorrent WebUI API v2.13.0.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2130}
   */
  async editTrackers(
    hash: string,
    origUrl: string,
    newUrl: string,
    tier?: number,
  ): Promise<boolean> {
    const data: Record<string, string | number> = {
      hash,
      origUrl,
      url: origUrl,
      newUrl,
    };
    if (tier !== undefined) {
      data.tier = tier;
    }

    await this.request('/torrents/editTrackers', 'POST', undefined, objToUrlSearchParams(data));
    return true;
  }

  /**
   * {@link https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#remove-trackers}
   * Multiple hashes and `all` were added in qBittorrent WebUI API v2.11.9.
   * {@link https://github.com/qbittorrent/qBittorrent/blob/master/WebAPI_Changelog.md#2119}
   */
  async removeTrackers(hash: string | string[] | 'all', urls: string): Promise<boolean> {
    const data = { hash: normalizeHashes(hash), urls };
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
}

function serializeTorrentCreatorUrls(urls: string | string[]): string {
  const values = Array.isArray(urls) ? urls : urls.split('|');
  // qBittorrent splits this field on `|`, then percent-decodes each entry with
  // QUrl::fromPercentEncoding(). URLSearchParams handles the form body encoding.
  return values.map(url => encodeURIComponent(url)).join('|');
}
