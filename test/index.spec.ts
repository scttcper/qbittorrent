import fs from 'fs';
import pWaitFor from 'p-wait-for';
import path from 'path';

import { TorrentState } from '@ctrl/shared-torrent';

import { QBittorrent } from '../src/index';

const baseUrl = 'http://localhost:8080';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const torrentFile = path.join(__dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');
const username = 'admin';
const password = 'adminadmin';

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
  expect(Object.keys(torrents).length).toEqual(1);
  return torrents[0].hash;
}

describe('QBittorrent', () => {
  afterEach(async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const torrents = await client.listTorrents();
    for (const torrent of torrents) {
      // clean up all torrents
      // eslint-disable-next-line no-await-in-loop
      await client.removeTorrent(torrent.hash, false);
    }
  });
  it('should be instantiable', () => {
    const client = new QBittorrent({ baseUrl, username, password });
    expect(client).toBeTruthy();
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
    expect(torrents).toHaveLength(1);
  });
  it('should add torrent with label', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const res = await client.addTorrent(fs.readFileSync(torrentFile), {
      category: 'swag',
    });
    expect(res).toBe(true);
    const torrents = await client.listTorrents();
    expect(torrents).toHaveLength(1);
    expect(torrents[0].category).toBe('swag');
  });
  it('should add normalized torrent with label', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const res = await client.normalizedAddTorrent(fs.readFileSync(torrentFile), {
      label: 'swag',
      startPaused: true,
    });
    expect(res.id).toEqual('e84213a794f3ccd890382a54a64ca68b7e925433');
    expect(res.label).toEqual('swag');
    expect(res.name).toEqual(torrentName);
  });
  it('should set torrent top priority', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const torrentId = await setupTorrent(client);
    const res = await client.topPriority(torrentId);
    expect(res).toBe(true);
  });
  it('should rename file within torrent', async () => {
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
    expect(torrentFiles[0].name).toEqual('ubuntu');
  });
  it('should recheck torrent', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const torrentId = await setupTorrent(client);
    const res = await client.recheckTorrent(torrentId);
    expect(res).toBe(true);
  });
  it('should add magnet link', async () => {
    const magnet =
      'magnet:?xt=urn:btih:B0B81206633C42874173D22E564D293DAEFC45E2&dn=Ubuntu+11+10+Alternate+Amd64+Iso&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce';
    const client = new QBittorrent({ baseUrl, username, password });
    const result = await client.addMagnet(magnet);
    expect(result).toBe(true);
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
    expect(torrent.savePath).toBe('/downloads/');
    expect(torrent.state).toBe(TorrentState.checking);
    expect(torrent.stateMessage).toBe('');
    expect(torrent.totalDownloaded).toBe(0);
    expect(torrent.totalPeers).toBe(0);
    expect(torrent.totalSeeds).toBe(0);
    expect(torrent.totalSelected).toBe(1953349632);
    expect(torrent.totalSize).toBe(1953349632);
    expect(torrent.totalUploaded).toBe(0);
    expect(torrent.uploadSpeed).toBe(0);
  });
  it('should get preferences', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const preferences = await client.getPreferences();
    expect(preferences.dht).toBe(true);
  });
});
