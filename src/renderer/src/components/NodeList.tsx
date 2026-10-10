import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Zap, 
  Check, 
  Activity, 
  Shield, 
  Globe, 
  Clipboard,
  RefreshCw 
} from 'lucide-react';
import { ProxyNode, AppSettings } from '../types';
import { useI18n } from '../i18n';
import { ServerFlag, cleanNodeName } from './ServerFlag';

interface NodeListProps {
  nodes: ProxyNode[];
  activeNodeId: string | null;
  settings: AppSettings;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onPingNode: (id: string) => void;
  onPingAll: () => void;
  onOpenAddModal: () => void;
  onImportClipboard: () => Promise<void>;
  isPinging?: boolean;
}

export const NodeList: React.FC<NodeListProps> = ({
  nodes,
  activeNodeId,
  settings,
  onSelectNode,
  onDeleteNode,
  onPingNode,
  onPingAll,
  onOpenAddModal,
  onImportClipboard,
  isPinging,
}) => {
  const { t } = useI18n(settings.language || 'auto');
  const [search, setSearch] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'latency' | 'name'>('default');

  const filteredNodes = nodes
    .filter((n) => {
      const matchSearch =
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.server.toLowerCase().includes(search.toLowerCase()) ||
        n.protocol.toLowerCase().includes(search.toLowerCase());
      const matchProto = filterProtocol === 'all' || n.protocol === filterProtocol;
      return matchSearch && matchProto;
    })
    .sort((a, b) => {
      if (sortBy === 'latency') {
        const latA = a.latency ?? 9999;
        const latB = b.latency ?? 9999;
        return (latA < 0 ? 9999 : latA) - (latB < 0 ? 9999 : latB);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const getLatencyBadge = (lat?: number) => {
    if (lat === undefined || lat === null) {
      return (
        <span className="text-[11px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
          N/A
        </span>
      );
    }
    if (lat < 0) {
      return (
        <span className="text-[11px] font-mono text-rose-400 bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 rounded">
          {t.timeout}
        </span>
      );
    }
    let color = 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/40';
    if (lat >= 80 && lat < 180) {
      color = 'text-amber-400 bg-amber-950/50 border border-amber-800/40';
    } else if (lat >= 180) {
      color = 'text-orange-400 bg-orange-950/50 border border-orange-800/40';
    }
    return (
      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${color}`}>
        {lat} ms
      </span>
    );
  };

  const getProtocolTag = (node: ProxyNode) => {
    let bg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    if (node.protocol === 'vless') {
      bg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (node.protocol === 'vmess') {
      bg = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    } else if (node.protocol === 'trojan') {
      bg = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    } else if (node.protocol === 'shadowsocks') {
      bg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }

    return (
      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${bg}`}>
        {node.protocol} {node.security === 'reality' ? 'Reality' : ''}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.nodes}</h2>
          <p className="text-xs text-slate-400">
            {nodes.length} {t.subCount}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onImportClipboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-brand-400 transition-all"
            title={t.pasteFromClipboard}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.pasteFromClipboard}</span>
          </button>

          <button
            onClick={onPingAll}
            disabled={isPinging || nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:border-brand-500/50 hover:text-brand-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-brand-400' : ''}`} />
            <span>{t.pingAll}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addNode}</span>
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchServers}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        {/* Protocol filter */}
        <select
          value={filterProtocol}
          onChange={(e) => setFilterProtocol(e.target.value)}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50 cursor-pointer"
        >
          <option value="all">All Protocols</option>
          <option value="vless">VLESS</option>
          <option value="vmess">VMess</option>
          <option value="trojan">Trojan</option>
          <option value="shadowsocks">Shadowsocks</option>
        </select>

        {/* Sort by */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50 cursor-pointer"
        >
          <option value="default">Default</option>
          <option value="latency">Ping (Low to High)</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Node List Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredNodes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center">
            <Globe className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
            <p className="text-sm font-medium">{t.noNodesTitle}</p>
            <p className="text-xs mt-1">{t.noNodesDesc}</p>
            <button
              onClick={onImportClipboard}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow"
            >
              <Clipboard className="w-4 h-4" />
              <span>{t.pasteFromClipboard}</span>
            </button>
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = activeNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-slate-800/90 border-brand-500/60 shadow-md shadow-brand-500/5 ring-1 ring-brand-500/20'
                    : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-brand-500 text-slate-950'
                        : 'border border-slate-700 text-transparent hover:border-slate-500'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ServerFlag name={node.name} className="w-5 h-3.5" />
                      <span className="text-sm font-bold text-slate-100 truncate">
                        {cleanNodeName(node.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getProtocolTag(node)}
                      <span className="text-xs text-slate-400 font-mono">
                        {node.server}:{node.port}
                      </span>
                      {node.network && (
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {node.network}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Ping & Delete */}
                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onPingNode(node.id)}
                    title="Test server latency"
                    className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors group"
                  >
                    {getLatencyBadge(node.latency)}
                  </button>

                  <button
                    onClick={() => onDeleteNode(node.id)}
                    title="Delete server"
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
