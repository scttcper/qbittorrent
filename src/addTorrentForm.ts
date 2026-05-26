import { FormData } from 'node-fetch-native';
import { base64ToUint8Array } from 'uint8array-extras';

import type { AddMagnetOptions, AddTorrentOptions } from './types.js';

type AddTorrentFormSource =
  | {
      type: 'torrent';
      torrent: string | Uint8Array<ArrayBuffer>;
    }
  | {
      type: 'magnet';
      urls: string;
    };

type AddTorrentFormOptions = Partial<AddTorrentOptions> | Partial<AddMagnetOptions>;
type AddTorrentFormFields = Partial<AddTorrentOptions & AddMagnetOptions>;

export function buildAddTorrentForm({
  source,
  options,
  isVersion5OrHigher,
}: {
  source: AddTorrentFormSource;
  options: AddTorrentFormOptions;
  isVersion5OrHigher: boolean;
}): FormData {
  const form = new FormData();
  const { filename, fields } = normalizeAddTorrentFormOptions(options, isVersion5OrHigher);

  if (source.type === 'magnet') {
    form.append('urls', source.urls);
  } else {
    const type = { type: 'application/x-bittorrent' };
    const fileName = filename ?? (typeof source.torrent === 'string' ? 'file.torrent' : 'torrent');
    const file =
      typeof source.torrent === 'string'
        ? new File([base64ToUint8Array(source.torrent)], fileName, type)
        : new File([source.torrent], fileName, type);
    form.set('file', file);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      form.append(key, `${value}`);
    }
  }

  return form;
}

function normalizeAddTorrentFormOptions(
  options: AddTorrentFormOptions,
  isVersion5OrHigher: boolean,
): {
  filename?: string;
  fields: AddTorrentFormFields;
} {
  const fields: AddTorrentFormFields = { ...options };

  // filename is only used for the uploaded File object, not sent as a form field.
  const { filename } = fields;
  delete fields.filename;

  // qBittorrent v5 renamed the add-torrent paused option to stopped.
  if (isVersion5OrHigher && 'paused' in fields) {
    fields.stopped = fields.paused;
    delete fields.paused;
  }

  // Automatic Torrent Management ignores savepath.
  if (fields.useAutoTMM === 'true') {
    fields.savepath = '';
  } else {
    fields.useAutoTMM = 'false';
  }

  return { filename, fields };
}
