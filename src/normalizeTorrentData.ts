import {
  type NormalizedTorrent,
  TorrentState as NormalizedTorrentState,
} from '@ctrl/shared-torrent';

import { type Torrent, TorrentState } from './types.js';

export function normalizeTorrentData(torrent: Torrent): NormalizedTorrent {
  let state = NormalizedTorrentState.unknown;
  let stateMessage = '';
  let { eta } = torrent;

  /**
   * Good references https://github.com/qbittorrent/qBittorrent/blob/master/src/webui/www/private/scripts/dynamicTable.js#L933
   * https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/Download/Clients/QBittorrent/QBittorrent.cs#L242
   */
  switch (torrent.state) {
    case TorrentState.Error: {
      state = NormalizedTorrentState.warning;
      stateMessage = 'qBittorrent is reporting an error';
      break;
    }
    case TorrentState.PausedDL:
    case TorrentState.StoppedDL: {
      state = NormalizedTorrentState.paused;
      break;
    }
    case TorrentState.QueuedDL: // queuing is enabled and torrent is queued for download
    case TorrentState.CheckingDL: // same as checkingUP, but torrent has NOT finished downloading
    case TorrentState.CheckingUP: { // torrent has finished downloading and is being checked. Set when `recheck torrent on completion` is enabled. In the event the check fails we shouldn't treat it as completed.
      state = NormalizedTorrentState.queued;
      break;
    }
    case TorrentState.MetaDL: // Metadl could be an error if DHT is not enabled
    case TorrentState.ForcedDL: // torrent is being downloaded, and was forced started
    case TorrentState.ForcedMetaDL: // torrent metadata is being forcibly downloaded
    case TorrentState.Downloading: { // torrent is being downloaded and data is being transferred
      state = NormalizedTorrentState.downloading;
      break;
    }
    case TorrentState.Allocating: {
      // state = 'stalledDL';
      state = NormalizedTorrentState.queued;
      break;
    }
    case TorrentState.StalledDL: {
      state = NormalizedTorrentState.warning;
      stateMessage = 'The download is stalled with no connection';
      break;
    }
    case TorrentState.StoppedUP: // torrent is paused and has finished downloading
    case TorrentState.PausedUP: // torrent is paused and has finished downloading
    case TorrentState.Uploading: // torrent is being seeded and data is being transferred
    case TorrentState.StalledUP: // torrent is being seeded, but no connection were made
    case TorrentState.QueuedUP: // queuing is enabled and torrent is queued for upload
    case TorrentState.ForcedUP: { // torrent has finished downloading and is being forcibly seeded
      // state = 'completed';
      state = NormalizedTorrentState.seeding;
      eta = 0; // qBittorrent sends eta=8640000 for completed torrents
      break;
    }
    case TorrentState.Moving: // torrent is being moved from a folder
    case TorrentState.QueuedForChecking:
    case TorrentState.CheckingResumeData: {
      state = NormalizedTorrentState.checking;
      break;
    }
    case TorrentState.Unknown: {
      state = NormalizedTorrentState.error;
      break;
    }
    case TorrentState.MissingFiles: {
      state = NormalizedTorrentState.error;
      stateMessage = 'The download is missing files';
      break;
    }
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    default: {
      break;
    }
  }

  const isCompleted = torrent.progress === 1;

  const result: NormalizedTorrent = {
    id: torrent.hash,
    name: torrent.name,
    stateMessage,
    state,
    eta,
    dateAdded: new Date(torrent.added_on * 1000).toISOString(),
    isCompleted,
    progress: torrent.progress,
    label: torrent.category,
    tags: torrent.tags.split(', '),
    dateCompleted: new Date(torrent.completion_on * 1000).toISOString(),
    savePath: torrent.save_path,
    uploadSpeed: torrent.upspeed,
    downloadSpeed: torrent.dlspeed,
    queuePosition: torrent.priority,
    connectedPeers: torrent.num_leechs,
    connectedSeeds: torrent.num_seeds,
    totalPeers: torrent.num_incomplete,
    totalSeeds: torrent.num_complete,
    totalSelected: torrent.size,
    totalSize: torrent.total_size,
    totalUploaded: torrent.uploaded,
    totalDownloaded: torrent.downloaded,
    ratio: torrent.ratio,
    raw: torrent,
  };
  return result;
}
