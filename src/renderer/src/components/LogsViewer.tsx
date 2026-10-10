import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Check, ArrowDownCircle } from 'lucide-react';

interface LogsViewerProps {
  onGetLogs: () => Promise<string[]>;
  onClearLogs: () => Promise<boolean>;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({
  onGetLogs,
  onClearLogs,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    const list = await onGetLogs();
    setLogs(list);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = async () => {
    await onClearLogs();
    setLogs([]);
  };

  const filteredLogs = logs.filter((line) =>
    line.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white tracking-tight">
            Core Engine Logs
          </h2>
          <p className="text-xs font-['Plus_Jakarta_Sans',sans-serif] text-slate-400">
            Real-time output stream from sing-box / Xray-core
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoScroll
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Auto-scroll</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter logs (e.g. error, inbound, proxy)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
        />
      </div>

      {/* Logs Console Container */}
      <div className="flex-1 bg-surface-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto text-[11px] leading-relaxed select-text space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-10 font-sans">
            No log entries yet. Connect to a server to see live activity.
          </div>
        ) : (
          filteredLogs.map((line, idx) => {
            let color = 'text-slate-300';
            if (line.includes('Error') || line.includes('error') || line.includes('failed')) {
              color = 'text-rose-400 font-bold';
            } else if (line.includes('warn')) {
              color = 'text-amber-400';
            } else if (line.includes('[sing-box]') || line.includes('[Xray]')) {
              color = 'text-emerald-400';
            }
            return (
              <div key={idx} className={`${color} whitespace-pre-wrap break-all`}>
                {line}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
