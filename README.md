# qBittorrent [![npm](https://badgen.net/npm/v/@ctrl/qbittorrent)](https://www.npmjs.com/package/@ctrl/qbittorrent) [![coverage](https://badgen.net/codecov/c/github/scttcper/qbittorrent)](https://codecov.io/gh/scttcper/qbittorrent)

> TypeScript api wrapper for [qBittorrent](https://www.qbittorrent.org/) using [ofetch](https://github.com/unjs/ofetch)

### Install

```console
npm install @ctrl/qbittorrent
```

### Use

```ts
import { QBittorrent } from '@ctrl/qbittorrent';

const client = new QBittorrent({
  baseUrl: 'http://localhost:8080/',
  username: 'admin',
  password: 'adminadmin',
});

async function main() {
  const res = await qbittorrent.getAllData();
  console.log(res);
}
```

### API

Docs: https://qbittorrent.vercel.app  
qBittorrent Api Docs: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)  

### Normalized API

These functions have been normalized between torrent clients to easily support switching between multiple torrent clients. See [below](#see-also) for alternative supported torrent clients

##### getAllData

Returns all torrent data and an array of label objects. Data has been normalized and does not match the output of native `listTorrents()`.

```ts
const data = await client.getAllData();
console.log(data.torrents);
```

##### getTorrent

Returns one torrent data from torrent hash

```ts
const data = await client.getTorrent('torrent-hash');
console.log(data);
```

##### pauseTorrent and resumeTorrent

Pause or resume a torrent

```ts
const paused = await client.pauseTorrent();
console.log(paused);
const resumed = await client.resumeTorrent();
console.log(resumed);
```

##### removeTorrent

Remove a torrent. Does not remove data on disk by default.

```ts
// does not remove data on disk
const result = await client.removeTorrent('torrent_id', false);
console.log(result);

// remove data on disk
const res = await client.removeTorrent('torrent_id', true);
console.log(res);
```

##### addTorrent

Add a torrent, has client specific options. Also see normalizedAddTorrent

```ts
const result = await client.addTorrent(fs.readFileSync(torrentFile));
console.log(result);
```

##### normalizedAddTorrent

Add a torrent and return normalized torrent data, can start a torrent paused and add label

```ts
const result = await client.normalizedAddTorrent(fs.readFileSync(torrentFile), {
    startPaused: false;
    label: 'linux';
});
console.log(result);
```

### See Also

All of the following npm modules provide the same normalized functions along with supporting the unique apis for each client.

deluge - https://github.com/scttcper/deluge  
transmission - https://github.com/scttcper/transmission  
utorrent - https://github.com/scttcper/utorrent

### Start a test docker container

```
docker run -d \
  --name=qbittorrent \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=Etc/UTC \
  -e WEBUI_PORT=8080 \
  -p 8080:8080 \
  -p 6881:6881 \
  -p 6881:6881/udp \
  --restart unless-stopped \
  lscr.io/linuxserver/qbittorrent:latest
```
