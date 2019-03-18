/* eslint-disable @typescript-eslint/camelcase */
export interface BuildInfo {
  /**
   * 	QT version
   */
  qt: string;
  /**
   * 	libtorrent version
   */
  libtorrent: string;
  /**
   * 	Boost version
   */
  boost: string;
  /**
   * 	OpenSSL version
   */
  openssl: string;
  /**
   * 	Application bitness (e.g. 64-bit)
   */
  bitness: string;
}

export type TorrentFilters =
  | 'all'
  | 'downloading'
  | 'completed'
  | 'paused'
  | 'active'
  | 'inactive'
  | 'resumed';

export interface Torrent {
  /**
   * Torrent name
   */
  name: string;
  hash: string;
  magnet_uri: string;
  /**
   * Torrent size
   */
  size: number;
  /**
   * Torrent progress
   */
  progress: number;
  /**
   * Torrent download speed
   */
  dlspeed: number;
  /**
   * Torrent upload speed
   */
  upspeed: number;
  /**
   * Torrent priority (-1 if queuing is disabled)
   */
  priority: number;
  /**
   * Torrent seeds connected to
   */
  num_seeds: number;
  /**
   * Torrent seeds in the swarm
   */
  num_complete: number;
  /**
   * Torrent leechers connected to
   */
  num_leechs: number;
  /**
   * Torrent leechers in the swarm
   */
  num_incomplete: number;
  /**
   * Torrent share ratio
   */
  ratio: number;
  /**
   * Torrent ETA
   */
  eta: number;
  /**
   * Torrent state
   */
  state: TorrentState;
  /**
   * Torrent sequential download state
   */
  seq_dl: boolean;
  /**
   * Torrent first last piece priority state
   */
  f_l_piece_prio: boolean;
  /**
   * Torrent copletion time
   */
  completion_on: number;
  /**
   * Torrent tracker
   */
  tracker: string;
  /**
   * Torrent download limit
   */
  dl_limit: number;
  /**
   * Torrent upload limit
   */
  up_limit: number;
  /**
   * Amount of data downloaded
   */
  downloaded: number;
  /**
   * Amount of data uploaded
   */
  uploaded: number;
  /**
   * Amount of data downloaded since program open
   */
  downloaded_session: number;
  /**
   * Amount of data uploaded since program open
   */
  uploaded_session: number;
  /**
   * Amount of data left to download
   */
  amount_left: number;
  /**
   * Torrent save path
   */
  save_path: string;
  /**
   * Amount of data completed
   */
  completed: number;
  /**
   * Upload max share ratio
   */
  max_ratio: number;
  /**
   * Upload max seeding time
   */
  max_seeding_time: number;
  /**
   * Upload share ratio limit
   */
  ratio_limit: number;
  /**
   * Upload seeding time limit
   */
  seeding_time_limit: number;
  /**
   * Indicates the time when the torrent was last seen complete/whole
   */
  seen_complete: number;
  /**
   * Last time when a chunk was downloaded/uploaded
   */
  last_activity: number;
  /**
   * Size including unwanted data
   */
  total_size: number;
  time_active: number;
}

export enum TorrentState {
  /**
   * Some error occurred, applies to paused torrents
   */
  Error = 'error',
  /**
   * Torrent is paused and has finished downloading
   */
  PausedUP = 'pausedUP',
  /**
   * Torrent is paused and has NOT finished downloading
   */
  PausedDL = 'pausedDL',
  /**
   * Queuing is enabled and torrent is queued for upload
   */
  QueuedUP = 'queuedUP',
  /**
   * Queuing is enabled and torrent is queued for download
   */
  QueuedDL = 'queuedDL',
  /**
   * Torrent is being seeded and data is being transferred
   */
  Uploading = 'uploading',
  /**
   * Torrent is being seeded, but no connection were made
   */
  StalledUP = 'stalledUP',
  /**
   * Torrent has finished downloading and is being checked; this status also applies to preallocation (if enabled) and checking resume data on qBt startup
   */
  CheckingUP = 'checkingUP',
  /**
   * Same as checkingUP, but torrent has NOT finished downloading
   */
  CheckingDL = 'checkingDL',
  /**
   * Torrent is being downloaded and data is being transferred
   */
  Downloading = 'downloading',
  /**
   * Torrent is being downloaded, but no connection were made
   */
  StalledDL = 'stalledDL',
  /**
   * Torrent has just started downloading and is fetching metadata
   */
  MetaDL = 'metaDL',
}

export interface TorrentProperties {
  /**
   * Torrent save path
   */
  save_path: string;
  /**
   * Torrent creation date (Unix timestamp)
   */
  creation_date: number;
  /**
   * Torrent piece size (bytes)
   */
  piece_size: number;
  /**
   * Torrent comment
   */
  comment: string;
  /**
   * Total data wasted for torrent (bytes)
   */
  total_wasted: number;
  /**
   * Total data uploaded for torrent (bytes)
   */
  total_uploaded: number;
  /**
   * Total data uploaded this session (bytes)
   */
  total_uploaded_session: number;
  /**
   * Total data uploaded for torrent (bytes)
   */
  total_downloaded: number;
  /**
   * Total data downloaded this session (bytes)
   */
  total_downloaded_session: number;
  /**
   * Torrent upload limit (bytes/s)
   */
  up_limit: number;
  /**
   * Torrent download limit (bytes/s)
   */
  dl_limit: number;
  /**
   * Torrent elapsed time (seconds)
   */
  time_elapsed: number;
  /**
   * Torrent elapsed time while complete (seconds)
   */
  seeding_time: number;
  /**
   * Torrent connection count
   */
  nb_connections: number;
  /**
   * Torrent connection count limit
   */
  nb_connections_limit: number;
  /**
   * Torrent share ratio
   */
  share_ratio: number;
  /**
   * When this torrent was added (unix timestamp)
   */
  addition_date: number;
  /**
   * Torrent completion date (unix timestamp)
   */
  completion_date: number;
  /**
   * Torrent creator
   */
  created_by: string;
  /**
   * Torrent average download speed (bytes/second)
   */
  dl_speed_avg: number;
  /**
   * Torrent download speed (bytes/second)
   */
  dl_speed: number;
  /**
   * Torrent ETA (seconds)
   */
  eta: number;
  /**
   * Last seen complete date (unix timestamp)
   */
  last_seen: number;
  /**
   * Number of peers connected to
   */
  peers: number;
  /**
   * Number of peers in the swarm
   */
  peers_total: number;
  /**
   * Number of pieces owned
   */
  pieces_have: number;
  /**
   * Number of pieces of the torrent
   */
  pieces_num: number;
  /**
   * Number of seconds until the next announce
   */
  reannounce: number;
  /**
   * Number of seeds connected to
   */
  seeds: number;
  /**
   * Number of seeds in the swarm
   */
  seeds_total: number;
  /**
   * Torrent total size (bytes)
   */
  total_size: number;
  /**
   * Torrent average upload speed (bytes/second)
   */
  up_speed_avg: number;
  /**
   * Torrent upload speed (bytes/second)
   */
  up_speed: number;
}

export interface TorrentTrackers {
  /**
   * Tracker url
   */
  url: string;
  /**
   * Tracker status. See the table below for possible values
   */
  status: TorrentTrackerStatus;
  /**
   * Tracker priority tier. Lower tier trackers are tried before higher tiers
   */
  tier: number;
  /**
   * Number of peers for current torrent, as reported by the tracker
   */
  num_peers: number;
  /**
   * Number of seeds for current torrent, asreported by the tracker
   */
  num_seeds: number;
  /**
   * Number of leeches for current torrent, as reported by the tracker
   */
  num_leeches: number;
  /**
   * Number of completed downlods for current torrent, as reported by the tracker
   */
  num_downloaded: number;
  /**
   * Tracker message (there is no way of knowing what this message is - it's up to tracker admins)
   */
  msg: string;
}

export enum TorrentTrackerStatus {
  /**
   * Tracker is disabled (used for DHT, PeX, and LSD)
   */
  Disabled = 0,
  /**
   * Tracker has been contacted and is working
   */
  Working = 1,
  /**
   * Tracker is currently being updated
   */
  Updating = 2,
  /**
   * Tracker has been contacted, but it is not working (or doesn't send proper replies)
   */
  Errored = 3,
  /**
   * Tracker has not been contacted yet
   */
  Waiting = 4,
}

export interface WebSeed {
  /**
   * URL of the web seed
   */
  url: string;
}

export interface TorrentFile {
  /**
   * File name (including relative path)
   */
  name: string;
  /**
   * File size (bytes)
   */
  size: number;
  /**
   * File progress (percentage/100)
   */
  progress: number;
  /**
   * File priority. See possible values here below
   */
  priority: number;
  /**
   * True if file is seeding/complete
   */
  is_seed: boolean;
  /**
   * array	The first number is the starting piece index and the second number is the ending piece index (inclusive)
   */
  piece_range: [number, number];
  /**
   * Percentage of file pieces currently available
   */
  availability: number;
}

export enum TorrentFilePriority {
  /**
   * Do not download
   */
  Skip = 0,
  /**
   * Normal priority
   */
  NormalPriority = 1,
  /**
   * High priority
   */
  HighPriority = 6,
  /**
   * Maximal priority
   */
  MaxPriority = 7,
}

export enum TorrentPieceState {
  /**
   * Not downloaded yet
   */
  NotDownloaded = 0,
  /**
   * Now downloading
   */
  Requested = 1,
  /**
   * Already downloaded
   */
  Downloaded = 2,
}

export interface AddTorrentOptions {
  /**
   * Download folder
   */
  savepath: string;
  /**
   * Category for the torrent
   */
  category: string;
  /**
   * Skip hash checking. Possible values are true, false (default)
   */
  skip_checking: string;
  /**
   * Add torrents in the paused state. Possible values are true, false (default)
   */
  paused: string;
  /**
   * Create the root folder. Possible values are true, false, unset (default)
   */
  root_folder: string;
  /**
   * Rename torrent
   */
  rename: string;
  /**
   * Set torrent upload speed limit. Unit in bytes/second
   */
  upLimit: number;
  /**
   * Set torrent download speed limit. Unit in bytes/second
   */
  dlLimit: number;
  /**
   * Whether Automatic Torrent Management should be used
   */
  useAutoTMM: boolean;
  /**
   * Enable sequential download. Possible values are true, false (default)
   */
  sequentialDownload: string;
  /**
   * Prioritize download first last piece. Possible values are true, false (default)
   */
  firstLastPiecePrio: string;
}
