import { IpcApi, ConnectionState, AppSettings, ProxyNode, Subscription } from '../../shared/types';

export * from '../../shared/types';

declare global {
  interface Window {
    api: IpcApi;
    events: {
      onConnectionUpdate: (cb: (state: ConnectionState) => void) => () => void;
    };
  }
}
