import path from 'path';
import pWaitFor from 'p-wait-for';
import fs from 'fs';

import { QBittorrent } from '../src/index';
import { TorrentState } from '@ctrl/shared-torrent';

const baseUrl = 'http://localhost:8080';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const torrentFile = path.join(__dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');
const username = 'admin';
const password = 'adminadmin';

async function setupTorrent(client: QBittorrent) {
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
      await client.removeTorrent(torrent.hash, false);
    }
  });
  it('should be instantiable', async () => {
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
    const res = await client.addTorrent(fs.readFileSync(torrentFile), undefined, {
      category: 'swag',
    });
    expect(res).toBe(true);
    const torrents = await client.listTorrents();
    expect(torrents).toHaveLength(1);
    expect(torrents[0].category).toBe('swag');
  });
  it('should set torrent top priority', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const torrentId = await setupTorrent(client);
    const res = await client.topPriority(torrentId);
    expect(res).toBe(true);
  });
  it('should recheck torrent', async () => {
    const client = new QBittorrent({ baseUrl, username, password });
    const torrentId = await setupTorrent(client);
    const res = await client.recheckTorrent(torrentId);
    expect(res).toBe(true);
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
});
