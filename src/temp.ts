import path from 'path';
// import parseTorrent from 'parse-torrent';
import pWaitFor from 'p-wait-for';

import { QBittorrent } from '../src';

const baseUrl = 'http://localhost:8080';
const client = new QBittorrent({ baseUrl, username: 'admin', password: 'adminadmin' });

// const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const torrentFile = path.join(__dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');

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

(async () => {
  const results = await client.login();
  console.log(results);
  console.log(await client.version());
  // console.log(await client.torrentTrackers('e84213a794f3ccd890382a54a64ca68b7e925433'));
  // console.log(await client.torrentWebSeeds('e84213a794f3ccd890382a54a64ca68b7e925433'));
  // console.log(await client.torrentFiles('e84213a794f3ccd890382a54a64ca68b7e925433'));
  // console.log(parseTorrent(fs.readFileSync(torrentFile)).infoHash);
  console.log(await setupTorrent(client));
})();
