# qBittorrent [![npm](https://badgen.net/npm/v/@ctrl/qbittorrent)](https://www.npmjs.com/package/@ctrl/qbittorrent)

> TypeScript api wrapper for [qBittorrent](https://www.qbittorrent.org/) using [ofetch](https://github.com/unjs/ofetch)

### Install

```console
npm install @ctrl/qbittorrent
```

Requires Node.js 24 or newer.

### Use

```ts
import { QBittorrent } from '@ctrl/qbittorrent';

const client = new QBittorrent({
  baseUrl: 'http://localhost:8080/',
  username: 'admin',
  password: 'adminadmin',
});

async function main() {
  const res = await client.getAllData();
  console.log(res);
}
```

### Authentication

The default authentication mode uses qBittorrent's username/password login flow
and stores the returned WebUI session cookie.

qBittorrent v5.2.0 and WebAPI v2.14.1 added API key authentication. Pass an API
key to use stateless bearer authentication instead of cookie login:

```ts
const client = new QBittorrent({
  baseUrl: 'http://localhost:8080/',
  apiKey: 'qbt_0000000000000000000000000000',
});
```

API keys can be created from the qBittorrent WebUI. They can also be rotated or
deleted through the WebAPI:

```ts
const passwordClient = new QBittorrent({
  baseUrl: 'http://localhost:8080/',
  username: 'admin',
  password: 'adminadmin',
});

const apiKey = await passwordClient.rotateApiKey();
await passwordClient.deleteApiKey();
```

### API

Docs: https://qbittorrent.ep.workers.dev  
qBittorrent API Docs: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-5.0)  
qBittorrent API Key Docs: https://github.com/qbittorrent/qBittorrent/wiki/API-Key-Authentication-%28%E2%89%A5v5.2.0%29

Things that work differently from the other clients:

- `label` is the qBittorrent category
- `queueUp`/`queueDown` need torrent queueing enabled, qBittorrent responds with a 409 otherwise. `queuePosition` is `0` when queueing is disabled or the torrent is seeding
- `pauseTorrent`/`resumeTorrent` use `/torrents/stop` and `/torrents/start` on qBittorrent 5 and `/torrents/pause` and `/torrents/resume` on 4.x

### Normalized API

These functions are normalized through [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent), which makes it easier to support multiple torrent clients. See [below](#see-also) for alternative supported torrent clients.

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

Pause or resume one or more torrents

```ts
await client.pauseTorrent('torrent-hash');
await client.resumeTorrent(['torrent-hash', 'other-torrent-hash']);
```

##### removeTorrent

Remove one or more torrents, throws if a torrent doesn't exist. Does not remove data on disk by default.

```ts
// does not remove data on disk
await client.removeTorrent('torrent-hash', false);

// remove data on disk
await client.removeTorrent(['torrent-hash', 'other-torrent-hash'], true);
```

##### queueUp and queueDown

Move a torrent up or down the queue

```ts
await client.queueUp('torrent-hash');
await client.queueDown('torrent-hash');
```

##### addTorrent

Add a torrent from a magnet link or torrent file, has client specific options. Also see normalizedAddTorrent

```ts
import { readFileSync } from 'node:fs';

const result = await client.addTorrent(new Uint8Array(readFileSync('./linux.torrent')));
console.log(result);
```

##### normalizedAddTorrent

Add a torrent and return normalized torrent data, can start a torrent paused and add label

```ts
const result = await client.normalizedAddTorrent('magnet:?xt=urn:btih:...', {
  startPaused: false,
  label: 'linux',
});
console.log(result);
```

##### Errors

Failed requests throw a `TorrentClientError` from [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent) with a `code` of `torrent_not_found`, `unauthorized`, `request_failed` or `client_error`, the http `status` when there is one and the original error as the `cause`.

```ts
import { TorrentClientError } from '@ctrl/qbittorrent';

try {
  await client.removeTorrent('torrent-hash');
} catch (error) {
  if (error instanceof TorrentClientError && error.code === 'torrent_not_found') {
    // already removed
  }
}
```

##### export and create from state

If you're shutting down the server often (serverless?) you can export the state

```ts
const state = client.exportState();
const restored = QBittorrent.createFromState(config, state);
```

### See Also

All of the following npm modules provide the same normalized functions along with supporting the unique apis for each client.

- shared types - [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent)
- deluge - [@ctrl/deluge](https://github.com/scttcper/deluge)
- transmission - [@ctrl/transmission](https://github.com/scttcper/transmission)
- utorrent - [@ctrl/utorrent](https://github.com/scttcper/utorrent)
- rtorrent - [@ctrl/rtorrent](https://github.com/scttcper/rtorrent)
- rqbit - [@ctrl/rqbit](https://github.com/scttcper/rqbit)

Usenet clients with the same normalized approach:

- usenet shared types - [@ctrl/shared-usenet](https://github.com/scttcper/shared-usenet)
- nzbget - [@ctrl/nzbget](https://github.com/scttcper/nzbget)
- sabnzbd - [@ctrl/sabnzbd](https://github.com/scttcper/sabnzbd)

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

### Start a test docker container for qBittorrent alpha

Use the official alpha image when testing against the newest WebAPI changes. The
linuxserver `latest` image can lag behind the latest qBittorrent release.

```
mkdir -p /tmp/qbittorrent-alpha/config /tmp/qbittorrent-alpha/downloads

docker run -d \
  --name=qbittorrent-alpha \
  -e QBT_LEGAL_NOTICE=confirm \
  -e QBT_WEBUI_PORT=8080 \
  -e QBT_TORRENTING_PORT=6881 \
  -e PUID=1000 \
  -e PGID=1000 \
  -p 8080:8080 \
  -p 6881:6881 \
  -p 6881:6881/udp \
  -v /tmp/qbittorrent-alpha/config:/config \
  -v /tmp/qbittorrent-alpha/downloads:/downloads \
  qbittorrentofficial/qbittorrent-nox:alpha
```

The alpha image prints a temporary WebUI password in `docker logs
qbittorrent-alpha`. Set the WebUI password to `adminadmin` before running the
integration tests.
