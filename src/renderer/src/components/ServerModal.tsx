import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Plus, 
  Trash2, 
  Globe, 
  ArrowLeft,
  RefreshCw,
  Folder,
  ChevronDown,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { ProxyNode, Subscription, AppSettings } from '../types';
import { useI18n } from '../i18n';
import { ServerFlag, cleanNodeName } from './ServerFlag';
import { ErrorBoundary } from './ErrorBoundary';

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes?: ProxyNode[];
  subscriptions?: Subscription[];
  activeNodeId?: string | null;
  settings?: AppSettings;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onPingNode: (id: string) => void;
  onPingAll: () => void;
  onOpenAdd: () => void;
  onUpdateSubscription?: (id: string) => Promise<any>;
  isPinging?: boolean;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  isOpen,
  onClose,
  nodes = [],
  subscriptions = [],
  activeNodeId,
  settings = {} as AppSettings,
  onSelectNode,
  onDeleteNode,
  onPingNode,
  onPingAll,
  onOpenAdd,
  onUpdateSubscription,
  isPinging = false,
}) => {
  // CRITICAL: All React hooks must run unconditionally before any early return!
  const { t, lang } = useI18n(settings.language || 'auto');
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [updatingSubId, setUpdatingSubId] = useState<string | null>(null);

  const safeNodes = useMemo(() => Array.isArray(nodes) ? nodes : [], [nodes]);
  const safeSubs = useMemo(() => Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [], [subscriptions]);

  const filteredNodes = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return safeNodes;
    return safeNodes.filter((n) => {
      if (!n) return false;
      const name = (n.name || '').toLowerCase();
      const server = (n.server || '').toLowerCase();
      const protocol = (n.protocol || '').toLowerCase();
      return name.includes(q) || server.includes(q) || protocol.includes(q);
    });
  }, [safeNodes, search]);

  const groupedSections = useMemo(() => {
    try {
      const subMap: Record<string, { id: string; name: string; url?: string; nodes: ProxyNode[] }> = {};

      safeSubs.forEach((s) => {
        if (!s || !s.id) return;
        let displayName = s.name;
        if (!displayName || displayName === 'Subscription' || displayName === 'Imported Subscription') {
          if (s.url) {
            try {
              const host = new URL(s.url).hostname.replace(/^subs\./, '').replace(/^api\./, '');
              const brand = host.split('.')[0];
              displayName = brand.charAt(0).toUpperCase() + brand.slice(1);
            } catch {
              displayName = lang === 'ru' ? 'Подписка' : 'Subscription';
            }
          } else {
            displayName = lang === 'ru' ? 'Подписка' : 'Subscription';
          }
        }

        subMap[s.id] = {
          id: s.id,
          name: displayName || (lang === 'ru' ? 'Подписка' : 'Subscription'),
          url: s.url,
          nodes: []
        };
      });

      const manualNodes: ProxyNode[] = [];

      filteredNodes.forEach((node) => {
        if (!node) return;
        if (node.subscriptionId && subMap[node.subscriptionId]) {
          subMap[node.subscriptionId].nodes.push(node);
        } else {
          manualNodes.push(node);
        }
      });

      const sections: Array<{ id: string; name: string; isSub: boolean; nodes: ProxyNode[] }> = [];

      safeSubs.forEach((s) => {
        if (s && s.id && subMap[s.id] && subMap[s.id].nodes.length > 0) {
          sections.push({
            id: s.id,
            name: subMap[s.id].name,
            isSub: true,
            nodes: subMap[s.id].nodes
          });
        }
      });

      if (manualNodes.length > 0) {
        sections.push({
          id: 'manual',
          name: lang === 'ru' ? 'Пользовательские серверы' : 'Custom / Manual Servers',
          isSub: false,
          nodes: manualNodes
        });
      }

      return sections;
    } catch (e) {
      console.error('Error calculating groupedSections:', e);
      return [{
        id: 'all',
        name: lang === 'ru' ? 'Все серверы' : 'All Servers',
        isSub: false,
        nodes: filteredNodes
      }];
    }
  }, [filteredNodes, safeSubs, lang]);

  const visibleSections = useMemo(() => {
    if (selectedTab === 'all') return groupedSections;
    return groupedSections.filter((sec) => sec.id === selectedTab);
  }, [groupedSections, selectedTab]);

  const manualNodesCount = useMemo(() => {
    return filteredNodes.filter(n => !n.subscriptionId || !safeSubs.some(s => s && s.id === n.subscriptionId)).length;
  }, [filteredNodes, safeSubs]);

  // If not open, return null AFTER all hooks are called
  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleRefreshSub = async (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    if (!onUpdateSubscription || updatingSubId) return;
    setUpdatingSubId(subId);
    try {
      await onUpdateSubscription(subId);
    } catch (err) {
      console.error('Failed to update subscription:', err);
    } finally {
      setUpdatingSubId(null);
    }
  };

  const getLatencyBadge = (lat?: number) => {
    if (lat === undefined || lat === null) {
      return (
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          -- ms
        </span>
      );
    }
    if (lat < 0) {
      return (
        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          {t.timeout}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-white bg-zinc-850 border border-zinc-700 shrink-0 whitespace-nowrap">
        {lat} ms
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 select-none">
      <div className="relative w-full max-w-lg h-[92vh] max-h-[720px] bg-black border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        <ErrorBoundary fallbackTitle={lang === 'ru' ? 'Ошибка отображения списка серверов' : 'Error loading server list'}>
          {/* Header with App Icon */}
          <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <img 
                  src="/icon.png" 
                  alt="AtmosphereEx" 
                  className="w-5 h-5 rounded-md object-contain"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                />
                <h2 className="text-sm font-extrabold text-white tracking-tight">
                  {lang === 'ru' ? 'Выбор сервера' : 'Select Server'}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-750 text-zinc-300 font-mono font-bold">
                  {filteredNodes.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onPingAll}
                disabled={isPinging || safeNodes.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title={lang === 'ru' ? 'Проверить пинг всех серверов' : 'Ping all servers'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">{lang === 'ru' ? 'Пинг всех' : 'Ping all'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-zinc-850 bg-zinc-950 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'ru' ? 'Поиск страны, города или протокола...' : 'Search country or protocol...'}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          {/* DISTINCT SUBSCRIPTION TABS (Categories) */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-850 overflow-x-auto no-scrollbar bg-black/60 shrink-0">
            {/* All tab */}
            <button
              onClick={() => setSelectedTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Все' : 'All'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                selectedTab === 'all' ? 'bg-zinc-200 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {filteredNodes.length}
              </span>
            </button>

            {/* Subscriptions tabs */}
            {safeSubs.map((s) => {
              if (!s || !s.id) return null;
              const subCount = filteredNodes.filter(n => n && n.subscriptionId === s.id).length;
              const isTabActive = selectedTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedTab(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isTabActive
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[130px]">{s.name || (lang === 'ru' ? 'Подписка' : 'Subscription')}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                    isTabActive ? 'bg-zinc-200 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {subCount}
                  </span>
                </button>
              );
            })}

            {/* Manual nodes tab */}
            {manualNodesCount > 0 && (
              <button
                onClick={() => setSelectedTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedTab === 'manual'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚡ {lang === 'ru' ? 'Свои' : 'Manual'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  selectedTab === 'manual' ? 'bg-zinc-200 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {manualNodesCount}
                </span>
              </button>
            )}
          </div>

          {/* Server List Grouped by Subscription */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {filteredNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                <Globe className="w-10 h-10 text-zinc-600 mb-2" />
                <div className="text-sm font-bold text-zinc-400">
                  {lang === 'ru' ? 'Серверы не найдены' : 'No servers found'}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {lang === 'ru' ? 'Добавьте подписку по кнопке ниже' : 'Add subscription below'}
                </p>
              </div>
            ) : (
              visibleSections.map((section) => {
                const isCollapsed = !!collapsedGroups[section.id];
                return (
                  <div 
                    key={section.id} 
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Distinct Subscription Section Header Banner */}
                    <div 
                      onClick={() => toggleGroup(section.id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 bg-zinc-900 cursor-pointer hover:bg-zinc-850 transition-colors select-none gap-2 ${
                        !isCollapsed ? 'border-b border-zinc-850' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        <Folder className="w-4 h-4 text-white shrink-0" />
                        <span className="text-xs font-black text-white truncate min-w-0 tracking-tight uppercase">
                          {section.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono font-bold shrink-0 whitespace-nowrap">
                          {section.nodes.length} {lang === 'ru' ? 'серв.' : 'servers'}
                        </span>
                      </div>

                      {section.isSub && onUpdateSubscription && (
                        <button
                          onClick={(e) => handleRefreshSub(e, section.id)}
                          disabled={updatingSubId === section.id}
                          title={lang === 'ru' ? 'Обновить эту подписку' : 'Update subscription'}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 text-[10px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <RefreshCw className={`w-3 h-3 shrink-0 ${updatingSubId === section.id ? 'animate-spin text-white' : ''}`} />
                          <span className="hidden min-[380px]:inline">{lang === 'ru' ? 'Обновить' : 'Update'}</span>
                        </button>
                      )}
                    </div>

                    {/* Unified, seamless Server List without gaps */}
                    {!isCollapsed && (
                      <div className="divide-y divide-zinc-850/70">
                        {section.nodes.map((node) => {
                          if (!node || !node.id) return null;
                          const isSelected = activeNodeId === node.id;
                          return (
                            <div
                              key={node.id}
                              onClick={() => {
                                onSelectNode(node.id);
                                onClose();
                              }}
                              className={`w-full px-3.5 py-2.5 transition-colors cursor-pointer flex items-center justify-between group relative select-none ${
                                isSelected
                                  ? 'bg-zinc-900/90 text-white'
                                  : 'bg-zinc-950/40 hover:bg-zinc-900/50 text-zinc-200'
                              }`}
                            >
                              {/* Left active indicator pill */}
                              {isSelected && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r" />
                              )}

                              {/* Left side: radio + text */}
                              <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                                {/* Status radio / check icon (Black & White) */}
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-white border-white text-black'
                                      : 'border-zinc-700 bg-zinc-800 group-hover:border-zinc-500'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>

                                {/* Server Info */}
                                <div className="min-w-0 flex-1 text-left">
                                  {/* Title row: Flag + Name (with strict truncation) */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ServerFlag name={node.name} className="w-5 h-3.5 shrink-0" />
                                    <span className={`text-xs font-bold truncate min-w-0 transition-colors ${
                                      isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                                    }`}>
                                      {cleanNodeName(node.name)}
                                    </span>
                                  </div>

                                  {/* Sub-info row: Privacy badge + Protocol (never leaks IP) */}
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5 min-w-0">
                                    <span className="font-mono text-zinc-400 flex items-center gap-1 select-none shrink-0 whitespace-nowrap">
                                      <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                                      <span>{lang === 'ru' ? 'IP скрыт' : 'IP hidden'}</span>
                                    </span>
                                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-850 border border-zinc-750 text-zinc-300 shrink-0 whitespace-nowrap">
                                      {node.protocol}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Latency and Ping / Delete buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPingNode(node.id);
                                  }}
                                  title={lang === 'ru' ? 'Проверить пинг' : 'Check ping'}
                                  className="cursor-pointer shrink-0"
                                >
                                  {getLatencyBadge(node.latency)}
                                </button>

                                {/* Delete button (discreet) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteNode(node.id);
                                  }}
                                  title={lang === 'ru' ? 'Удалить узел' : 'Delete node'}
                                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer / Add Subscription bar - Black & White */}
          <div className="p-3.5 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                onClose();
                onOpenAdd();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{lang === 'ru' ? 'Добавить подписку или ссылку' : 'Add subscription or link'}</span>
            </button>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};
