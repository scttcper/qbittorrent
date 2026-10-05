import { TorrentClientError } from '@ctrl/shared-torrent';

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

export function assertAddTorrentSucceeded(response: string): void {
  if (response === 'Fails.') {
    throw new TorrentClientError('Failed to add torrent', 'client_error');
  }

  const result = parseAddTorrentResponse(response);
  if (result && result.failure_count > 0) {
    throw new TorrentClientError('Failed to add torrent', 'client_error');
  }
}

export function objToUrlSearchParams(
  obj: Record<string, string | number | boolean | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    // optional options can be passed explicitly as undefined
    if (value === undefined) {
      continue;
    }

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
