import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { AppSettings, ProxyNode, Subscription } from '../shared/types';

export interface DataStore {
  settings: AppSettings;
  nodes: ProxyNode[];
  subscriptions: Subscription[];
  activeNodeId: string | null;
  hwid: string;
}

const defaultSettings: AppSettings = {
  language: 'auto',
  activeCore: 'sing-box',
  connectionMode: 'tun',
  routeMode: 'rule',
  mixedPort: 20880,
  socksPort: 20881,
  httpPort: 20882,
  autoStartOnBoot: false,
  autoConnect: false,
  tunStack: 'mixed',
  bypassLAN: true,
  bypassDomestic: true,
};

export class StoreManager {
  private filePath: string;
  private data: DataStore;

  constructor() {
    let baseDir = process.cwd();
    try {
      if (app && app.getPath) {
        baseDir = app.getPath('userData');
      }
    } catch (e) {
      // Dev mode fallback
    }
    this.filePath = path.join(baseDir, 'pulse-store.json');
    this.data = this.load();
    if (!this.data.hwid) {
      this.data.hwid = crypto.randomBytes(16).toString('hex');
      this.save();
    }
  }

  private load(): DataStore {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
          nodes: (parsed.nodes || []).filter((n: any) => n.server !== '0.0.0.0' && n.port !== 1),
          subscriptions: parsed.subscriptions || [],
          activeNodeId: parsed.activeNodeId || null,
          hwid: parsed.hwid || crypto.randomBytes(16).toString('hex'),
        };
      }
    } catch (e) {
      console.error('Failed to load store from file:', e);
    }

    return {
      settings: defaultSettings,
      nodes: [],
      subscriptions: [],
      activeNodeId: null,
      hwid: crypto.randomBytes(16).toString('hex'),
    };
  }

  public getHwid(): string {
    return this.data.hwid;
  }

  public save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save store to file:', e);
    }
  }

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }

  public getNodes(): ProxyNode[] {
    return this.data.nodes;
  }

  public getNodeById(id: string): ProxyNode | undefined {
    return this.data.nodes.find(n => n.id === id);
  }

  public addNode(node: ProxyNode): void {
    const idx = this.data.nodes.findIndex(n => n.id === node.id);
    if (idx >= 0) {
      this.data.nodes[idx] = node;
    } else {
      this.data.nodes.push(node);
    }
    if (!this.data.activeNodeId) {
      this.data.activeNodeId = node.id;
    }
    this.save();
  }

  public addNodes(nodes: ProxyNode[]): void {
    for (const node of nodes) {
      const idx = this.data.nodes.findIndex(n => n.id === node.id);
      if (idx >= 0) {
        this.data.nodes[idx] = node;
      } else {
        this.data.nodes.push(node);
      }
    }
    if (!this.data.activeNodeId && this.data.nodes.length > 0) {
      this.data.activeNodeId = this.data.nodes[0].id;
    }
    this.save();
  }

  public deleteNode(id: string): boolean {
    const before = this.data.nodes.length;
    this.data.nodes = this.data.nodes.filter(n => n.id !== id);
    if (this.data.activeNodeId === id) {
      this.data.activeNodeId = this.data.nodes.length > 0 ? this.data.nodes[0].id : null;
    }
    this.save();
    return this.data.nodes.length < before;
  }

  public deleteNodesBySubscription(subscriptionId: string): void {
    this.data.nodes = this.data.nodes.filter(n => n.subscriptionId !== subscriptionId);
    if (this.data.nodes.every(n => n.id !== this.data.activeNodeId)) {
      this.data.activeNodeId = this.data.nodes.length > 0 ? this.data.nodes[0].id : null;
    }
    this.save();
  }

  public getSubscriptions(): Subscription[] {
    return this.data.subscriptions;
  }

  public addSubscription(sub: Subscription): void {
    const idx = this.data.subscriptions.findIndex(s => s.id === sub.id);
    if (idx >= 0) {
      this.data.subscriptions[idx] = sub;
    } else {
      this.data.subscriptions.push(sub);
    }
    this.save();
  }

  public deleteSubscription(id: string): boolean {
    this.data.subscriptions = this.data.subscriptions.filter(s => s.id !== id);
    this.deleteNodesBySubscription(id);
    this.save();
    return true;
  }

  public getActiveNodeId(): string | null {
    return this.data.activeNodeId;
  }

  public setActiveNodeId(id: string | null): void {
    this.data.activeNodeId = id;
    this.save();
  }

  public updateNodeLatency(nodeId: string, latency: number): void {
    const node = this.data.nodes.find(n => n.id === nodeId);
    if (node) {
      node.latency = latency;
      this.save();
    }
  }
}
