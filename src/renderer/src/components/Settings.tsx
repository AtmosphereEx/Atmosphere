import React, { useState, useEffect } from 'react';
import { AppSettings, CoreType, ConnectionMode } from '../types';
import { useI18n, Language } from '../i18n';
import { 
  Sliders, 
  Cpu, 
  ShieldCheck, 
  Network, 
  CheckCircle, 
  XCircle, 
  Languages,
  RotateCcw
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onCheckCores: () => Promise<{ singBox: boolean; xray: boolean }>;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onCheckCores,
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');
  const [coresStatus, setCoresStatus] = useState<{ singBox: boolean; xray: boolean }>({
    singBox: false,
    xray: false,
  });

  useEffect(() => {
    onCheckCores().then(setCoresStatus);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{t.settings}</h2>
        <p className="text-xs text-slate-400">
          Configure language, core engines, ports, and network interceptor
        </p>
      </div>

      {/* Language Selection Card */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Languages className="w-4 h-4 text-brand-400" />
          <span>{t.language}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => onUpdateSettings({ language: 'auto' })}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              settings.language === 'auto'
                ? 'bg-brand-500/15 border-brand-500/60 text-white font-bold ring-1 ring-brand-500/20'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold text-white">{t.systemDefault}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Auto: {lang.toUpperCase()}
            </div>
          </button>

          <button
            onClick={() => onUpdateSettings({ language: 'ru' })}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              settings.language === 'ru'
                ? 'bg-brand-500/15 border-brand-500/60 text-white font-bold ring-1 ring-brand-500/20'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold text-white">Русский (RU)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Русский язык интерфейса</div>
          </button>

          <button
            onClick={() => onUpdateSettings({ language: 'en' })}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              settings.language === 'en'
                ? 'bg-brand-500/15 border-brand-500/60 text-white font-bold ring-1 ring-brand-500/20'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold text-white">English (EN)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">English interface language</div>
          </button>
        </div>
      </div>

      {/* Core Engines Status Card */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-400" />
          <span>{t.coreStatus}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* sing-box status */}
          <div 
            onClick={() => onUpdateSettings({ activeCore: 'sing-box' })}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              settings.activeCore === 'sing-box'
                ? 'bg-slate-900 border-brand-500/60 ring-1 ring-brand-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {coresStatus.singBox ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <div>
                <div className="text-xs font-bold text-slate-200">sing-box v1.14.2</div>
                <div className="text-[11px] text-slate-500 font-mono">bin/sing-box.exe</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
              {t.installed}
            </span>
          </div>

          {/* Xray-core status */}
          <div 
            onClick={() => onUpdateSettings({ activeCore: 'xray' })}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              settings.activeCore === 'xray'
                ? 'bg-slate-900 border-brand-500/60 ring-1 ring-brand-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {coresStatus.xray ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <div>
                <div className="text-xs font-bold text-slate-200">Xray-core v26.3.27</div>
                <div className="text-[11px] text-slate-500 font-mono">bin/xray.exe</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
              {t.installed}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Mode Selection */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>{t.connectionMethod}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onUpdateSettings({ connectionMode: 'system-proxy' })}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              settings.connectionMode === 'system-proxy'
                ? 'bg-brand-500/15 border-brand-500/60 text-white font-bold ring-1 ring-brand-500/20'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold text-white">⚡ {t.proxyMode}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Windows Registry & WinINet HTTP/SOCKS5 proxy
            </div>
          </button>

          <button
            onClick={() => onUpdateSettings({ connectionMode: 'tun' })}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              settings.connectionMode === 'tun'
                ? 'bg-brand-500/15 border-brand-500/60 text-white font-bold ring-1 ring-brand-500/20'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold text-white">🛡️ {t.tunMode}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Virtual network adapter (wintun.dll) for entire OS
            </div>
          </button>
        </div>
      </div>

      {/* Network & Ports */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-brand-400" />
          <span>{t.inboundPorts}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.mixedPort}
            </label>
            <input
              type="number"
              value={settings.mixedPort}
              onChange={(e) => onUpdateSettings({ mixedPort: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.socksPort}
            </label>
            <input
              type="number"
              value={settings.socksPort}
              onChange={(e) => onUpdateSettings({ socksPort: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.tunStack}
            </label>
            <select
              value={settings.tunStack}
              onChange={(e) => onUpdateSettings({ tunStack: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
            >
              <option value="mixed">Mixed (Recommended)</option>
              <option value="system">System</option>
              <option value="gvisor">gVisor</option>
            </select>
          </div>
        </div>
      </div>

      {/* General Options */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-400" />
          <span>General Behavior</span>
        </h3>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
          <div>
            <div className="text-xs font-semibold text-slate-200">{t.autoConnectOnLaunch}</div>
            <div className="text-[11px] text-slate-400">
              Auto-connect to selected server when application starts
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoConnect}
            onChange={(e) => onUpdateSettings({ autoConnect: e.target.checked })}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/40 cursor-pointer accent-brand-500"
          />
        </label>
      </div>

      {/* About Box */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-200">{t.appName}</span> &bull; Version 1.0.0
          <div className="text-[11px] text-slate-500 mt-0.5">
            High-performance proxy & tunnel suite powered by Sing-box and Xray
          </div>
        </div>
        <div className="text-[11px] text-emerald-400 font-mono">
          Ready
        </div>
      </div>
    </div>
  );
};
