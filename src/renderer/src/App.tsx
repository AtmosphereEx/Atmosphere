import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ServerModal } from './components/ServerModal';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { SettingsModal } from './components/SettingsModal';
import { LogModal } from './components/LogModal';
import { 
  ConnectionState, 
  AppSettings, 
  ProxyNode, 
  Subscription 
} from './types';
import { useI18n } from './i18n';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    activeNodeId: null,
    activeCore: 'sing-box',
    uptimeSeconds: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalUploaded: 0,
    totalDownloaded: 0,
    coreRunning: false,
    coreError: null,
  });

  const [settings, setSettings] = useState<AppSettings>({
    language: 'auto',
    activeCore: 'sing-box',
    connectionMode: 'tun',
    routeMode: 'rule',
    mixedPort: 2080,
    socksPort: 2081,
    httpPort: 2082,
    autoStartOnBoot: false,
    autoConnect: false,
    tunStack: 'mixed',
    bypassLAN: true,
    bypassDomestic: true,
  });

  const { t, lang } = useI18n(settings.language || 'auto');

  const [nodes, setNodes] = useState<ProxyNode[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [connectingAction, setConnectingAction] = useState<'idle' | 'connecting' | 'disconnecting'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isImportingClipboard, setIsImportingClipboard] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load state from Electron main process
  const reloadState = async () => {
    try {
      if (window.api && window.api.getState) {
        const state = await window.api.getState();
        setConnection(state.connection);
        setSettings(state.settings);
        setNodes(state.nodes);
        setSubscriptions(state.subscriptions);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  };

  useEffect(() => {
    reloadState();

    if (window.events?.onConnectionUpdate) {
      const unsub = window.events.onConnectionUpdate((updated) => {
        setConnection(updated);
      });
      return () => unsub();
    }
  }, []);

  const activeNode = nodes.find((n) => n.id === connection.activeNodeId) || (nodes.length > 0 ? nodes[0] : null);
  const isConnecting = connectingAction !== 'idle';

  const handleToggleConnect = async () => {
    if (!window.api || connectingAction !== 'idle') return;
    const isCurrentlyConnected = connection.isConnected;
    setConnectingAction(isCurrentlyConnected ? 'disconnecting' : 'connecting');

    try {
      if (isCurrentlyConnected) {
        await window.api.disconnect();
      } else {
        await window.api.connect(activeNode?.id);
      }
      await reloadState();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Connection error', 'error');
    } finally {
      setTimeout(() => {
        setConnectingAction('idle');
      }, 500);
    }
  };

  const handleSelectNode = async (nodeId: string) => {
    if (!window.api) return;
    await window.api.selectNode(nodeId);
    await reloadState();
    const selected = nodes.find(n => n.id === nodeId);
    if (selected) {
      showToast(`${lang === 'ru' ? 'Выбран' : 'Selected'}: ${selected.name}`);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.api) return;
    await window.api.deleteNode(nodeId);
    await reloadState();
  };

  const handlePingNode = async (nodeId: string) => {
    if (!window.api) return;
    const latency = await window.api.pingNode(nodeId);
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, latency } : n))
    );
  };

  const handlePingAll = async () => {
    if (!window.api) return;
    setIsRefreshing(true);
    try {
      const results = await window.api.pingAllNodes();
      setNodes((prev) =>
        prev.map((n) => (results[n.id] !== undefined ? { ...n, latency: results[n.id] } : n))
      );
      showToast(lang === 'ru' ? 'Пинг всех серверов обновлен' : 'Ping updated');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportClipboard = async () => {
    if (!window.api?.importFromClipboard) return;
    setIsImportingClipboard(true);
    try {
      const res = await window.api.importFromClipboard();
      if (res.success) {
        await reloadState();
        showToast(`${t.importSuccess}: +${res.count || 1} ${t.subCount}`, 'success');
      } else {
        showToast(res.error || t.clipboardEmpty, 'error');
      }
    } catch (e: any) {
      showToast(e.message || t.importFailed, 'error');
    } finally {
      setIsImportingClipboard(false);
    }
  };

  const handleAddSubscription = async (name: string, url: string) => {
    if (!window.api) return { success: false, error: 'API unavailable' };
    const res = await window.api.addSubscription(name, url);
    if (res.success) {
      await reloadState();
      showToast(`${t.importSuccess}: +${res.count || 0} ${t.subCount}`, 'success');
    }
    return res;
  };

  const handleUpdateSubscription = async (subId: string) => {
    if (!window.api?.updateSubscription) return;
    try {
      const res = await window.api.updateSubscription(subId);
      if (res.success) {
        await reloadState();
        showToast(
          lang === 'ru'
            ? `Подписка обновлена (+${res.count || 0} ${t.subCount})`
            : `Subscription updated (+${res.count || 0} ${t.subCount})`,
          'success'
        );
      } else {
        showToast(res.error || (lang === 'ru' ? 'Ошибка обновления' : 'Update failed'), 'error');
      }
    } catch (e: any) {
      showToast(e.message || (lang === 'ru' ? 'Ошибка обновления' : 'Update failed'), 'error');
    }
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    if (!window.api) return;
    const updated = await window.api.updateSettings(partial);
    setSettings(updated);
    await reloadState();
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-zinc-100 antialiased font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Deep Atmospheric Spatial Mesh */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* 2. Stratospheric Atmospheric Depth Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 36%, rgba(15, 30, 54, 0.45) 0%, rgba(8, 14, 26, 0.85) 55%, rgba(2, 3, 6, 0.98) 100%)',
        }}
      />

      {/* 3. Subtle Ethereal Aurora Glow in Upper Atmosphere */}
      <div 
        className="absolute top-0 inset-x-0 h-80 pointer-events-none z-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 70%)',
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-4 z-50">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-2xl text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-zinc-900 border-zinc-700 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 text-zinc-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Modern Compact Header */}
      <Header
        connection={connection}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAdd={() => setIsAddModalOpen(true)}
        onOpenLogs={() => setIsLogModalOpen(true)}
      />

      {/* Main Single-View Dashboard */}
      <main className="flex-1 flex overflow-hidden z-10">
        <Dashboard
          connection={connection}
          activeNode={activeNode}
          subscriptions={subscriptions}
          settings={settings}
          onToggleConnect={handleToggleConnect}
          onOpenServers={() => setIsServerModalOpen(true)}
          onUpdateSettings={handleUpdateSettings}
          isConnecting={isConnecting}
          connectingAction={connectingAction}
        />
      </main>

      {/* Server Selection Modal */}
      <ServerModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        nodes={nodes}
        subscriptions={subscriptions}
        activeNodeId={connection.activeNodeId || (activeNode ? activeNode.id : null)}
        settings={settings}
        onSelectNode={handleSelectNode}
        onDeleteNode={handleDeleteNode}
        onPingNode={handlePingNode}
        onPingAll={handlePingAll}
        onUpdateSubscription={handleUpdateSubscription}
        onOpenAdd={() => setIsAddModalOpen(true)}
        isPinging={isRefreshing}
      />

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        settings={settings}
        onAddSubscription={handleAddSubscription}
        onImportClipboard={handleImportClipboard}
        isImportingClipboard={isImportingClipboard}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onCheckCores={() => window.api.checkCores()}
        onOpenLogs={() => setIsLogModalOpen(true)}
      />

      {/* System & Core Log Modal */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        settings={settings}
      />
    </div>
  );
};
