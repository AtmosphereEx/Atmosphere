import React from 'react';
import { RouteMode, AppSettings } from '../types';
import { useI18n } from '../i18n';
import { Split, ShieldCheck, Globe, Network, ArrowRightLeft } from 'lucide-react';

interface RoutingRulesProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const RoutingRules: React.FC<RoutingRulesProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { t } = useI18n(settings.language || 'auto');

  const modes: { id: RouteMode; title: string; desc: string; icon: any }[] = [
    {
      id: 'rule',
      title: `${t.modeRule} (${t.appName})`,
      desc: t.ruleModeDesc,
      icon: Split,
    },
    {
      id: 'global',
      title: t.modeGlobal,
      desc: t.globalModeDesc,
      icon: Globe,
    },
    {
      id: 'direct',
      title: t.modeDirect,
      desc: t.directModeDesc,
      icon: ArrowRightLeft,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{t.routing}</h2>
        <p className="text-xs text-slate-400">
          {t.rulesDescription}
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = settings.routeMode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => onUpdateSettings({ routeMode: m.id })}
              className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-brand-500/70 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/30'
                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected ? 'bg-brand-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white">{m.title}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Advanced Route Toggles */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-brand-400" />
          <span>Traffic Exceptions</span>
        </h3>

        <div className="space-y-3">
          {/* Bypass LAN */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {t.bypassLAN}
              </div>
              <div className="text-[11px] text-slate-400">
                192.168.x.x, 10.x.x.x, 172.16.x.x, localhost
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.bypassLAN}
              onChange={(e) => onUpdateSettings({ bypassLAN: e.target.checked })}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/40 cursor-pointer accent-brand-500"
            />
          </label>

          {/* Bypass Domestic Sites */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {t.bypassDomestic}
              </div>
              <div className="text-[11px] text-slate-400">
                Direct access to regional banking, government, and media services
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.bypassDomestic}
              onChange={(e) => onUpdateSettings({ bypassDomestic: e.target.checked })}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/40 cursor-pointer accent-brand-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
