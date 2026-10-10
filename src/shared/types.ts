export type CoreType = 'sing-box' | 'xray';
export type ConnectionMode = 'tun' | 'system-proxy' | 'manual';
export type RouteMode = 'rule' | 'global' | 'direct';
export type ProtocolType = 'vless' | 'vmess' | 'trojan' | 'shadowsocks';

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProtocolType;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  network?: 'tcp' | 'ws' | 'grpc' | 'http';
  security?: 'tls' | 'reality' | 'none';
  sni?: string;
  flow?: string;
  publicKey?: string;
  shortId?: string;
  fingerprint?: string;
  path?: string;
  serviceName?: string;
  alterId?: number;
  latency?: number;
  subscriptionId?: string;
  rawUri?: string;
}

export interface Subscription {
  id: string;
  name: string;
  url: string;
  updatedAt?: string;
  nodeCount: number;
  autoUpdate?: boolean;
}

export interface AppSettings {
  language: 'auto' | 'ru' | 'en';
  activeCore: CoreType;
  connectionMode: ConnectionMode;
  routeMode: RouteMode;
  mixedPort: number;
  socksPort: number;
  httpPort: number;
  autoStartOnBoot: boolean;
  autoConnect: boolean;
  tunStack: 'mixed' | 'system' | 'gvisor';
  bypassLAN: boolean;
  bypassDomestic: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  activeNodeId: string | null;
  activeCore: CoreType;
  uptimeSeconds: number;
  uploadSpeed: number; // bytes/sec
  downloadSpeed: number; // bytes/sec
  totalUploaded: number;
  totalDownloaded: number;
  coreRunning: boolean;
  coreError: string | null;
}

export interface IpcApi {
  getState: () => Promise<{
    connection: ConnectionState;
    settings: AppSettings;
    nodes: ProxyNode[];
    subscriptions: Subscription[];
  }>;
  connect: (nodeId?: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean; error?: string }>;
  selectNode: (nodeId: string) => Promise<boolean>;
  addNode: (linkOrData: string | Partial<ProxyNode>) => Promise<{ success: boolean; node?: ProxyNode; error?: string }>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  pingNode: (nodeId: string) => Promise<number>;
  pingAllNodes: () => Promise<Record<string, number>>;
  addSubscription: (name: string, url: string) => Promise<{ success: boolean; subscription?: Subscription; count?: number; error?: string }>;
  updateSubscription: (id: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  deleteSubscription: (id: string) => Promise<boolean>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getLogs: () => Promise<string[]>;
  clearLogs: () => Promise<boolean>;
  getLogFilePath: () => Promise<string>;
  openLogFile: () => Promise<string>;
  openLogDir: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  checkCores: () => Promise<{ singBox: boolean; xray: boolean }>;
  readClipboard: () => Promise<string>;
  importFromClipboard: () => Promise<{ success: boolean; count?: number; error?: string }>;
}
