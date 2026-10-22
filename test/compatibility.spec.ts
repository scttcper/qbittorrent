import { createServer } from 'node:http';
import { text } from 'node:stream/consumers';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { QBittorrent } from '../src/index.js';
import type { AddTorrentOptions } from '../src/types.js';

let baseUrl: string;
let apiVersion = '2.16.2';
let appVersion = 'v5.3.0beta1';
let requests: string[] = [];
let requestCookies: Array<string | undefined> = [];
let responseCookies: string[] = [];
let addForm: FormData;
let editCategoryBody: URLSearchParams;
const server = createServer(async (req, res) => {
  requests.push(`${req.method} ${req.url}`);
  requestCookies.push(req.headers.cookie);
  if (req.url !== '/api/v2/auth/login' && responseCookies.length > 0) {
    res.setHeader('Set-Cookie', responseCookies);
  }

  switch (new URL(req.url!, 'http://localhost').pathname) {
    case '/api/v2/auth/login': {
      res.setHeader('Set-Cookie', 'QBT_SID=test; Max-Age=3600');
      res.end('Ok.');
      break;
    }
    case '/api/v2/app/version': {
      res.end(appVersion);
      break;
    }
    case '/api/v2/app/webapiVersion': {
      res.end(apiVersion);
      break;
    }
    case '/api/v2/torrents/add': {
      addForm = await new Response(await text(req), {
        headers: { 'Content-Type': req.headers['content-type']! },
      }).formData();
      res.end('Ok.');
      break;
    }
    case '/api/v2/torrents/info': {
      res.setHeader('Content-Type', 'application/json');
      res.end('[]');
      break;
    }
    case '/api/v2/torrents/stop':
    case '/api/v2/torrents/start':
    case '/api/v2/torrents/pause':
    case '/api/v2/torrents/resume': {
      res.end();
      break;
    }
    case '/api/v2/torrents/editCategory': {
      editCategoryBody = new URLSearchParams(await text(req));
      res.end();
      break;
    }
    case '/api/v2/transfer/pauseSession':
    case '/api/v2/transfer/resumeSession': {
      res.writeHead(204).end();
      break;
    }
    default: {
      res.writeHead(404).end();
    }
  }
});

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP address');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server.listening) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

for (const method of ['addTorrent', 'addMagnet'] as const) {
  for (const [version, app, field] of [
    ['2.11.4', 'v4.6.7', 'skip_checking'],
    ['2.15.1', 'v5.2.3', 'skip_checking'],
    ['2.16.0', 'v5.3.0beta1', 'seedMode'],
    ['2.16.2', 'v5.3.0', 'seedMode'],
  ] as const) {
    it.each<Partial<AddTorrentOptions>>([
      { skip_checking: 'true' },
      { seedMode: true },
      { seedMode: false, skip_checking: 'true' },
      { seedMode: 'false' },
      {},
    ])(`${method} selects the seed field on ${app}: %j`, async options => {
      apiVersion = version;
      appVersion = app;
      requests = [];
      const client = new QBittorrent({ baseUrl, username: 'admin', password: 'test' });
      const result =
        method === 'addTorrent'
          ? await client.addTorrent('dGVzdA==', { ...options, paused: 'true' })
          : await client.addMagnet('magnet:?xt=urn:btih:test', { ...options, paused: 'true' });
      expect(result).toBe(true);
      const stoppedField = app.startsWith('v4.') ? 'paused' : 'stopped';
      expect(addForm.get(stoppedField)).toBe('true');
      expect(addForm.has(stoppedField === 'paused' ? 'stopped' : 'paused')).toBe(false);
      const value = options.seedMode ?? options.skip_checking;
      expect(addForm.get(field)).toBe(value === undefined ? null : String(value));
      expect(addForm.has(field === 'seedMode' ? 'skip_checking' : 'seedMode')).toBe(false);
      expect(requests[0]).toBe('POST /api/v2/auth/login');
      expect(requests.at(-1)).toBe('POST /api/v2/torrents/add');
      expect(requests.includes('GET /api/v2/app/webapiVersion')).toBe(value !== undefined);
    });
  }
}

for (const [version, savePath, expected] of [
  ['2.15.1', undefined, ''],
  ['2.15.1', '/data', '/data'],
  ['2.16.2', undefined, null],
  ['2.16.2', '', ''],
  ['2.16.2', '/data', '/data'],
] as const) {
  it(`editCategory sends savePath ${JSON.stringify(expected)} on WebAPI ${version} when given ${JSON.stringify(savePath)}`, async () => {
    apiVersion = version;
    requests = [];
    const client = new QBittorrent({ baseUrl, username: 'admin', password: 'test' });
    expect(await client.editCategory('movies', savePath, { ratioLimit: 2 })).toBe(true);
    expect(editCategoryBody.get('category')).toBe('movies');
    expect(editCategoryBody.get('savePath')).toBe(expected);
    expect(editCategoryBody.get('ratioLimit')).toBe('2');
    expect(requests.includes('GET /api/v2/app/webapiVersion')).toBe(savePath === undefined);
  });
}

for (const [app, stop, start, filter] of [
  ['v4.6.7', 'pause', 'resume', 'paused'],
  ['v5.3.0', 'stop', 'start', 'stopped'],
] as const) {
  for (const auth of [{ apiKey: 'test' }, { username: 'admin', password: 'test' }]) {
    it(`picks the ${app} endpoints on the first request with ${'apiKey' in auth ? 'an API key' : 'a password'}`, async () => {
      appVersion = app;
      requests = [];
      // a new client each time so every call is the first request
      await new QBittorrent({ baseUrl, ...auth }).stopTorrent('all');
      await new QBittorrent({ baseUrl, ...auth }).startTorrent('all');
      await new QBittorrent({ baseUrl, ...auth }).listTorrents({ filter: 'paused' });
      expect(requests.filter(request => request.includes('/torrents/'))).toEqual([
        `POST /api/v2/torrents/${stop}`,
        `POST /api/v2/torrents/${start}`,
        `GET /api/v2/torrents/info?filter=${filter}`,
      ]);
      expect(requests.filter(request => request.endsWith('/app/version'))).toHaveLength(3);
    });
  }
}

it('getAppVersion stores the version for API key clients', async () => {
  appVersion = 'v5.3.0';
  requests = [];
  const client = new QBittorrent({ baseUrl, apiKey: 'test' });
  expect(await client.getAppVersion()).toBe('v5.3.0');
  expect(client.state.version).toEqual({ version: 'v5.3.0', isVersion5OrHigher: true });
  await client.stopTorrent('all');
  expect(requests).toEqual(['GET /api/v2/app/version', 'POST /api/v2/torrents/stop']);
});

it('keeps the session cookie qBittorrent sends after the login', async () => {
  apiVersion = '2.16.2';
  requestCookies = [];
  const client = new QBittorrent({ baseUrl, username: 'admin', password: 'test' });
  await client.getAppVersion();
  expect(client.state.auth?.sid).toBe('test');

  // qBittorrent starts a new session from Basic auth once ours is evicted
  responseCookies = ['other=ignored', 'QBT_SID=renewed; Max-Age=60'];
  try {
    await client.getApiVersion();
  } finally {
    responseCookies = [];
  }

  await client.getApiVersion();
  expect(client.state.auth?.sid).toBe('renewed');
  expect(client.state.auth?.expires.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  expect(requestCookies.at(-1)).toBe('QBT_SID=renewed');
});

it('ignores session cookies when using an API key', async () => {
  const client = new QBittorrent({ baseUrl, apiKey: 'test' });
  responseCookies = ['QBT_SID=renewed; Max-Age=60'];
  try {
    await client.getApiVersion();
  } finally {
    responseCookies = [];
  }

  expect(client.state.auth).toBe(undefined);
});

it('pauses and resumes the session using POST and accepts empty responses', async () => {
  requests = [];
  const client = new QBittorrent({ baseUrl, apiKey: 'test' });
  expect(await client.pauseSession()).toBe(true);
  expect(await client.resumeSession()).toBe(true);
  expect(requests.slice(-2)).toEqual([
    'POST /api/v2/transfer/pauseSession',
    'POST /api/v2/transfer/resumeSession',
  ]);
});
