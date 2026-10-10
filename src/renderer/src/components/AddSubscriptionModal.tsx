import React, { useState } from 'react';
import { X, Clipboard, Link as LinkIcon, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { AppSettings } from '../types';
import { useI18n } from '../i18n';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onAddSubscription: (name: string, url: string) => Promise<{ success: boolean; error?: string; count?: number }>;
  onImportClipboard: () => Promise<void>;
  isImportingClipboard?: boolean;
}

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  settings,
  onAddSubscription,
  onImportClipboard,
  isImportingClipboard,
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    const subName = name.trim() || 'Subscription';
    const res = await onAddSubscription(subName, url.trim());
    setLoading(false);

    if (res.success) {
      setUrl('');
      setName('');
      onClose();
    } else {
      setError(res.error || t.importFailed);
    }
  };

  const handlePasteClipboard = async () => {
    setError(null);
    try {
      await onImportClipboard();
      onClose();
    } catch (e: any) {
      setError(e.message || t.importFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 select-none">
      <div className="relative w-full max-w-md bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6">
        {/* Header with App Icon */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-850 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img 
              src="/icon.png" 
              alt="AtmosphereEx" 
              className="w-5 h-5 rounded-md object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                {lang === 'ru' ? 'Добавить подписку или ключ' : 'Add Subscription or Key'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                {lang === 'ru'
                  ? 'VLESS, VMess, Trojan, ShadowSocks'
                  : 'VLESS, VMess, Trojan, ShadowSocks'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Fast Import from Clipboard (High contrast Black & White) */}
        <div className="mt-5">
          <button
            onClick={handlePasteClipboard}
            disabled={isImportingClipboard}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <Clipboard className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isImportingClipboard
                ? (lang === 'ru' ? 'Импортируем...' : 'Importing...')
                : (lang === 'ru' ? 'Вставить из буфера (1 клик)' : 'Paste from Clipboard (1-Click)')}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold">
            <span className="bg-black px-2 text-zinc-500 font-mono">
              {lang === 'ru' ? 'или введите вручную' : 'or enter manually'}
            </span>
          </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {lang === 'ru' ? 'Ссылка на подписку или ключ:' : 'Subscription URL or Key:'}
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... или vless://..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {lang === 'ru' ? 'Название (необязательно, определится само):' : 'Name (optional, auto-detected):'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ru' ? 'Оставьте пустым для авто-названия' : 'Leave empty for auto-title'}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-1 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (lang === 'ru' ? 'Загрузка...' : 'Loading...') : (lang === 'ru' ? 'Добавить' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
