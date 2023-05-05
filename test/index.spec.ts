/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import path from 'node:path';

import pWaitFor from 'p-wait-for';
import { afterEach, expect, it } from 'vitest';

import { QBittorrent } from '../src/index.js';

const baseUrl = 'http://localhost:8080';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const __dirname = new URL('.', import.meta.url).pathname;
const torrentFile = path.join(__dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');
const username = 'admin';
const password = 'adminadmin';
const magnet =
  'magnet:?xt=urn:btih:B0B81206633C42874173D22E564D293DAEFC45E2&dn=Ubuntu+11+10+Alternate+Amd64+Iso&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce';

/**
 * Adds torrent and returns hash
 * @returns torrent hash id
 */
async function setupTorrent(client: QBittorrent): Promise<string> {
  await client.addTorrent(torrentFile);
  await pWaitFor(
    async () => {
      const torrents = await client.listTorrents();
      return Object.keys(torrents).length === 1;
    },
    { timeout: 10000 },
  );
  const torrents = await client.listTorrents();
  return torrents[0].hash;
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
  const res = await client.addTorrent(fs.readFileSync(torrentFile).toString('base64'));
  expect(res).toBe(true);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
});
it('should add torrent from buffer', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(fs.readFileSync(torrentFile));
  expect(res).toBe(true);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
});
it('should add torrent from filename', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(torrentFile);
  expect(res).toBe(true);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
});
it('should add torrent with label', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(fs.readFileSync(torrentFile), {
    category: 'swag',
  });
  expect(res).toBe(true);
  const torrents = await client.listTorrents();
  expect(torrents.length).toBe(1);
  expect(torrents[0].category).toBe('swag');
});
it('should add normalized torrent with label', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.normalizedAddTorrent(fs.readFileSync(torrentFile), {
    label: 'swag',
    startPaused: true,
  });
  expect(res.id).toBe('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(res.label).toBe('swag');
  expect(res.name).toBe(torrentName);
  await client.removeCategory('swag');
});
it('should add torrent with savePath', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const path = '/downloads/linux/';
  await client.addTorrent(fs.readFileSync(torrentFile), {
    savepath: path,
    paused: 'true',
  });
  const torrentData = await client.getTorrent('e84213a794f3ccd890382a54a64ca68b7e925433');
  expect(torrentData.savePath).includes('/downloads/linux');
});
it('should add torrent with autoTMM enabled, ignoring savepath', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.addTorrent(fs.readFileSync(torrentFile), {
    savepath: '/downlods/linux',
    useAutoTMM: 'true',
    paused: 'true',
  });
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
  console.log(trackers);
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
it('should add/remove torrent tag', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.addTorrentTags(torrentId, 'movie');
  expect(res).toBe(true);
  await client.addTorrentTags(torrentId, '4k');
  const torrent = await client.getTorrent(torrentId);
  expect(torrent.tags.sort()).toEqual(['4k', 'movie']);
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
it.skip('should set torrent location', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.setTorrentLocation(torrentId, '/downloads/linux');
  expect(res).toBe(true);
});
it.skip('should rename file within torrent', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  await pWaitFor(
    async () => {
      await client.renameFile(torrentId, 0, 'ubuntu');
      const torrentFiles = await client.torrentFiles(torrentId);
      return torrentFiles[0].name === 'ubuntu';
    },
    { timeout: 10000 },
  );

  const res = await client.renameFile(torrentId, 0, 'ubuntu');
  const torrentFiles = await client.torrentFiles(torrentId);

  expect(res).toBe(true);
  expect(torrentFiles[0].name).toBe('ubuntu');
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
  const torrent = res.torrents[0];
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  expect(torrent.eta).toBe(8640000);
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
it('should add normalized torrent from magnet', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrent = await client.normalizedAddTorrent(magnet, { startPaused: true });
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  expect(torrent.eta).toBe(8640000);
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
  let categories = await client.getCategories();
  expect(categories.movie).toBe(undefined);
  await client.createCategory('movie', '/data');
  categories = await client.getCategories();
  expect(categories.movie).toEqual({ name: 'movie', savePath: '/data' });
  await client.editCategory('movie', '/swag');
  categories = await client.getCategories();
  expect(categories.movie).toEqual({ name: 'movie', savePath: '/swag' });
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
it('should set torrent name', async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const name = 'important-utorrent';
  await client.setTorrentName(torrentId, name);
  const torrentData = await client.getTorrent(torrentId);
  expect(torrentData.name).toBe(name);
});
