import type { AddTorrentResponse } from './types.js';

/**
 * Normalizes hashes
 * @returns hashes as string seperated by `|`
 */
export function normalizeHashes(hashes: string | string[]): string {
  if (Array.isArray(hashes)) {
    return hashes.join('|');
  }

  return hashes;
}

export function getAuthCookieName(setCookieHeader: string): string | undefined {
  const [cookiePair] = setCookieHeader.split(';', 1);
  return cookiePair?.split('=', 1)[0];
}

export function assertAddTorrentSucceeded(response: string): void {
  if (response === 'Fails.') {
    throw new Error('Failed to add torrent');
  }

  const result = parseAddTorrentResponse(response);
  if (result && result.failure_count > 0) {
    throw new Error('Failed to add torrent');
  }
}

export function objToUrlSearchParams(
  obj: Record<string, string | number | boolean>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    params.append(key, value.toString());
  }

  return params;
}

export function isGreater(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { numeric: true }) === 1;
}

function parseAddTorrentResponse(response: string): AddTorrentResponse | undefined {
  try {
    const parsed = JSON.parse(response) as Partial<AddTorrentResponse>;
    if (
      typeof parsed.success_count === 'number' &&
      typeof parsed.pending_count === 'number' &&
      typeof parsed.failure_count === 'number' &&
      Array.isArray(parsed.added_torrent_ids)
    ) {
      return parsed as AddTorrentResponse;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
