import React, { useState } from 'react';
import { X, Link2, Sliders, AlertCircle, Clipboard } from 'lucide-react';
import { ProxyNode, ProtocolType, AppSettings } from '../types';
import { useI18n } from '../i18n';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (data: string | Partial<ProxyNode>) => Promise<{ success: boolean; error?: string }>;
  settings: AppSettings;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  onAddNode,
  settings,
}) => {
  const { t } = useI18n(settings.language || 'auto');
  const [tab, setTab] = useState<'link' | 'manual'>('link');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual fields
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ProtocolType>('vless');
  const [server, setServer] = useState('');
  const [port, setPort] = useState(443);
  const [uuid, setUuid] = useState('');
  const [password, setPassword] = useState('');
  const [network, setNetwork] = useState<'tcp' | 'ws' | 'grpc'>('tcp');
  const [security, setSecurity] = useState<'none' | 'tls' | 'reality'>('reality');
  const [sni, setSni] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [shortId, setShortId] = useState('');

  if (!isOpen) return null;

  const handlePasteIntoLink = async () => {
    try {
      if (window.api?.readClipboard) {
        const text = await window.api.readClipboard();
        if (text) setLink(text.trim());
      }
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'link') {
        if (!link.trim()) {
          setError('Please paste a connection link');
          setLoading(false);
          return;
        }
        const res = await onAddNode(link.trim());
        if (res.success) {
          setLink('');
          onClose();
        } else {
          setError(res.error || 'Failed to parse link');
        }
      } else {
        if (!server.trim()) {
          setError('Server address is required');
          setLoading(false);
          return;
        }

        const data: Partial<ProxyNode> = {
          name: name.trim() || `${server}:${port}`,
          protocol,
          server: server.trim(),
          port: Number(port),
          uuid: uuid.trim() || undefined,
          password: password.trim() || undefined,
          network,
          security,
          sni: sni.trim() || undefined,
          publicKey: publicKey.trim() || undefined,
          shortId: shortId.trim() || undefined,
        };

        const res = await onAddNode(data);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Failed to add node');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">{t.addNode}</h3>
        <p className="text-xs text-slate-400 mb-4">
          VLESS (Reality/TLS), VMess, Trojan, or Shadowsocks
        </p>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'link'
                ? 'bg-slate-800 text-brand-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>URL Link (vless://, vmess://...)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'manual'
                ? 'bg-slate-800 text-brand-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual Form</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'link' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Configuration Link
                </label>
                <button
                  type="button"
                  onClick={handlePasteIntoLink}
                  className="text-[11px] text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>{t.pasteFromClipboard}</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="vless://uuid@host:port?security=reality&...#MyServer&#10;or vmess://..., trojan://..., ss://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 font-mono resize-none"
              />
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Fast Server"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Protocol
                  </label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as ProtocolType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Network
                  </label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="tcp">TCP</option>
                    <option value="ws">WebSocket (ws)</option>
                    <option value="grpc">gRPC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Server Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="1.2.3.4 or example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {protocol === 'vless' || protocol === 'vmess' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UUID
                  </label>
                  <input
                    type="text"
                    value={uuid}
                    onChange={(e) => setUuid(e.target.value)}
                    placeholder="UUID string"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password / Key
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Secret Password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security
                  </label>
                  <select
                    value={security}
                    onChange={(e) => setSecurity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="reality">Reality</option>
                    <option value="tls">TLS</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SNI / Server Name
                  </label>
                  <input
                    type="text"
                    value={sni}
                    onChange={(e) => setSni(e.target.value)}
                    placeholder="e.g. cloudflare.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {security === 'reality' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Public Key (pbk)
                    </label>
                    <input
                      type="text"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="Reality Public Key"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Short ID (sid)
                    </label>
                    <input
                      type="text"
                      value={shortId}
                      onChange={(e) => setShortId(e.target.value)}
                      placeholder="e.g. 01234567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
            >
              {loading ? t.connecting : t.addNode}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
