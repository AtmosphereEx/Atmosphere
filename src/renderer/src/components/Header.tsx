import React from 'react';
import { Settings, Languages, Plus, FileText } from 'lucide-react';
import { ConnectionState, AppSettings } from '../types';
import { useI18n, Language } from '../i18n';
import atmosphereIcon from '../assets/icon.png';

interface HeaderProps {
  connection: ConnectionState;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  onOpenAdd: () => void;
  onOpenLogs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connection,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenAdd,
  onOpenLogs,
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'ru' ? 'en' : 'ru';
    onUpdateSettings({ language: nextLang });
  };

  return (
    <header className="h-14 border-b border-zinc-850 bg-black px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & App Icon */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
        <div className="relative flex items-center justify-center shrink-0">
          <img 
            src={atmosphereIcon} 
            alt="Atmosphere" 
            className="w-7 h-7 rounded-lg object-contain shadow-md"
            onError={(e) => {
              // fallback if not found
              (e.currentTarget as HTMLElement).style.display = 'none';
            }} 
          />
          {connection.isConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-sky-400 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
          )}
        </div>
        <div className="flex items-center min-w-0">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
            Atmosphere
          </span>
        </div>
      </div>

      {/* Right controls: + Add, Logs, Language & Settings */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick Add Subscription / Link button */}
        <button
          onClick={onOpenAdd}
          title={lang === 'ru' ? 'Добавить подписку или ключ' : 'Add subscription or key'}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 border border-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden min-[420px]:inline">{lang === 'ru' ? 'Добавить' : 'Add'}</span>
        </button>

        {/* Logs Button */}
        {onOpenLogs && (
          <button
            onClick={onOpenLogs}
            title={lang === 'ru' ? 'Журнал логов' : 'View logs'}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Language Toggle */}
        <button
          onClick={toggleLanguage}
          title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer active:scale-95"
        >
          <Languages className="w-3.5 h-3.5 text-zinc-400" />
          <span className="uppercase text-[11px]">{lang}</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title={t.settings}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer active:scale-95"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
