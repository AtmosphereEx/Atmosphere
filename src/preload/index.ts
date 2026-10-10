import { contextBridge, ipcRenderer } from 'electron';
import { IpcApi, ProxyNode, AppSettings } from '../shared/types';

const api: IpcApi = {
  getState: () => ipcRenderer.invoke('get-state'),
  connect: (nodeId?: string) => ipcRenderer.invoke('connect', nodeId),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  selectNode: (nodeId: string) => ipcRenderer.invoke('select-node', nodeId),
  addNode: (linkOrData: string | Partial<ProxyNode>) => ipcRenderer.invoke('add-node', linkOrData),
  deleteNode: (nodeId: string) => ipcRenderer.invoke('delete-node', nodeId),
  pingNode: (nodeId: string) => ipcRenderer.invoke('ping-node', nodeId),
  pingAllNodes: () => ipcRenderer.invoke('ping-all-nodes'),
  addSubscription: (name: string, url: string) => ipcRenderer.invoke('add-subscription', name, url),
  updateSubscription: (id: string) => ipcRenderer.invoke('update-subscription', id),
  deleteSubscription: (id: string) => ipcRenderer.invoke('delete-subscription', id),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('update-settings', settings),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  openLogDir: () => ipcRenderer.invoke('open-log-dir'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  checkCores: () => ipcRenderer.invoke('check-cores'),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  importFromClipboard: () => ipcRenderer.invoke('import-from-clipboard'),
};

contextBridge.exposeInMainWorld('api', api);

// Listen to server updates
contextBridge.exposeInMainWorld('events', {
  onConnectionUpdate: (cb: (state: any) => void) => {
    const listener = (_: any, data: any) => cb(data);
    ipcRenderer.on('connection-state-update', listener);
    return () => ipcRenderer.removeListener('connection-state-update', listener);
  },
  onLogLine: (cb: (line: string) => void) => {
    const listener = (_: any, data: string) => cb(data);
    ipcRenderer.on('log-line', listener);
    return () => ipcRenderer.removeListener('log-line', listener);
  }
});
