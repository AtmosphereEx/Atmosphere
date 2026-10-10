import React, { useState } from 'react';
import { 
  Rss, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Calendar,
  AlertCircle,
  Clipboard
} from 'lucide-react';
import { Subscription, AppSettings } from '../types';
import { useI18n } from '../i18n';

interface SubscriptionsProps {
  subscriptions: Subscription[];
  settings: AppSettings;
  onAddSubscription: (name: string, url: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateSubscription: (id: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteSubscription: (id: string) => void;
  onImportClipboard: () => Promise<void>;
  isImportingClipboard?: boolean;
  isOpenAdd: boolean;
  onCloseAdd: () => void;
  onOpenAdd: () => void;
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({
  subscriptions,
  settings,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onImportClipboard,
  isImportingClipboard,
  isOpenAdd,
  onCloseAdd,
  onOpenAdd,
}) => {
  const { t } = useI18n(settings.language || 'auto');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    const res = await onAddSubscription(name.trim() || 'Subscription', url.trim());
    setLoading(false);

    if (res.success) {
      setName('');
      setUrl('');
      onCloseAdd();
    } else {
      setError(res.error || t.importFailed);
    }
  };

  const handleUpdate = async (id: string) => {
    setUpdatingId(id);
    await onUpdateSubscription(id);
    setUpdatingId(null);
  };

  const handlePasteIntoUrl = async () => {
    try {
      if (window.api?.readClipboard) {
        const text = await window.api.readClipboard();
        if (text) {
          setUrl(text.trim());
          if (!name.trim()) {
            try {
              const u = new URL(text.trim());
              setName(u.hostname);
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight truncate">{t.subscriptions}</h2>
          <p className="text-xs text-slate-400 truncate">
            {t.autoSync}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onImportClipboard}
            disabled={isImportingClipboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-brand-400 transition-all"
            title={t.pasteFromClipboard}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.pasteFromClipboard}</span>
          </button>

          <button
            onClick={onOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addSubscription}</span>
          </button>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {isOpenAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">{t.addSubscription}</h3>
            <p className="text-xs text-slate-400 mb-4">
              V2Ray / Base64 / Clash / Sing-box subscription link
            </p>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.subName}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Fast Subscription"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {t.subUrl} *
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteIntoUrl}
                    className="text-[11px] text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>{t.pasteFromClipboard}</span>
                  </button>
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.subUrlPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 font-mono"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseAdd}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? t.connecting : t.import}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {subscriptions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center">
            <Rss className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
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
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-2xl p-4 flex items-center justify-between border border-slate-800/80 gap-3 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-slate-100 truncate min-w-0">
                    {sub.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold font-mono shrink-0 whitespace-nowrap">
                    {sub.nodeCount} {t.subCount}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-mono truncate mt-1 break-all block w-full">
                  {sub.url}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-2">
                  <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{t.updatedAt}: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : 'Never'}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleUpdate(sub.id)}
                  disabled={updatingId === sub.id}
                  title={t.updateSub}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-brand-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${updatingId === sub.id ? 'animate-spin text-brand-400' : ''}`} />
                </button>

                <button
                  onClick={() => onDeleteSubscription(sub.id)}
                  title={t.deleteSub}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
