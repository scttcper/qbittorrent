export interface BuildInfo {
  /**
   * QT version
   */
  qt: string;
  /**
   * libtorrent version
   */
  libtorrent: string;
  /**
   * Boost version
   */
  boost: string;
  /**
   * OpenSSL version
   */
  openssl: string;
  /**
   * Application bitness (e.g. 64-bit)
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
  | 'resumed'
  | 'stalled'
  | 'stalled_uploading'
  | 'stalled_downloading';

export interface Torrent {
  /**
   * Torrent name
   */
  name: string;
  hash: string;
  magnet_uri: string;
  /**
   * datetime in seconds
   */
  added_on: number;
  /**
   * Torrent size
   */
  size: number;
  /**
   * Torrent progress
   */
  progress: number;
  /**
   * Torrent download speed (bytes/s)
   */
  dlspeed: number;
  /**
   * Torrent upload speed (bytes/s)
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
   * Torrent copletion datetime in seconds
   */
  completion_on: number;
  /**
   * Torrent tracker
   */
  tracker: string;
  trackers_count: number;
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
   * True if super seeding is enabled
   */
  super_seeding: boolean;
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
  /**
   * Category name
   */
  category: string;
  /**
   * Comma-concatenated tag list of the torrent e.g. - "abc, 123"
   */
  tags: string;
}

export type TorrentCategories = Record<string, Category>;
interface Category {
  name: string;
  savePath: string;
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
   * Torrent is forced to downloading to ignore queue limit
   */
  ForcedDL = 'forcedDL',
  /**
   * Forced Downloading Metadata
   */
  ForcedMetaDL = 'ForcedMetaDL',
  /**
   * Torrent is forced to uploading and ignore queue limit
   */
  ForcedUP = 'forcedUP',
  /**
   * Torrent has just started downloading and is fetching metadata
   */
  MetaDL = 'metaDL',
  /**
   * Torrent is allocating disk space for download
   */
  Allocating = 'allocating',
  QueuedForChecking = 'queuedForChecking',
  /**
   * Checking resume data on qBt startup
   */
  CheckingResumeData = 'checkingResumeData',
  /**
   * Torrent is moving to another location
   */
  Moving = 'moving',
  /**
   * Unknown status
   */
  Unknown = 'unknown',
  /**
   * Torrent data files is missing
   */
  MissingFiles = 'missingFiles',
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
   * Tracker has not been contacted yet
   */
  Waiting = 1,
  /**
   * Tracker has been contacted and is working
   */
  Working = 2,
  /**
   * Tracker is updating
   */
  Updating = 3,
  /**
   * Tracker has been contacted, but it is not working (or doesn't send proper replies)
   */
  Errored = 4,
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

type TrueFalseStr = 'true' | 'false';

export interface AddTorrentOptions {
  /**
   * not totally sure what its for but its required
   * NOTE: not included in deluge options blob. This should be removed and passed in seperatly.
   * Added to AddTorrentOptions to make the api's more similar with other clients
   * default: torrent
   */
  filename: string;
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
  skip_checking: TrueFalseStr;
  /**
   * Add torrents in the paused state. Possible values are true, false (default)
   */
  paused: TrueFalseStr;
  /**
   * Control filesystem structure for content (added in Web API v2.7)
   * Migrating from rootFolder example rootFolder ? 'Original' :  'NoSubfolder'
   */
  contentLayout: 'Original' | 'Subfolder' | 'NoSubfolder';
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
   * Set torrent share ratio limit
   */
  ratioLimit: number;
  /**
   * Set torrent seeding time limit. Unit in seconds
   */
  seedingTimeLimit: number;
  /**
   * Whether Automatic Torrent Management should be used, disables use of savepath
   */
  useAutoTMM: TrueFalseStr;
  /**
   * Enable sequential download. Possible values are true, false (default)
   */
  sequentialDownload: TrueFalseStr;
  /**
   * Prioritize download first last piece. Possible values are true, false (default)
   */
  firstLastPiecePrio: TrueFalseStr;
}

export interface AddMagnetOptions {
  savepath: string;
  cookie: string;
  /**
   * Category for the torrent
   */
  category: string;
  /**
   * Skip hash checking. Possible values are true, false (default)
   */
  skip_checking: TrueFalseStr;
  /**
   * Add torrents in the paused state. Possible values are true, false (default)
   */
  paused: TrueFalseStr;
  /**
   * Create the root folder. Possible values are true, false, unset (default)
   */
  root_folder: TrueFalseStr;
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
   * Whether Automatic Torrent Management should be used, disables use of savepath
   */
  useAutoTMM: TrueFalseStr;
  /**
   * Enable sequential download. Possible values are true, false (default)
   */
  sequentialDownload: TrueFalseStr;
  /**
   * Prioritize download first last piece. Possible values are true, false (default)
   */
  firstLastPiecePrio: TrueFalseStr;
}

export interface Preferences {
  /**
   * Currently selected language (e.g. en_GB for English)
   */
  locale: string;
  /**
   * True if a subfolder should be created when adding a torrent
   */
  create_subfolder_enabled: boolean;
  /**
   * True if torrents should be added in a Paused state
   */
  start_paused_enabled: boolean;
  /**
   * TODO
   */
  auto_delete_mode: number;
  /**
   * True if disk space should be pre-allocated for all files
   */
  preallocate_all: boolean;
  /**
   * True if ".!qB" should be appended to incomplete files
   */
  incomplete_files_ext: boolean;
  /**
   * True if Automatic Torrent Management is enabled by default
   */
  auto_tmm_enabled: boolean;
  /**
   * True if torrent should be relocated when its Category changes
   */
  torrent_changed_tmm_enabled: boolean;
  /**
   * True if torrent should be relocated when the default save path changes
   */
  save_path_changed_tmm_enabled: boolean;
  /**
   * True if torrent should be relocated when its Category's save path changes
   */
  category_changed_tmm_enabled: boolean;
  /**
   * Default save path for torrents, separated by slashes
   */
  save_path: string;
  /**
   * True if folder for incomplete torrents is enabled
   */
  temp_path_enabled: boolean;
  /**
   * Path for incomplete torrents, separated by slashes
   */
  temp_path: string;
  /**
   * Directory to watch for torrent files, value: where torrents loaded from this directory should be downloaded to (see list of possible values below). Slashes are used as path separators; multiple key/value pairs can be specified
   * Possible values of scan_dirs:
   * 0	Download to the monitored folder
   * 1	Download to the default save path
   * "/path/to/download/to"	Download to this path
   */
  scan_dirs: Record<string, 0 | 1 | string>;
  /**
   * Path to directory to copy .torrent files to. Slashes are used as path separators
   */
  export_dir: string;
  /**
   * Path to directory to copy .torrent files of completed downloads to. Slashes are used as path separators
   */
  export_dir_fin: string;
  /**
   * True if e-mail notification should be enabled
   */
  mail_notification_enabled: boolean;
  /**
   * e-mail where notifications should originate from
   */
  mail_notification_sender: string;
  /**
   * e-mail to send notifications to
   */
  mail_notification_email: string;
  /**
   * smtp server for e-mail notifications
   */
  mail_notification_smtp: string;
  /**
   * True if smtp server requires SSL connection
   */
  mail_notification_ssl_enabled: boolean;
  /**
   * True if smtp server requires authentication
   */
  mail_notification_auth_enabled: boolean;
  /**
   * Username for smtp authentication
   */
  mail_notification_username: string;
  /**
   * Password for smtp authentication
   */
  mail_notification_password: string;
  /**
   * True if external program should be run after torrent has finished downloading
   */
  autorun_enabled: boolean;
  /**
   * Program path/name/arguments to run if autorun_enabled is enabled; path is separated by slashes; you can use %f and %n arguments, which will be expanded by qBittorent as path_to_torrent_file and torrent_name (from the GUI; not the .torrent file name) respectively
   */
  autorun_program: string;
  /**
   * True if torrent queuing is enabled
   */
  queueing_enabled: boolean;
  /**
   * Maximum number of active simultaneous downloads
   */
  max_active_downloads: number;
  /**
   * Maximum number of active simultaneous downloads and uploads
   */
  max_active_torrents: number;
  /**
   * Maximum number of active simultaneous uploads
   */
  max_active_uploads: number;
  /**
   * If true torrents w/o any activity (stalled ones) will not be counted towards max_active_* limits; see [dont_count_slow_torrents](https://www.libtorrent.org/reference-Settings.html#dont_count_slow_torrents) for more information
   */
  dont_count_slow_torrents: boolean;
  /**
   * Download rate in KiB/s for a torrent to be considered "slow"
   */
  slow_torrent_dl_rate_threshold: number;
  /**
   * Upload rate in KiB/s for a torrent to be considered "slow"
   */
  slow_torrent_ul_rate_threshold: number;
  /**
   * Seconds a torrent should be inactive before considered "slow"
   */
  slow_torrent_inactive_timer: number;
  /**
   * True if share ratio limit is enabled
   */
  max_ratio_enabled: boolean;
  /**
   * Get the global share ratio limit
   */
  max_ratio: number;
  /**
   * Action performed when a torrent reaches the maximum share ratio. See list of possible values here below.
   */
  max_ratio_act: boolean;
  /**
   * Port for incoming connections
   */
  listen_port: number;
  /**
   * True if UPnP/NAT-PMP is enabled
   */
  upnp: boolean;
  /**
   * True if the port is randomly selected
   */
  random_port: boolean;
  /**
   * Global download speed limit in KiB/s; -1 means no limit is applied
   */
  dl_limit: number;
  /**
   * Global upload speed limit in KiB/s; -1 means no limit is applied
   */
  up_limit: number;
  /**
   * Maximum global number of simultaneous connections
   */
  max_connec: number;
  /**
   * Maximum number of simultaneous connections per torrent
   */
  max_connec_per_torrent: number;
  /**
   * Maximum number of upload slots
   */
  max_uploads: number;
  /**
   * Maximum number of upload slots per torrent
   */
  max_uploads_per_torrent: number;
  /**
   * Timeout in seconds for a stopped announce request to trackers
   */
  stop_tracker_timeout: number;
  /**
   * True if the advanced libtorrent option piece_extent_affinity is enabled
   */
  enable_piece_extent_affinity: boolean;
  /**
   * Bittorrent Protocol to use
   * 0	TCP and μTP
   * 1	TCP
   * 2	μTP
   */
  bittorrent_protocol: 0 | 1 | 2;
  /**
   * True if [du]l_limit should be applied to uTP connections; this option is only available in qBittorent built against libtorrent version 0.16.X and higher
   */
  limit_utp_rate: boolean;
  /**
   * True if [du]l_limit should be applied to estimated TCP overhead (service data: e.g. packet headers)
   */
  limit_tcp_overhead: boolean;
  /**
   * True if [du]l_limit should be applied to peers on the LAN
   */
  limit_lan_peers: boolean;
  /**
   * Alternative global download speed limit in KiB/s
   */
  alt_dl_limit: number;
  /**
   * Alternative global upload speed limit in KiB/s
   */
  alt_up_limit: number;
  /**
   * True if alternative limits should be applied according to schedule
   */
  scheduler_enabled: boolean;
  /**
   * Scheduler starting hour
   */
  schedule_from_hour: number;
  /**
   * Scheduler starting minute
   */
  schedule_from_min: number;
  /**
   * Scheduler ending hour
   */
  schedule_to_hour: number;
  /**
   * Scheduler ending minute
   */
  schedule_to_min: number;
  /**
   * Scheduler days. See possible values here below
   * 0	Every day
   * 1	Every weekday
   * 2	Every weekend
   * 3	Every Monday
   * 4	Every Tuesday
   * 5	Every Wednesday
   * 6	Every Thursday
   * 7	Every Friday
   * 8	Every Saturday
   * 9	Every Sunday
   */
  scheduler_days: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  /**
   * True if DHT is enabled
   */
  dht: boolean;
  /**
   * True if PeX is enabled
   */
  pex: boolean;
  /**
   * True if LSD is enabled
   */
  lsd: boolean;
  /**
   * See list of possible values here below
   * 0	Prefer encryption
   * 1	Force encryption on
   * 2	Force encryption off
   */
  encryption: 0 | 1 | 2;
  /**
   * If true anonymous mode will be enabled; read more [here](https://github.com/qbittorrent/qBittorrent/wiki/Anonymous-Mode); this option is only available in qBittorent built against libtorrent version 0.16.X and higher
   */
  anonymous_mode: boolean;
  /**
   * See list of possible values here below
   */
  proxy_type: number;
  /**
   * Proxy IP address or domain name
   */
  proxy_ip: string;
  /**
   * Proxy port
   */
  proxy_port: number;
  /**
   * True if peer and web seed connections should be proxified; this option will have any effect only in qBittorent built against libtorrent version 0.16.X and higher
   */
  proxy_peer_connections: boolean;
  /**
   * True proxy requires authentication; doesn't apply to SOCKS4 proxies
   */
  proxy_auth_enabled: boolean;
  /**
   * Username for proxy authentication
   */
  proxy_username: string;
  /**
   * Password for proxy authentication
   */
  proxy_password: string;
  /**
   * True if proxy is only used for torrents
   */
  proxy_torrents_only: boolean;
  /**
   * True if external IP filter should be enabled
   */
  ip_filter_enabled: boolean;
  /**
   * Path to IP filter file (.dat, .p2p, .p2b files are supported); path is separated by slashes
   */
  ip_filter_path: string;
  /**
   * True if IP filters are applied to trackers
   */
  ip_filter_trackers: boolean;
  /**
   * Comma-separated list of domains to accept when performing Host header validation
   */
  web_ui_domain_list: string;
  /**
   * IP address to use for the WebUI
   */
  web_ui_address: string;
  /**
   * WebUI port
   */
  web_ui_port: number;
  /**
   * True if UPnP is used for the WebUI port
   */
  web_ui_upnp: boolean;
  /**
   * WebUI username
   */
  web_ui_username: string;
  /**
   * For API ≥ v2.3.0: Plaintext WebUI password, not readable, write-only. For API < v2.3.0: MD5 hash of WebUI password, hash is generated from the following string: username:Web UI Access:plain_text_web_ui_password
   */
  web_ui_password?: string;
  /**
   * True if WebUI CSRF protection is enabled
   */
  web_ui_csrf_protection_enabled: boolean;
  /**
   * True if WebUI clickjacking protection is enabled
   */
  web_ui_clickjacking_protection_enabled: boolean;
  /**
   * True if WebUI cookie Secure flag is enabled
   */
  web_ui_secure_cookie_enabled: boolean;
  /**
   * Maximum number of authentication failures before WebUI access ban
   */
  web_ui_max_auth_fail_count: number;
  /**
   * WebUI access ban duration in seconds
   */
  web_ui_ban_duration: number;
  /**
   * Seconds until WebUI is automatically signed off
   */
  web_ui_session_timeout: number;
  /**
   * True if WebUI host header validation is enabled
   */
  web_ui_host_header_validation_enabled: boolean;
  /**
   * True if authentication challenge for loopback address (127.0.0.1) should be disabled
   */
  bypass_local_auth: boolean;
  /**
   * True if webui authentication should be bypassed for clients whose ip resides within (at least) one of the subnets on the whitelist
   */
  bypass_auth_subnet_whitelist_enabled: boolean;
  /**
   * (White)list of ipv4/ipv6 subnets for which webui authentication should be bypassed; list entries are separated by commas
   */
  bypass_auth_subnet_whitelist: string;
  /**
   * True if an alternative WebUI should be used
   */
  alternative_webui_enabled: boolean;
  /**
   * File path to the alternative WebUI
   */
  alternative_webui_path: string;
  /**
   * True if WebUI HTTPS access is enabled
   */
  use_https: boolean;
  /**
   * SSL keyfile contents (this is a not a path)
   */
  ssl_key: string;
  /**
   * SSL certificate contents (this is a not a path)
   */
  ssl_cert: string;
  /**
   * For API ≥ v2.0.1: Path to SSL keyfile
   */
  web_ui_https_key_path: string;
  /**
   * For API ≥ v2.0.1: Path to SSL certificate
   */
  web_ui_https_cert_path: string;
  /**
   * True if server DNS should be updated dynamically
   */
  dyndns_enabled: boolean;
  /**
   * See list of possible values here below
   */
  dyndns_service: number;
  /**
   * Username for DDNS service
   */
  dyndns_username: string;
  /**
   * Password for DDNS service
   */
  dyndns_password: string;
  /**
   * Your DDNS domain name
   */
  dyndns_domain: string;
  /**
   * RSS refresh interval
   */
  rss_refresh_interval: number;
  /**
   * Max stored articles per RSS feed
   */
  rss_max_articles_per_feed: number;
  /**
   * Enable processing of RSS feeds
   */
  rss_processing_enabled: boolean;
  /**
   * Enable auto-downloading of torrents from the RSS feeds
   */
  rss_auto_downloading_enabled: boolean;
  /**
   * For API ≥ v2.5.1: Enable downloading of repack/proper Episodes
   */
  rss_download_repack_proper_episodes: boolean;
  /**
   * For API ≥ v2.5.1: List of RSS Smart Episode Filters
   */
  rss_smart_episode_filters: string;
  /**
   * Enable automatic adding of trackers to new torrents
   */
  add_trackers_enabled: boolean;
  /**
   * List of trackers to add to new torrent
   */
  add_trackers: string;
  /**
   * For API ≥ v2.5.1: Enable custom http headers
   */
  web_ui_use_custom_http_headers_enabled: boolean;
  /**
   * For API ≥ v2.5.1: List of custom http headers
   */
  web_ui_custom_http_headers: string;
  /**
   * True enables max seeding time
   */
  max_seeding_time_enabled: boolean;
  /**
   * Number of minutes to seed a torrent
   */
  max_seeding_time: number;
  /**
   * TODO
   */
  announce_ip: string;
  /**
   * True always announce to all tiers
   */
  announce_to_all_tiers: boolean;
  /**
   * True always announce to all trackers in a tier
   */
  announce_to_all_trackers: boolean;
  /**
   * Number of asynchronous I/O threads
   */
  async_io_threads: number;
  /**
   * List of banned IPs
   */
  banned_IPs: string;
  /**
   * Outstanding memory when checking torrents in MiB
   */
  checking_memory_use: number;
  /**
   * IP Address to bind to. Empty String means All addresses
   */
  current_interface_address: string;
  /**
   * Network Interface used
   */
  current_network_interface: string;
  /**
   * Disk cache used in MiB
   */
  disk_cache: number;
  /**
   * Disk cache expiry interval in seconds
   */
  disk_cache_ttl: number;
  /**
   * Port used for embedded tracker
   */
  embedded_tracker_port: number;
  /**
   * True enables coalesce reads & writes
   */
  enable_coalesce_read_write: boolean;
  /**
   * True enables embedded tracker
   */
  enable_embedded_tracker: boolean;
  /**
   * True allows multiple connections from the same IP address
   */
  enable_multi_connections_from_same_ip: boolean;
  /**
   * True enables os cache
   */
  enable_os_cache: boolean;
  /**
   * True enables sending of upload piece suggestions
   */
  enable_upload_suggestions: boolean;
  /**
   * File pool size
   */
  file_pool_size: number;
  /**
   * Maximal outgoing port (0: Disabled)
   */
  outgoing_ports_max: number;
  /**
   * Minimal outgoing port (0: Disabled)
   */
  outgoing_ports_min: number;
  /**
   * True rechecks torrents on completion
   */
  recheck_completed_torrents: boolean;
  /**
   * True resolves peer countries
   */
  resolve_peer_countries: boolean;
  /**
   * Save resume data interval in min
   */
  save_resume_data_interval: number;
  /**
   * Send buffer low watermark in KiB
   */
  send_buffer_low_watermark: number;
  /**
   * Send buffer watermark in KiB
   */
  send_buffer_watermark: number;
  /**
   * Send buffer watermark factor in percent
   */
  send_buffer_watermark_factor: number;
  /**
   * Socket backlog size
   */
  socket_backlog_size: number;
  /**
   * Upload choking algorithm used (see list of possible values below)
   */
  upload_choking_algorithm: number;
  /**
   * Upload slots behavior used (see list of possible values below)
   */
  upload_slots_behavior: number;
  /**
   * UPnP lease duration (0: Permanent lease)
   */
  upnp_lease_duration: number;
  /**
   * μTP-TCP mixed mode algorithm (see list of possible values below)
   */
  utp_tcp_mixed_mode: number;
}

export interface TorrentPeersResponse {
  full_update: boolean;
  peers: Peers;
  rid: number;
  show_flags: boolean;
}

type Peers = Record<string, TorrentPeer>;

export interface TorrentPeer {
  client?: string;
  connection?: string;
  country?: string;
  country_code?: string;
  dl_speed?: number;
  downloaded?: number;
  files?: string;
  flags?: string;
  flags_desc?: string;
  ip?: string;
  port?: number;
  progress?: number;
  relevance?: number;
  up_speed?: number;
  uploaded?: number;
}
