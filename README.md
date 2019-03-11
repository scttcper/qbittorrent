# qBittorrent [![npm](https://img.shields.io/npm/v/@ctrl/qbittorrent.svg?maxAge=3600)](https://www.npmjs.com/package/@ctrl/qbittorrent) [![CircleCI](https://circleci.com/gh/TypeCtrl/qbittorrent.svg?style=svg)](https://circleci.com/gh/TypeCtrl/qbittorrent) [![coverage status](https://codecov.io/gh/typectrl/qbittorrent/branch/master/graph/badge.svg)](https://codecov.io/gh/typectrl/qbittorrent)

> TypeScript api wrapper for [qBittorrent](https://www.qbittorrent.org/) using [got](https://github.com/sindresorhus/got)

### Install

```console
npm install @ctrl/qbittorrent
```

### Use

```ts
import { QBittorrent } from '@ctrl/qbittorrent';

const qbittorrent = new QBittorrent({
  baseUrl: 'http://localhost:8080/',
  username: 'admin',
  password: 'adminadmin',
});

async function main() {
  const res = await qbittorrent.getAllData();
  console.log(res.result);
}
```

### API

Docs: https://typectrl.github.io/qbittorrent/classes/qbittorrent.html

### See Also
transmission - https://github.com/TypeCtrl/transmission
