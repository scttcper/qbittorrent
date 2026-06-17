import { readFileSync } from 'node:fs';
import path from 'node:path';

import pWaitFor from 'p-wait-for';
import { afterEach, expect, it } from 'vitest';

import { QBittorrent, TorrentFilePriority } from '../src/index.js';

const baseUrl = 'http://localhost:8080';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const __dirname = new URL('.', import.meta.url).pathname;
const torrentFilePath = path.join(__dirname, 'ubuntu-18.04.1-desktop-amd64.iso.torrent');
const torrentFileBuffer = readFileSync(torrentFilePath);
const username = 'admin';
const password = 'adminadmin';
const magnet =
  'magnet:?xt=urn:btih:B0B81206633C42874173D22E564D293DAEFC45E2&dn=Ubuntu+11+10+Alternate+Amd64+Iso&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce';
let apiVersionPromise: Promise<string> | undefined;

function getTestApiVersion(): Promise<string> {
  apiVersionPromise ??= new QBittorrent({ baseUrl, username, password }).getApiVersion();
  return apiVersionPromise;
}

async function skipIfUnsupported(minVersion: string, feature: string): Promise<boolean> {
  const apiVersion = await getTestApiVersion();
  if (isVersionGreaterOrEqual(apiVersion, minVersion)) {
    return false;
  }

  console.log(`Skipping ${feature}: WebAPI ${apiVersion} < ${minVersion}`);
  return true;
}

async function waitForTorrent(client: QBittorrent) {
  await pWaitFor(
    async () => {
      const torrents = await client.listTorrents();
      return Object.keys(torrents).length === 1;
    },
    { timeout: 10_000 },
  );
}

/**
 * Adds torrent and returns hash
 * @returns torrent hash id
 */
async function setupTorrent(client: QBittorrent): Promise<string> {
  await client.addTorrent(torrentFileBuffer);
  await waitForTorrent(client);
  const torrents = await client.listTorrents();
  return torrents[0]!.hash;
}

function isVersionGreaterOrEqual(version: string, minVersion: string): boolean {
  return version.localeCompare(minVersion, undefined, { numeric: true }) >= 0;
}

afterEach(async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrents = await client.listTorrents();
  for (const torrent of torrents) {
    // clean up all torrents
    await client.removeTorrent(torrent.hash, false);
  }
});

it('should login', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.login();
  expect(res).toBe(true);
});
it('should logout', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.login();
  const res = await client.login();
  expect(res).toBe(true);
});
it('should add torrent from string', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(torrentFileBuffer.toString('base64'));
  expect(res).toBe(true);
  await waitForTorrent(client);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
});
it('should add torrent from buffer', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(torrentFileBuffer);
  expect(res).toBe(true);
  await waitForTorrent(client);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
});
it('should add torrent with label', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(torrentFileBuffer, {
    category: 'swag',
  });
  expect(res).toBe(true);
  await waitForTorrent(client);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
  expect(torrents[0]!.category).toBe('swag');
  const allData = await client.getAllData();
  expect(allData.labels).toEqual([{ id: 'swag', name: 'swag', count: 1 }]);
});
it('should add normalized torrent with label', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.normalizedAddTorrent(torrentFileBuffer, {
    label: 'swag',
    startPaused: true,
  });
  expect(res.id).toBe('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(res.label).toBe('swag');
  expect(res.name).toBe(torrentName);
  await waitForTorrent(client);
  await client.removeCategory('swag');
});
it('should add torrent with savePath', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const savePath = '/downloads/linux/';
  await client.addTorrent(torrentFileBuffer, {
    savepath: savePath,
    paused: 'true',
  });
  await waitForTorrent(client);
  const torrentData = await client.getTorrent('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(torrentData.savePath).includes('/downloads/linux');
});
it('should add torrent with autoTMM enabled, ignoring savepath', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.addTorrent(torrentFileBuffer, {
    savepath: '/downlods/linux',
    useAutoTMM: 'true',
    paused: 'true',
  });
  await waitForTorrent(client);
  const torrentData = await client.getTorrent('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(torrentData.savePath).toEqual(expect.stringMatching(/downloads/i));
});
it.skip('should set torrent priority', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  expect(await client.topPriority(torrentId)).toBe(true);
  expect(await client.bottomPriority(torrentId)).toBe(true);
  expect(await client.queueDown(torrentId)).toBe(true);
  expect(await client.queueUp(torrentId)).toBe(true);
});
it('should get torrent properties', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentProperties(torrentId);
  expect(res.save_path).toEqual(expect.stringMatching(/downloads/i));
});
it('should get torrent peers', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPeers(torrentId);
  expect(res.full_update).toBe(true);
  expect(res.peers).toBeDefined();
});
it('should get torrent trackers', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentTrackers(torrentId);
  const urls = res.map(x => x.url);
  expect(urls.includes('http://ipv6.torrent.ubuntu.com:6969/announce')).toBeTruthy();
});
it('should add torrent trackers', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  expect(await client.addTrackers(torrentId, 'http://tracker.example.com/announce')).toBeTruthy();
  const trackers = await client.torrentTrackers(torrentId);
  expect(trackers.map(x => x.url)).includes('http://tracker.example.com/announce');
  expect(
    await client.removeTrackers(torrentId, 'http://tracker.example.com/announce'),
  ).toBeTruthy();
  const trackers2 = await client.torrentTrackers(torrentId);
  expect(trackers2.map(x => x.url)).not.includes('http://tracker.example.com/announce');
});
it('should get torrent web seeds', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentWebSeeds(torrentId);
  const urls = res.map(x => x.url);
  expect(urls.length).toBe(0);
});
it('should get torrent files', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentFiles(torrentId);
  const names = res.map(x => x.name);
  expect(names.includes('ubuntu-18.04.1-desktop-amd64.iso')).toBeTruthy();
});
it('should get torrent piece state', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPieceStates(torrentId);
  expect(Array.isArray(res)).toBeTruthy();
});
it('should get torrent piece hashes', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPieceHashes(torrentId);
  expect(res.length).toBe(3726);
});
it('should get torrent piece availability', async () => {
  if (await skipIfUnsupported('2.15.1', 'torrent piece availability')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPieceAvailability(torrentId);
  expect(res.length).toBe(3726);
  expect(res.every(piece => typeof piece === 'number')).toBe(true);
});
it('should fetch torrent metadata', async () => {
  if (await skipIfUnsupported('2.11.9', 'fetch torrent metadata')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const metadata = await client.fetchTorrentMetadata(torrentId);
  expect(metadata.hash).toBe(torrentId);
  expect('info' in metadata ? metadata.info.name : undefined).toBe(torrentName);
});
it('should parse and save torrent metadata', async () => {
  if (await skipIfUnsupported('2.11.9', 'parse and save torrent metadata')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const [metadata] = await client.parseTorrentMetadata(torrentFileBuffer, 'ubuntu.torrent');
  expect(metadata!.hash).toBe('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(metadata!.info.files[0]!.path).toBe('ubuntu-18.04.1-desktop-amd64.iso');

  const torrent = await client.saveTorrentMetadata(metadata!.hash);
  expect(torrent.byteLength).toBeGreaterThan(0);
});
it('should reject downloading incomplete torrent files through downloadFile endpoint', async () => {
  if (await skipIfUnsupported('2.16.0', 'download torrent file')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  await expect(client.downloadTorrentFile(torrentId, 0)).rejects.toThrow();
});
it('should add torrent from parsed metadata with file priorities', async () => {
  if (await skipIfUnsupported('2.11.9', 'add torrent from parsed metadata')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const [metadata] = await client.parseTorrentMetadata(torrentFileBuffer, 'ubuntu.torrent');
  const res = await client.addMagnet(metadata!.hash, {
    filePriorities: [TorrentFilePriority.Skip],
    stopped: 'true',
  });
  expect(res).toBe(true);
  await waitForTorrent(client);

  const files = await client.torrentFiles(metadata!.hash);
  expect(files[0]!.priority).toBe(TorrentFilePriority.Skip);
});
it('should add/remove torrent tag', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.addTorrentTags(torrentId, 'movie');
  expect(res).toBe(true);
  await client.addTorrentTags(torrentId, '4k');
  const torrent = await client.getTorrent(torrentId);
  expect(torrent.tags!.sort()).toEqual(['4k', 'movie']);
  const res2 = await client.removeTorrentTags(torrentId, 'movie');
  expect(res2).toBe(true);
  await client.removeTorrentTags(torrentId, '4k');
  await client.deleteTags('movie');
  await client.deleteTags('4k');
});
it('should pause/resume torrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  expect(await client.pauseTorrent(torrentId)).toBeTruthy();
  expect(await client.resumeTorrent(torrentId)).toBeTruthy();
});
it('should reannounceTorrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  expect(await client.reannounceTorrent(torrentId)).toBeTruthy();
});
it('should set torrent location', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.setTorrentLocation(torrentId, '/tmp');
  expect(res).toBe(true);
});
it('should rename file within torrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  let torrentFiles = await client.torrentFiles(torrentId);
  expect(await client.renameFile(torrentId, torrentFiles[0]!.name, 'ubuntu')).toBe(true);
  await pWaitFor(async () => {
    torrentFiles = await client.torrentFiles(torrentId);
    return torrentFiles[0]?.name === 'ubuntu';
  });
  expect(torrentFiles[0]!.name).toBe('ubuntu');
});
it('should set torrent priority', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  let torrentFiles = await client.torrentFiles(torrentId);
  expect(torrentFiles[0]!.priority).toBe(TorrentFilePriority.NormalPriority);
  expect(await client.setFilePriority(torrentId, '0', TorrentFilePriority.MaxPriority)).toBe(true);
  torrentFiles = await client.torrentFiles(torrentId);
  expect(torrentFiles[0]!.priority).toBe(TorrentFilePriority.MaxPriority);
});
it('should recheck torrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.recheckTorrent(torrentId);
  expect(res).toBe(true);
});
it('should add magnet link', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addMagnet(magnet);
  expect(res).toBeTruthy();
});
it('should return normalized torrent data', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await setupTorrent(client);
  const res = await client.getAllData();
  const torrent = res.torrents[0]!;
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  expect(torrent.eta).toBe(8_640_000);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.label).toBe('');
  expect(torrent.name).toBe(torrentName);
  expect(torrent.progress).toBe(0);
  expect(torrent.queuePosition).toBe(1);
  expect(torrent.ratio).toBe(0);
  expect(torrent.savePath).toEqual(expect.stringMatching(/downloads/i));
  // state sometimes depends on speed of processor
  // expect(torrent.state).toBe(TorrentState.checking);
  // expect(torrent.stateMessage).toBe('');
  expect(torrent.totalDownloaded).toBe(0);
  expect(torrent.totalPeers).toBe(0);
  expect(torrent.totalSeeds).toBe(0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  expect(torrent.totalUploaded).toBe(0);
  expect(torrent.uploadSpeed).toBe(0);
});
// For some reason fails on github actions
it.skip('should add normalized torrent from magnet', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrent = await client.normalizedAddTorrent(magnet, { startPaused: true });
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  expect(torrent.eta).toBe(8_640_000);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.label).toBe('');
  expect(torrent.name).toBe('Ubuntu 11 10 Alternate Amd64 Iso');
  expect(torrent.progress).toBe(0);
  expect(torrent.queuePosition).toBe(1);
  expect(torrent.ratio).toBe(0);
  expect(torrent.savePath).toEqual(expect.stringMatching(/downloads/i));
  // state sometimes depends on speed of processor
  // expect(torrent.state).toBe(TorrentState.checking);
  // expect(torrent.stateMessage).toBe('');
  expect(torrent.totalDownloaded).toBe(0);
  expect(torrent.totalPeers).toBe(0);
  expect(torrent.totalSeeds).toBe(0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  expect(torrent.totalUploaded).toBe(0);
  expect(torrent.uploadSpeed).toBe(0);
});
it('should get preferences', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const preferences = await client.getPreferences();
  expect(preferences.max_active_torrents).toBe(5);
  expect(preferences.dht).toBe(true);
});
it('should set preferences', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.setPreferences({ max_active_torrents: 10 });

  const preferences = await client.getPreferences();
  expect(preferences.max_active_torrents).toBe(10);

  await client.setPreferences({ max_active_torrents: 5 });
});
it('should get / create / edit / remove category', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.removeCategory('movie');
  let categories = await client.getCategories();
  expect(categories.movie).toBe(undefined);
  await client.createCategory('movie', '/data');
  categories = await client.getCategories();
  expect(categories.movie).toMatchObject({ name: 'movie', savePath: '/data' });
  await client.editCategory('movie', '/swag');
  categories = await client.getCategories();
  expect(categories.movie).toMatchObject({ name: 'movie', savePath: '/swag' });
  await client.removeCategory('movie');
  categories = await client.getCategories();
  expect(categories.movie).toBe(undefined);
});
it('should get / create / remove tags', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  let tags = await client.getTags();
  expect(!tags.includes('movies')).toBeTruthy();
  expect(tags.length).toBe(0);
  await client.createTags('movies,dank');
  tags = await client.getTags();
  expect(tags.includes('movies')).toBeTruthy();
  expect(tags.includes('dank')).toBeTruthy();
  await client.deleteTags('movies,dank');
  tags = await client.getTags();
  expect(tags.length).toBe(0);
});
it('should set categories to torrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const cat = 'parks-and-rec';
  await client.createCategory(cat);
  await client.setTorrentCategory(torrentId, cat);
  const allData = await client.getTorrent(torrentId);
  expect(allData.label).toBe(cat);
  await client.removeCategory(cat);
});
it('should get application version', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const version = await client.getAppVersion();
  console.log('App version', version);
  expect(version).toBeTruthy();
  expect(typeof version).toBe('string');
});
it('should get api version', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const version = await client.getApiVersion();
  console.log('API version', version);
  expect(version).toBeTruthy();
  expect(typeof version).toBe('string');
});
it('should get build info', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const buildInfo = await client.getBuildInfo();
  expect(buildInfo.libtorrent).toBeTruthy();
  expect(typeof buildInfo.libtorrent).toBe('string');
});
it('should get process info', async () => {
  if (await skipIfUnsupported('2.15.1', 'process info')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const processInfo = await client.getProcessInfo();
  expect(processInfo.launch_time).toBeGreaterThan(0);
});
it('should get free space at path', async () => {
  if (await skipIfUnsupported('2.15.2', 'free space at path')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const freeSpace = await client.getFreeSpaceAtPath('/downloads');
  expect(freeSpace).toBeGreaterThan(0);
});
it('should get and set transfer speed limits', async () => {
  if (await skipIfUnsupported('2.16.0', 'transfer speed limits')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const original = await client.getTransferSpeedLimits();
  try {
    expect(
      await client.setTransferSpeedLimits({
        up_limit: 1024,
        dl_limit: 2048,
        alt_up_limit: 4096,
        alt_dl_limit: 8192,
      }),
    ).toBe(true);
    expect(await client.getTransferSpeedLimits()).toMatchObject({
      up_limit: 1024,
      dl_limit: 2048,
      alt_up_limit: 4096,
      alt_dl_limit: 8192,
    });
  } finally {
    await client.setTransferSpeedLimits(original);
  }
});
it('should get directory content metadata', async () => {
  if (await skipIfUnsupported('2.11.8', 'directory content metadata')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const content = await client.getDirectoryContent('/downloads', { withMetadata: true });
  expect(Array.isArray(content)).toBe(true);
});
it('should list torrents with included files', async () => {
  if (await skipIfUnsupported('2.11.8', 'torrent list included files')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  await setupTorrent(client);
  const torrents = await client.listTorrents({ includeFiles: true });
  expect(torrents[0]!.files?.map(file => file.name)).includes('ubuntu-18.04.1-desktop-amd64.iso');
});
it('should set torrent comment', async () => {
  if (await skipIfUnsupported('2.12.1', 'torrent comments')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  expect(await client.setTorrentComment(torrentId, 'important comment')).toBe(true);
  const properties = await client.torrentProperties(torrentId);
  expect(properties.comment).toBe('important comment');
});
it('should get sync main data', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const data = await client.getSyncMainData();
  expect(data.full_update).toBe(true);
  expect(data.rid).toBeGreaterThan(0);
});
it('should store and load client data', async () => {
  if (await skipIfUnsupported('2.13.1', 'client data')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  await client.storeClientData({ test_value: 'stored' });
  const data = await client.loadClientData(['test_value']);
  expect(data.test_value).toBe('stored');
});
it('should clone rss auto-download rule', async () => {
  if (await skipIfUnsupported('2.15.4', 'clone rss rule')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const sourceName = `source-${Date.now()}`;
  const cloneName = `clone-${Date.now()}`;
  try {
    expect(
      await client.setRssRule(sourceName, {
        enabled: false,
        mustContain: 'ubuntu',
        savePath: '/downloads',
      }),
    ).toBe(true);
    expect(await client.cloneRssRule(sourceName, cloneName)).toBe(true);

    const rules = await client.getRssRules();
    expect(rules[sourceName]?.mustContain).toBe('ubuntu');
    expect(rules[cloneName]?.mustContain).toBe('ubuntu');
  } finally {
    await client.removeRssRule(sourceName);
    await client.removeRssRule(cloneName);
  }
});
it('should add, inspect, and delete torrent creator task', async () => {
  if (await skipIfUnsupported('2.16.0', 'torrent creator task')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const missingSourcePath = `/downloads/missing-${Date.now()}`;
  const { taskID } = await client.addTorrentCreatorTask(missingSourcePath, {
    ignoreDotfiles: false,
    private: true,
    startSeeding: false,
  });

  try {
    const [task] = await client.getTorrentCreatorStatus(taskID);
    expect(task).toMatchObject({
      taskID,
      sourcePath: missingSourcePath,
      ignoreDotfiles: false,
      private: true,
    });
    expect(typeof task!.timeAdded).toBe('number');
  } finally {
    await client.deleteTorrentCreatorTask(taskID);
  }
});
it('should get and set cookies', async () => {
  if (await skipIfUnsupported('2.11.3', 'cookies')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  await client.setCookies([
    {
      name: 'test_cookie',
      domain: 'example.com',
      path: '/',
      value: 'stored',
      expirationDate: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
  const cookies = await client.getCookies();
  expect(cookies).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'test_cookie',
        value: 'stored',
      }),
    ]),
  );
});
it('should authenticate with api key', async () => {
  if (await skipIfUnsupported('2.14.1', 'api key auth')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const apiKey = await client.rotateApiKey();
  expect(apiKey).toMatch(/^qbt_/);

  const apiKeyClient = new QBittorrent({ baseUrl, apiKey });
  const version = await apiKeyClient.getAppVersion();
  expect(version).toBeTruthy();

  await client.deleteApiKey();
});
it('should set torrent name', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const name = 'important-utorrent';
  await client.setTorrentName(torrentId, name);
  const torrentData = await client.getTorrent(torrentId);
  expect(torrentData.name).toBe(name);
});

it('should be able to get the default save path', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const p = await client.getDefaultSavePath();
  expect(p).not.toBeUndefined();
  expect(p.toLowerCase()).toContain('/downloads');
});

it('should be able to export and create from state', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.login();
  const state = client.exportState();
  const client2 = QBittorrent.createFromState(client.config, state);
  expect(client2).toBeDefined();
  expect(client2.state.auth?.sid).toBeDefined();
  expect(client2.state.auth?.expires).toBeInstanceOf(Date);
});

it('should authenticate requests with basic auth when the session cookie is invalid', async () => {
  const client = QBittorrent.createFromState(
    { baseUrl, username, password },
    {
      auth: {
        sid: 'invalid-session-id',
        cookieName: 'QBT_SID_8080',
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      version: {
        version: 'v5.2.0',
        isVersion5OrHigher: true,
      },
    },
  );

  const version = await client.getAppVersion();

  expect(version).toBeTruthy();
  expect(client.state.auth?.sid).toBe('invalid-session-id');
});

it('should list torrents', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await setupTorrent(client);
  const torrents = await client.listTorrents();
  const torrent = torrents[0]!;
  expect(torrent.content_path).toContain('/');
  expect(typeof torrent.auto_tmm).toBe('boolean');
  expect(typeof torrent.availability).toBe('number');
  expect(typeof torrent.force_start).toBe('boolean');
  expect(typeof torrent.seeding_time).toBe('number');
});
it('should include WebAPI 2.16 sync and preference fields when supported', async () => {
  if (await skipIfUnsupported('2.16.0', 'WebAPI 2.16 fields')) {
    return;
  }

  const client = new QBittorrent({ baseUrl, username, password });
  const data = await client.getSyncMainData();
  expect(typeof data.server_state?.request_latency).toBe('number');
  expect(typeof data.server_state?.queued_tracker_announces).toBe('number');

  const preferences = await client.getPreferences();
  expect(typeof preferences.seeding_outgoing_connections).toBe('boolean');
  expect(typeof preferences.mail_notification_encryption_type).toBe('string');
});
