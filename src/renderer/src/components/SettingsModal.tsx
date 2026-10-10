import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  Languages, 
  ShieldCheck, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  RotateCcw,
  FileText
} from 'lucide-react';
import { AppSettings, CoreType, ConnectionMode } from '../types';
import { useI18n, Language } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onCheckCores: () => Promise<{ singBox: boolean; xray: boolean }>;
  onOpenLogs?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onCheckCores,
  onOpenLogs,
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');
  const [coresStatus, setCoresStatus] = useState<{ singBox: boolean; xray: boolean }>({
    singBox: true,
    xray: true,
  });

  useEffect(() => {
    if (isOpen) {
      onCheckCores().then(setCoresStatus).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 select-none">
      <div className="relative w-full max-w-lg h-[92vh] max-h-[680px] bg-black border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img 
              src="/icon.png" 
              alt="AtmosphereEx" 
              className="w-5 h-5 rounded-md object-contain"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
            />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              {t.settings}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Language */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-brand-400" />
              <span>{t.language}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateSettings({ language: 'auto' })}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.language === 'auto'
                    ? 'bg-brand-500/20 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{t.systemDefault}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Auto ({lang.toUpperCase()})</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ language: 'ru' })}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.language === 'ru'
                    ? 'bg-brand-500/20 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Русский</div>
                <div className="text-[10px] text-slate-500 mt-0.5">RU</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ language: 'en' })}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.language === 'en'
                    ? 'bg-brand-500/20 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">English</div>
                <div className="text-[10px] text-slate-500 mt-0.5">EN</div>
              </button>
            </div>
          </div>

          {/* 2. Routing Mode (TUN vs Proxy) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>{lang === 'ru' ? 'Режим перехвата трафика' : 'Traffic Interception Mode'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ connectionMode: 'tun' })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.connectionMode === 'tun' || !settings.connectionMode
                    ? 'bg-brand-500/15 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{lang === 'ru' ? 'Весь ПК (TUN Адаптер)' : 'Full PC (TUN Adapter)'}</span>
                  {(settings.connectionMode === 'tun' || !settings.connectionMode) && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/30 text-brand-300 font-extrabold">
                      {lang === 'ru' ? 'РЕКОМЕНДУЕТСЯ' : 'RECOMMENDED'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {lang === 'ru'
                    ? 'Маршрутизирует Telegram, Discord, игры и все программы ПК.'
                    : 'Routes Telegram, Discord, gaming and all system applications.'}
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ connectionMode: 'system-proxy' })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  settings.connectionMode === 'system-proxy'
                    ? 'bg-brand-500/15 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white">
                  {lang === 'ru' ? 'Системный прокси' : 'System Proxy'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {lang === 'ru'
                    ? 'Только для веб-браузеров (Chrome, Edge, Firefox).'
                    : 'Web browsers only (Chrome, Edge, Firefox).'}
                </div>
              </button>
            </div>
          </div>

          {/* 3. Core Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand-400" />
              <span>{lang === 'ru' ? 'Сетевое ядро' : 'Core Engine'}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ activeCore: 'sing-box' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.activeCore === 'sing-box'
                    ? 'bg-brand-500/15 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>sing-box</span>
                  <span className="text-[10px] text-emerald-400 font-mono">v1.14</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {lang === 'ru' ? 'Скоростной TUN и Reality' : 'Fast TUN & Reality'}
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ activeCore: 'xray' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.activeCore === 'xray'
                    ? 'bg-brand-500/15 border-brand-500 text-white font-bold ring-1 ring-brand-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Xray-core</span>
                  <span className="text-[10px] text-cyan-400 font-mono">v26.3</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {lang === 'ru' ? 'Классическое ядро V2Ray' : 'Classic V2Ray core'}
                </div>
              </button>
            </div>
          </div>

          {/* 4. Boot & Autoconnect Switches */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white">
                  {lang === 'ru' ? 'Запускать вместе с Windows' : 'Launch on Windows boot'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {lang === 'ru' ? 'Автоматический старт программы в фоне' : 'Start silently in background'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartOnBoot || false}
                onChange={(e) => onUpdateSettings({ autoStartOnBoot: e.target.checked })}
                className="w-4 h-4 accent-brand-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white">
                  {lang === 'ru' ? 'Автоподключение при старте' : 'Auto-connect on launch'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {lang === 'ru' ? 'Подключать к последнему выбранному серверу' : 'Connect immediately to active node'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoConnect || false}
                onChange={(e) => onUpdateSettings({ autoConnect: e.target.checked })}
                className="w-4 h-4 accent-brand-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 5. Diagnostics & Logs */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-400" />
                  <span>{lang === 'ru' ? 'Журнал работы и диагностики' : 'Core & Network Logs'}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {lang === 'ru' ? 'Подробный вывод sing-box и сетевых подключений' : 'Detailed console logs and connection traces'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLogs) onOpenLogs();
                }}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {lang === 'ru' ? 'Открыть логи' : 'View logs'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between shrink-0 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="AtmosphereEx" className="w-4 h-4 rounded-xs object-contain opacity-80" />
            <span className="font-semibold text-zinc-400">AtmosphereEx v1.0.0</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold transition-all cursor-pointer"
          >
            {lang === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
