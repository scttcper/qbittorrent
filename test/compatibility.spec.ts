import { createServer } from 'node:http';
import { text } from 'node:stream/consumers';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { QBittorrent } from '../src/index.js';
import type { AddTorrentOptions } from '../src/types.js';

let baseUrl: string;
let apiVersion = '2.16.2';
let appVersion = 'v5.3.0beta1';
let requests: string[] = [];
let addForm: FormData;
const server = createServer(async (req, res) => {
  requests.push(`${req.method} ${req.url}`);
  switch (req.url) {
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
