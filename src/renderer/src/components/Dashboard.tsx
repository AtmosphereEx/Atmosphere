import React from 'react';
import { 
  Power, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  ChevronRight, 
  Server, 
  AlertCircle,
  Shield,
  ShieldCheck,
  Globe2,
  Folder
} from 'lucide-react';
import { ConnectionState, ProxyNode, AppSettings, Subscription } from '../types';
import { useI18n } from '../i18n';
import { ServerFlag, cleanNodeName } from './ServerFlag';

interface DashboardProps {
  connection: ConnectionState;
  activeNode: ProxyNode | null;
  subscriptions?: Subscription[];
  settings: AppSettings;
  onToggleConnect: () => void;
  onOpenServers: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isConnecting?: boolean;
  connectingAction?: 'idle' | 'connecting' | 'disconnecting';
}

export const Dashboard: React.FC<DashboardProps> = ({
  connection,
  activeNode,
  subscriptions = [],
  settings,
  onToggleConnect,
  onOpenServers,
  onUpdateSettings,
  isConnecting,
  connectingAction = 'idle',
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number): string => {
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const getLatencyBadge = (lat?: number) => {
    if (lat === undefined || lat === null) return null;
    if (lat < 0) {
      return (
        <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 font-mono text-xs px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          {t.timeout}
        </span>
      );
    }
    return (
      <span className="text-white bg-zinc-850 border border-zinc-700 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
        {lat} ms
      </span>
    );
  };

  const isEngaged = connection.isConnected || connectingAction !== 'idle' || isConnecting;

  // Find active subscription name
  const activeSub = activeNode?.subscriptionId 
    ? subscriptions.find(s => s.id === activeNode.subscriptionId)
    : null;
  const activeSubName = activeSub?.name || (activeNode?.subscriptionId ? (lang === 'ru' ? 'Подписка' : 'Subscription') : null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-5 max-w-sm sm:max-w-md mx-auto w-full select-none overflow-y-auto z-10 gap-3.5 my-auto">
      {/* 1. Top Connection Status Pill (Read-only status) */}
      <div className="w-full flex justify-center shrink-0">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all max-w-full truncate ${
          connection.isConnected
            ? 'bg-zinc-900/90 border-sky-500/40 text-white shadow-sm shadow-sky-950/40'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            connection.isConnected ? 'bg-sky-400 ring-4 ring-sky-400/20 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-zinc-600'
          }`} />
          <span className="truncate">
            {connectingAction === 'connecting'
              ? (lang === 'ru' ? 'Активация шлюза...' : 'Activating Gateway...')
              : connectingAction === 'disconnecting'
              ? (lang === 'ru' ? 'Деактивация...' : 'Deactivating...')
              : (connection.isConnected
                  ? (lang === 'ru' ? 'Атмосфера защищена — шлюз активен' : 'Atmosphere Secure — Gateway Active')
                  : (lang === 'ru' ? 'Шлюз отключен' : 'Gateway Disconnected'))}
          </span>
        </div>
      </div>

      {/* 2. THE ATMOSPHERE POWER CORE (Aerospace Stratospheric Core - Guaranteed 100% Circle) */}
      <div className="flex flex-col items-center my-1.5 shrink-0">
        <div 
          className="relative flex items-center justify-center shrink-0"
          style={{ width: '204px', height: '204px' }}
        >
          {/* Orbital Atmospheric Halo & Corona when connected */}
          {connection.isConnected && (
            <>
              {/* Diffuse Stratospheric Ambient Glow */}
              <div 
                className="absolute bg-sky-500/15 blur-2xl pointer-events-none"
                style={{ width: '204px', height: '204px', borderRadius: '50%' }}
              />
              {/* Outer Ion Boundary Ring */}
              <div 
                className="absolute border border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] pointer-events-none"
                style={{ width: '194px', height: '194px', borderRadius: '50%' }}
              />
              {/* Secondary Orbital Altitude Reticle */}
              <div 
                className="absolute border border-dashed border-sky-400/25 pointer-events-none"
                style={{ width: '178px', height: '178px', borderRadius: '50%' }}
              />
            </>
          )}

          {/* Active Radar Sweep during Connecting / Disconnecting */}
          {isConnecting && (
            <div 
              className="absolute border-2 border-sky-400/70 border-t-transparent animate-spin pointer-events-none"
              style={{ width: '194px', height: '194px', borderRadius: '50%' }}
            />
          )}

          {/* Static Orbital Reticle when Disconnected */}
          {!connection.isConnected && !isConnecting && (
            <div 
              className="absolute border border-zinc-800/80 pointer-events-none"
              style={{ width: '194px', height: '194px', borderRadius: '50%' }}
            />
          )}

          {/* Circular Atmosphere Core Button - GUARANTEED MATHEMATICALLY 1:1 CIRCLE */}
          <button
            onClick={onToggleConnect}
            disabled={connectingAction !== 'idle' || isConnecting || !activeNode}
            style={{
              width: '154px',
              height: '154px',
              minWidth: '154px',
              minHeight: '154px',
              maxWidth: '154px',
              maxHeight: '154px',
              borderRadius: '50%',
            }}
            className={`relative flex flex-col items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer shrink-0 select-none ${
              connection.isConnected
                ? 'bg-gradient-to-b from-zinc-900 via-sky-950/40 to-black border-2 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.35),inset_0_0_20px_rgba(56,189,248,0.15)] active:scale-95'
                : 'bg-gradient-to-b from-zinc-800 via-zinc-850 to-zinc-950 border-2 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-sky-500/50 hover:shadow-[0_0_25px_rgba(56,189,248,0.2),0_12px_28px_rgba(0,0,0,0.7)] shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.12)] active:scale-95'
            } ${!activeNode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Power className={`w-11 h-11 transition-all duration-300 stroke-[2.2] ${
              isEngaged 
                ? 'text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)] scale-105' 
                : 'text-zinc-200'
            }`} />
            
            {/* BUTTON TEXT: Clear, spacious, non-overlapping */}
            <span className={`text-[11px] font-black uppercase tracking-wider mt-2 transition-colors duration-300 select-none ${
              isEngaged 
                ? 'text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' 
                : 'text-zinc-300'
            }`}>
              {connectingAction === 'connecting'
                ? (lang === 'ru' ? 'ПОДКЛЮЧЕНИЕ...' : 'CONNECTING...')
                : connectingAction === 'disconnecting'
                ? (lang === 'ru' ? 'ОТКЛЮЧЕНИЕ...' : 'DISCONNECTING...')
                : (connection.isConnected ? (lang === 'ru' ? 'ОТКЛЮЧИТЬ' : 'DISCONNECT') : (lang === 'ru' ? 'ПОДКЛЮЧИТЬ' : 'CONNECT'))}
            </span>
          </button>
        </div>

        {/* Error notification if core fails */}
        {connection.coreError && (
          <div className="mt-2.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-2 max-w-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{connection.coreError}</span>
          </div>
        )}
      </div>

      {/* 3. THE PROMINENT CLICKABLE SERVER CARD WITH SUBSCRIPTION TAG */}
      <div className="w-full space-y-2.5 shrink-0">
        <div
          onClick={onOpenServers}
          className="w-full bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-lg group active:scale-99"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform shrink-0 shadow overflow-hidden">
              {activeNode ? (
                <ServerFlag name={activeNode.name} className="w-6 h-4.5 rounded-xs" />
              ) : (
                <Server className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 min-w-0">
                <span className="shrink-0">{lang === 'ru' ? 'Сервер' : 'Active Server'}</span>
                {activeSubName && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1 shrink-0 min-w-0">
                    <Folder className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate max-w-[100px]">{activeSubName}</span>
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-white truncate group-hover:text-zinc-200 transition-colors mt-0.5 min-w-0">
                {activeNode ? cleanNodeName(activeNode.name) : (lang === 'ru' ? '➕ Нажмите для выбора сервера' : '➕ Click to choose server')}
              </div>
              {activeNode && (
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 select-none shrink-0">
                    <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{lang === 'ru' ? 'IP скрыт' : 'IP hidden'}</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-850 text-zinc-300 border border-zinc-750 uppercase shrink-0">
                    {activeNode.protocol}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-1">
            {activeNode && getLatencyBadge(activeNode.latency)}
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>

        {/* 4. CLEAR MODE SWITCHER (VPN vs Proxy) - Concise & Non-wrapping */}
        <div className="w-full flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 text-xs font-semibold gap-1">
          <button
            onClick={() => onUpdateSettings({ connectionMode: 'tun' })}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
              settings.connectionMode === 'tun' || !settings.connectionMode
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">{lang === 'ru' ? 'Весь ПК (TUN)' : 'Full System (TUN)'}</span>
          </button>

          <button
            onClick={() => onUpdateSettings({ connectionMode: 'system-proxy' })}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
              settings.connectionMode === 'system-proxy'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">{lang === 'ru' ? 'Только браузер' : 'Browser Only'}</span>
          </button>
        </div>
      </div>

      {/* 5. TELEMETRY STATS - Concise & Responsive */}
      <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 shrink-0">
        {/* Download Speed */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-2 flex flex-col text-left min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 truncate">
            <ArrowDown className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{t.download}</span>
          </div>
          <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
            {connection.isConnected ? formatSpeed(connection.downloadSpeed) : '0 B/s'}
          </div>
        </div>

        {/* Upload Speed */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-2 flex flex-col text-left min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 truncate">
            <ArrowUp className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{t.upload}</span>
          </div>
          <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
            {connection.isConnected ? formatSpeed(connection.uploadSpeed) : '0 B/s'}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-2 flex flex-col text-left min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 truncate">
            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{t.duration}</span>
          </div>
          <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
            {connection.isConnected ? formatTime(connection.uptimeSeconds) : '00:00:00'}
          </div>
        </div>
      </div>
    </div>
  );
};
