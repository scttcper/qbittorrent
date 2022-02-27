/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import path from 'node:path';

import test from 'ava';
import pWaitFor from 'p-wait-for';

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

test.serial.afterEach(async () => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrents = await client.listTorrents();
  for (const torrent of torrents) {
    // clean up all torrents
    await client.removeTorrent(torrent.hash, false);
  }
});

test.serial('should be instantiable', t => {
  const client = new QBittorrent({ baseUrl, username, password });
  t.truthy(client);
});
test.serial('should login', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.login();
  t.is(res, true);
});
test.serial('should logout', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.login();
  const res = await client.login();
  t.is(res, true);
});
test.serial('should add torrent from buffer', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(fs.readFileSync(torrentFile));
  t.is(res, true);
  const torrents = await client.listTorrents();
  t.is(torrents.length, 1);
});
test.serial('should add torrent from filename', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(torrentFile);
  t.true(res);
  const torrents = await client.listTorrents();
  t.is(torrents.length, 1);
});
test.serial('should add torrent with label', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.addTorrent(fs.readFileSync(torrentFile), {
    category: 'swag',
  });
  t.true(res);
  const torrents = await client.listTorrents();
  t.is(torrents.length, 1);
  t.is(torrents[0].category, 'swag');
});
test.serial('should add normalized torrent with label', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const res = await client.normalizedAddTorrent(fs.readFileSync(torrentFile), {
    label: 'swag',
    startPaused: true,
  });
  t.is(res.id, 'e84213a794f3ccd890382a54a64ca68b7e925433');
  t.is(res.label, 'swag');
  t.is(res.name, torrentName);
  await client.removeCategory('swag');
});
test.serial('should add torrent with savePath', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const path = '/downloads/linux/';
  await client.addTorrent(fs.readFileSync(torrentFile), {
    savepath: path,
    paused: 'true',
  });
  const torrentData = await client.getTorrent('e84213a794f3ccd890382a54a64ca68b7e925433');
  t.is(torrentData.savePath, path);
});
test.serial('should add torrent with autoTMM enabled, ignoring savepath', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.addTorrent(fs.readFileSync(torrentFile), {
    savepath: '/downlods/linux',
    useAutoTMM: 'true',
    paused: 'true',
  });
  const torrentData = await client.getTorrent('e84213a794f3ccd890382a54a64ca68b7e925433');
  t.is(torrentData.savePath, '/downloads/');
});
test.serial('should set torrent priority', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  t.true(await client.topPriority(torrentId));
  t.true(await client.bottomPriority(torrentId));
  t.true(await client.queueDown(torrentId));
  t.true(await client.queueUp(torrentId));
});
test.serial('should get torrent properties', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentProperties(torrentId);
  t.is(res.save_path, '/downloads/');
});
test.serial('should get torrent trackers', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentTrackers(torrentId);
  const urls = res.map(x => x.url);
  t.assert(urls.includes('http://ipv6.torrent.ubuntu.com:6969/announce'));
});
test.serial('should get torrent web seeds', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentWebSeeds(torrentId);
  const urls = res.map(x => x.url);
  t.is(urls.length, 0);
});
test.serial('should get torrent files', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentFiles(torrentId);
  const names = res.map(x => x.name);
  t.assert(names.includes('ubuntu-18.04.1-desktop-amd64.iso'));
});
test.serial('should get torrent piece state', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPieceStates(torrentId);
  t.is(res.length, 3726);
});
test.serial('should get torrent piece hashes', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.torrentPieceHashes(torrentId);
  t.is(res.length, 3726);
});
test.serial('should add/remove torrent tag', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.addTorrentTags(torrentId, 'movie');
  t.true(res);
  const res2 = await client.removeTorrentTags(torrentId, 'movie');
  t.true(res2);
  await client.deleteTags('movie');
});
test.serial('should pause/resume torrent', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  t.true(await client.pauseTorrent(torrentId));
  t.true(await client.resumeTorrent(torrentId));
});
test.serial.skip('should set torrent location', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.setTorrentLocation(torrentId, '/downloads/linux');
  t.true(res);
});
test.serial.skip('should rename file within torrent', async t => {
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

  t.true(res);
  t.is(torrentFiles[0].name, 'ubuntu');
});
test.serial('should recheck torrent', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const res = await client.recheckTorrent(torrentId);
  t.true(res);
});
test.serial('should add magnet link', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const result = await client.addMagnet(magnet);
  t.truthy(result);
});
test.serial('should return normalized torrent data', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  await setupTorrent(client);
  const res = await client.getAllData();
  const torrent = res.torrents[0];
  t.is(torrent.connectedPeers, 0);
  t.is(torrent.connectedSeeds, 0);
  t.is(torrent.downloadSpeed, 0);
  t.is(torrent.eta, 8640000);
  t.is(torrent.isCompleted, false);
  t.is(torrent.label, '');
  t.is(torrent.name, torrentName);
  t.is(torrent.progress, 0);
  t.is(torrent.queuePosition, 1);
  t.is(torrent.ratio, 0);
  t.is(torrent.savePath, '/downloads/');
  // state sometimes depends on speed of processor
  // expect(torrent.state).toBe(TorrentState.checking);
  t.is(torrent.stateMessage, '');
  t.is(torrent.totalDownloaded, 0);
  t.is(torrent.totalPeers, 0);
  t.is(torrent.totalSeeds, 0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  t.is(torrent.totalUploaded, 0);
  t.is(torrent.uploadSpeed, 0);
});
test.serial('should add normalized torrent from magnet', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrent = await client.normalizedAddTorrent(magnet, { startPaused: true });
  t.is(torrent.connectedPeers, 0);
  t.is(torrent.connectedSeeds, 0);
  t.is(torrent.downloadSpeed, 0);
  t.is(torrent.eta, 8640000);
  t.is(torrent.isCompleted, false);
  t.is(torrent.label, '');
  t.is(torrent.name, 'Ubuntu 11 10 Alternate Amd64 Iso');
  t.is(torrent.progress, 0);
  t.is(torrent.queuePosition, 1);
  t.is(torrent.ratio, 0);
  t.is(torrent.savePath, '/downloads/');
  // state sometimes depends on speed of processor
  // expect(torrent.state).toBe(TorrentState.checking);
  t.is(torrent.stateMessage, '');
  t.is(torrent.totalDownloaded, 0);
  t.is(torrent.totalPeers, 0);
  t.is(torrent.totalSeeds, 0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  t.is(torrent.totalUploaded, 0);
  t.is(torrent.uploadSpeed, 0);
});
test.serial('should get preferences', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const preferences = await client.getPreferences();
  t.is(preferences.max_active_torrents, 5);
  t.true(preferences.dht);
});
test.serial('should set preferences', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  await client.setPreferences({ max_active_torrents: 10 });

  const preferences = await client.getPreferences();
  t.is(preferences.max_active_torrents, 10);

  await client.setPreferences({ max_active_torrents: 5 });
});
test.serial('should get / create / edit / remove category', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  let categories = await client.getCategories();
  t.is(categories.movie, undefined);
  await client.createCategory('movie', '/data');
  categories = await client.getCategories();
  t.deepEqual(categories.movie, { name: 'movie', savePath: '/data' });
  await client.editCategory('movie', '/swag');
  categories = await client.getCategories();
  t.deepEqual(categories.movie, { name: 'movie', savePath: '/swag' });
  await client.removeCategory('movie');
  categories = await client.getCategories();
  t.is(categories.movie, undefined);
});
test.serial('should get / create / remove tags', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  let tags = await client.getTags();
  t.assert(!tags.includes('movies'));
  t.is(tags.length, 0);
  await client.createTags('movies,dank');
  tags = await client.getTags();
  t.assert(tags.includes('movies'));
  t.assert(tags.includes('dank'));
  await client.deleteTags('movies,dank');
  tags = await client.getTags();
  t.is(tags.length, 0);
});
test.serial('should set categories to torrent', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const cat = 'parks-and-rec';
  await client.createCategory(cat);
  await client.setTorrentCategory(torrentId, cat);
  const allData = await client.getTorrent(torrentId);
  t.is(allData.label, cat);
  await client.removeCategory(cat);
});
test.serial('should get application version', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const version = await client.getAppVersion();
  console.log('App version', version);
  t.truthy(version);
  t.assert(typeof version === 'string');
});
test.serial('should get api version', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const version = await client.getApiVersion();
  console.log('API version', version);
  t.truthy(version);
  t.assert(typeof version === 'string');
});
test.serial('should get build info', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const buildInfo = await client.getBuildInfo();
  t.truthy(buildInfo.libtorrent);
  t.assert(typeof buildInfo.libtorrent === 'string');
});
test.serial('should set torrent name', async t => {
  const client = new QBittorrent({ baseUrl, username, password });
  const torrentId = await setupTorrent(client);
  const name = 'important-utorrent';
  await client.setTorrentName(torrentId, name);
  const torrentData = await client.getTorrent(torrentId);
  t.is(torrentData.name, name);
});
