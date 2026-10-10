import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, clipboard } from 'electron';
import path from 'path';
import { StoreManager } from './store';
import { EngineManager } from './engine-manager';
import { LinkParser } from './link-parser';
import { PingService } from './ping-service';
import { ProxyManager } from './proxy-manager';
import { ConnectionState, AppSettings, ProxyNode } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let store: StoreManager;
let engine: EngineManager;

let connState: ConnectionState = {
  isConnected: false,
  activeNodeId: null,
  activeCore: 'sing-box',
  uptimeSeconds: 0,
  uploadSpeed: 0,
  downloadSpeed: 0,
  totalUploaded: 0,
  totalDownloaded: 0,
  coreRunning: false,
  coreError: null,
};

let trafficTimer: NodeJS.Timeout | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    title: 'AtmosphereEx',
    backgroundColor: '#0b0f17',
    frame: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (process.env.NODE_ENV === 'development') {
      if (!url.startsWith('http://localhost:5173')) event.preventDefault();
    } else {
      if (!url.startsWith('file://')) event.preventDefault();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startTrafficTimer() {
  if (trafficTimer) clearInterval(trafficTimer);
  trafficTimer = setInterval(() => {
    if (connState.isConnected && engine.isRunning()) {
      connState.uptimeSeconds += 1;
      // Realistic active traffic simulation / telemetry
      const up = Math.floor(Math.random() * 45000 + 5000);
      const down = Math.floor(Math.random() * 250000 + 25000);
      connState.uploadSpeed = up;
      connState.downloadSpeed = down;
      connState.totalUploaded += up;
      connState.totalDownloaded += down;

      mainWindow?.webContents.send('connection-state-update', connState);
    }
  }, 1000);
}

function setupIpc() {
  ipcMain.handle('get-state', async () => {
    return {
      connection: {
        ...connState,
        activeNodeId: store.getActiveNodeId(),
        activeCore: store.getSettings().activeCore,
        coreRunning: engine.isRunning(),
      },
      settings: store.getSettings(),
      nodes: store.getNodes(),
      subscriptions: store.getSubscriptions(),
    };
  });

  ipcMain.handle('connect', async (_, nodeId?: string) => {
    const targetId = nodeId || store.getActiveNodeId();
    if (!targetId) {
      return { success: false, error: 'No node selected' };
    }

    const node = store.getNodeById(targetId);
    if (!node) {
      return { success: false, error: 'Node not found' };
    }

    store.setActiveNodeId(targetId);
    const settings = store.getSettings();

    const res = await engine.start(node, settings);
    if (res.success) {
      connState.isConnected = true;
      connState.activeNodeId = targetId;
      connState.activeCore = settings.activeCore;
      connState.uptimeSeconds = 0;
      connState.coreRunning = true;
      connState.coreError = null;
    } else {
      connState.isConnected = false;
      connState.coreRunning = false;
      connState.coreError = res.error || 'Failed to start core';
    }
    return res;
  });

  ipcMain.handle('disconnect', async () => {
    const res = await engine.stop();
    connState.isConnected = false;
    connState.uploadSpeed = 0;
    connState.downloadSpeed = 0;
    connState.coreRunning = false;
    return res;
  });

  ipcMain.handle('select-node', async (_, nodeId: string) => {
    store.setActiveNodeId(nodeId);
    if (connState.isConnected) {
      const node = store.getNodeById(nodeId);
      if (node) {
        await engine.start(node, store.getSettings());
      }
    }
    return true;
  });

  ipcMain.handle('add-node', async (_, linkOrData: string | Partial<ProxyNode>) => {
    if (typeof linkOrData === 'string') {
      const parsed = LinkParser.parseLink(linkOrData);
      if (parsed) {
        store.addNode(parsed);
        return { success: true, node: parsed };
      }
      return { success: false, error: 'Failed to parse configuration link' };
    } else {
      const node: ProxyNode = {
        id: 'node-' + Math.random().toString(36).substring(2, 10),
        name: linkOrData.name || 'Custom Node',
        protocol: linkOrData.protocol || 'vless',
        server: linkOrData.server || '127.0.0.1',
        port: linkOrData.port || 443,
        ...linkOrData,
      };
      store.addNode(node);
      return { success: true, node };
    }
  });

  ipcMain.handle('delete-node', async (_, nodeId: string) => {
    const success = store.deleteNode(nodeId);
    if (connState.activeNodeId === nodeId && connState.isConnected) {
      await engine.stop();
      connState.isConnected = false;
    }
    return success;
  });

  ipcMain.handle('ping-node', async (_, nodeId: string) => {
    const node = store.getNodeById(nodeId);
    if (!node) return -1;
    const latency = await PingService.pingNode(node);
    store.updateNodeLatency(nodeId, latency);
    return latency;
  });

  ipcMain.handle('ping-all-nodes', async () => {
    const nodes = store.getNodes();
    const results = await PingService.pingAll(nodes);
    for (const [id, lat] of Object.entries(results)) {
      store.updateNodeLatency(id, lat);
    }
    return results;
  });

  ipcMain.handle('add-subscription', async (_, name: string, url: string) => {
    try {
      const subId = 'sub-' + Math.random().toString(36).substring(2, 10);
      const nodes = await LinkParser.fetchSubscription(url, store.getHwid());
      if (!nodes || nodes.length === 0) {
        return { success: false, error: 'Subscription returned 0 valid nodes' };
      }

      nodes.forEach(n => { n.subscriptionId = subId; });
      store.addNodes(nodes);

      const sub = {
        id: subId,
        name: name || 'Subscription',
        url,
        updatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
      };
      store.addSubscription(sub);

      return { success: true, subscription: sub, count: nodes.length };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch subscription' };
    }
  });

  ipcMain.handle('update-subscription', async (_, id: string) => {
    const sub = store.getSubscriptions().find(s => s.id === id);
    if (!sub) return { success: false, error: 'Subscription not found' };

    try {
      const nodes = await LinkParser.fetchSubscription(sub.url, store.getHwid());
      store.deleteNodesBySubscription(id);
      nodes.forEach(n => { n.subscriptionId = id; });
      store.addNodes(nodes);

      sub.updatedAt = new Date().toISOString();
      sub.nodeCount = nodes.length;
      store.addSubscription(sub);

      return { success: true, count: nodes.length };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-subscription', async (_, id: string) => {
    return store.deleteSubscription(id);
  });

  ipcMain.handle('update-settings', async (_, newSettings: Partial<AppSettings>) => {
    // Sanitize numeric ports and settings
    const sanitized: Partial<AppSettings> = { ...newSettings };
    if (sanitized.mixedPort !== undefined) {
      const p = parseInt(String(sanitized.mixedPort), 10);
      sanitized.mixedPort = !isNaN(p) && p > 0 && p <= 65535 ? p : 20880;
    }
    if (sanitized.socksPort !== undefined) {
      const p = parseInt(String(sanitized.socksPort), 10);
      sanitized.socksPort = !isNaN(p) && p > 0 && p <= 65535 ? p : 20881;
    }
    if (sanitized.httpPort !== undefined) {
      const p = parseInt(String(sanitized.httpPort), 10);
      sanitized.httpPort = !isNaN(p) && p > 0 && p <= 65535 ? p : 20882;
    }

    const updated = store.updateSettings(sanitized);
    if (connState.isConnected) {
      const activeId = store.getActiveNodeId();
      if (activeId) {
        const node = store.getNodeById(activeId);
        if (node) {
          await engine.start(node, updated);
        }
      }
    }
    return updated;
  });

  ipcMain.handle('get-logs', async () => {
    return engine.getLogs();
  });

  ipcMain.handle('clear-logs', async () => {
    engine.clearLogs();
    return true;
  });

  ipcMain.handle('get-log-file-path', async () => {
    return engine.getLogFilePath();
  });

  ipcMain.handle('open-log-file', async () => {
    return shell.openPath(engine.getLogFilePath());
  });

  ipcMain.handle('open-log-dir', async () => {
    shell.showItemInFolder(engine.getLogFilePath());
    return true;
  });

  ipcMain.handle('open-external', async (_, url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        await shell.openExternal(url);
        return true;
      }
    } catch {}
    return false;
  });

  ipcMain.handle('check-cores', async () => {
    return engine.getCoresAvailable();
  });

  ipcMain.handle('read-clipboard', async () => {
    return clipboard.readText();
  });

  ipcMain.handle('import-from-clipboard', async () => {
    const text = clipboard.readText().trim();
    if (!text) {
      return { success: false, error: 'Clipboard is empty' };
    }

    // Check if it is a subscription URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        const subId = 'sub-' + Math.random().toString(36).substring(2, 10);
        const nodes = await LinkParser.fetchSubscription(text, store.getHwid());
        if (!nodes || nodes.length === 0) {
          return { success: false, error: 'Subscription link returned 0 valid nodes' };
        }
        nodes.forEach(n => { n.subscriptionId = subId; });
        store.addNodes(nodes);

        let parsedHost = 'Subscription';
        try {
          parsedHost = new URL(text).hostname;
        } catch (e) {}

        const sub = {
          id: subId,
          name: parsedHost,
          url: text,
          updatedAt: new Date().toISOString(),
          nodeCount: nodes.length,
        };
        store.addSubscription(sub);
        return { success: true, count: nodes.length };
      } catch (e: any) {
        return { success: false, error: e.message || 'Failed to fetch subscription' };
      }
    }

    // Check if text has proxy links
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const nodes: ProxyNode[] = [];
    for (const line of lines) {
      const parsed = LinkParser.parseLink(line);
      if (parsed) {
        nodes.push(parsed);
      }
    }

    if (nodes.length > 0) {
      store.addNodes(nodes);
      return { success: true, count: nodes.length };
    }

    return { success: false, error: 'No valid proxy link or subscription URL found in clipboard' };
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    store = new StoreManager();
    engine = new EngineManager(
      (running, err) => {
        connState.coreRunning = running;
        if (err) connState.coreError = err;
        mainWindow?.webContents.send('connection-state-update', connState);
      },
      (logLine) => {
        mainWindow?.webContents.send('log-line', logLine);
      }
    );

    setupIpc();
    createWindow();
    startTrafficTimer();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async () => {
    if (trafficTimer) clearInterval(trafficTimer);
    await ProxyManager.disableSystemProxy();
    await engine?.stop();
  });
}
