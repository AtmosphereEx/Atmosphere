import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowLeft, 
  Trash2, 
  Copy, 
  FileText, 
  FolderOpen, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { useI18n } from '../i18n';
import { AppSettings } from '../types';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const LogModal: React.FC<LogModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const { t, lang } = useI18n(settings.language || 'auto');
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [logPath, setLogPath] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (window.api?.getLogs) {
      const data = await window.api.getLogs();
      setLogs(data);
    }
    if (window.api?.getLogFilePath) {
      const path = await window.api.getLogFilePath();
      setLogPath(path);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();

      if (window.events?.onLogLine) {
        const unsub = window.events.onLogLine((line) => {
          setLogs((prev) => [...prev, line]);
        });
        return () => unsub();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = async () => {
    if (window.api?.clearLogs) {
      await window.api.clearLogs();
      setLogs([]);
    }
  };

  const handleOpenFile = () => {
    if (window.api?.openLogFile) {
      window.api.openLogFile();
    }
  };

  const handleOpenDir = () => {
    if (window.api?.openLogDir) {
      window.api.openLogDir();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/90 select-none">
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[720px] bg-black border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header with App Icon */}
        <div className="p-3 sm:p-3.5 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
              title={lang === 'ru' ? 'Назад' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img 
              src="/icon.png" 
              alt="AtmosphereEx" 
              className="w-5 h-5 rounded-md object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-white tracking-tight truncate">
                {lang === 'ru' ? 'Журнал логов' : 'System Logs'}
              </h2>
              {logPath && (
                <div className="text-[10px] text-zinc-500 font-mono truncate hidden min-[480px]:block max-w-[200px]">
                  {logPath}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar - Guaranteed to never overflow */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={handleOpenFile}
              title={lang === 'ru' ? 'Открыть файл в Блокноте' : 'Open in Notepad'}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden min-[520px]:inline">{lang === 'ru' ? 'Файл' : 'File'}</span>
            </button>

            <button
              onClick={handleOpenDir}
              title={lang === 'ru' ? 'Открыть папку' : 'Open folder'}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopy}
              title={lang === 'ru' ? 'Копировать все логи' : 'Copy all'}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleClear}
              title={lang === 'ru' ? 'Очистить' : 'Clear'}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-800 transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title={lang === 'ru' ? 'Закрыть' : 'Close'}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-all cursor-pointer shrink-0 ml-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal log view */}
        <div
          ref={logContainerRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed bg-black/90 text-slate-300 select-text"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <span>{lang === 'ru' ? 'Журнал пока пуст' : 'No log entries yet'}</span>
            </div>
          ) : (
            logs.map((line, idx) => {
              let color = 'text-slate-300';
              if (line.includes('[Error]') || line.includes('FATAL') || line.includes('panic') || line.includes('error')) {
                color = 'text-rose-400 font-bold';
              } else if (line.includes('WARN') || line.includes('[Warning]')) {
                color = 'text-amber-400';
              } else if (line.includes('outbound connection') || line.includes('started') || line.includes('success')) {
                color = 'text-emerald-400';
              } else if (line.includes('DEBUG') || line.includes('TRACE')) {
                color = 'text-slate-500';
              }
              return (
                <div key={idx} className={`whitespace-pre-wrap break-all ${color}`}>
                  {line}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>{lang === 'ru' ? 'Всего записей' : 'Total lines'}: {logs.length}</span>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{lang === 'ru' ? 'Обновить' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
