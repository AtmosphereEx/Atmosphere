import React from 'react';
import { 
  Activity, 
  Server, 
  Rss, 
  ShieldCheck, 
  Terminal, 
  Settings as SettingsIcon,
  Zap,
  Globe2
} from 'lucide-react';
import { ConnectionState, AppSettings } from '../types';
import { useI18n } from '../i18n';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  connection: ConnectionState;
  settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  connection,
  settings,
}) => {
  const { t } = useI18n(settings.language || 'auto');

  const navItems = [
    { id: 'dashboard', label: t.home, icon: Activity },
    { id: 'nodes', label: t.nodes, icon: Server },
    { id: 'subscriptions', label: t.subscriptions, icon: Rss },
    { id: 'routing', label: t.routing, icon: Globe2 },
    { id: 'logs', label: t.logs, icon: Terminal },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  return (
    <aside className="w-60 bg-surface-950/80 border-r border-slate-800/80 flex flex-col justify-between p-4 backdrop-blur-xl shrink-0 select-none">
      <div>
        {/* Navigation */}
        <nav className="space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Badge */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">{t.coreEngine}:</span>
          <span className="font-mono font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
            {settings.activeCore}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">{t.connectionMethod}:</span>
          <span className="font-mono text-slate-300 text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {settings.connectionMode === 'tun' ? '🛡️ TUN' : '⚡ Proxy'}
          </span>
        </div>
      </div>
    </aside>
  );
};
