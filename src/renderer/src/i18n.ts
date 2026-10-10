export type Language = 'auto' | 'ru' | 'en';

export const translations = {
  ru: {
    appName: 'AtmosphereEx',
    appSubtitle: 'Next-Gen Proxy & Tunnel Suite',
    // Nav
    home: 'Главная',
    nodes: 'Серверы',
    subscriptions: 'Подписки',
    routing: 'Маршрутизация',
    logs: 'Журнал',
    settings: 'Настройки',
    // Status
    connected: 'Подключено',
    disconnected: 'Отключено',
    connecting: 'Подключение...',
    disconnecting: 'Отключение...',
    tapToConnect: 'ПОДКЛЮЧИТЬ',
    tapToDisconnect: 'ОТКЛЮЧИТЬ',
    readyToProtect: 'Готов к безопасному подключению',
    connectionEstablished: 'Безопасное соединение активно',
    // Telemetry
    download: 'Загрузка',
    upload: 'Отдача',
    duration: 'Время сессии',
    totalData: 'Всего данных',
    trafficSpeed: 'Скорость',
    // Node selection
    selectedNode: 'Активный сервер',
    noServerSelected: 'Сервер не выбран',
    chooseServer: 'Выбрать сервер',
    allServers: 'Все серверы',
    // Modes
    modeRule: 'По правилам',
    modeGlobal: 'Глобальный',
    modeDirect: 'Прямой',
    tunMode: 'TUN Адаптер',
    proxyMode: 'Системный прокси',
    // Empty state & quick import
    noNodesTitle: 'Нет добавленных серверов',
    noNodesDesc: 'Добавьте подписку или ссылку на сервер (VLESS, VMess, Trojan, Shadowsocks)',
    pasteFromClipboard: 'Вставить из буфера',
    addSubscription: 'Добавить подписку',
    addNode: 'Добавить сервер',
    importSuccess: 'Успешно импортировано',
    importFailed: 'Не удалось импортировать',
    clipboardEmpty: 'В буфере обмена нет подходящих ссылок',
    oneClickPaste: 'Импорт из буфера',
    // Subscriptions
    subName: 'Название подписки',
    subUrl: 'Ссылка на подписку',
    subUrlPlaceholder: 'https://example.com/api/v1/client/subscribe?...',
    subCount: 'серверов',
    updateSub: 'Обновить',
    deleteSub: 'Удалить',
    updatedAt: 'Обновлено',
    autoSync: 'Автоматическая синхронизация узлов',
    // Settings
    language: 'Язык интерфейса',
    systemDefault: 'Системный по умолчанию',
    coreEngine: 'Сетевое ядро',
    connectionMethod: 'Режим перехвата трафика',
    inboundPorts: 'Локальные порты',
    mixedPort: 'Смешанный порт (HTTP/SOCKS5)',
    socksPort: 'SOCKS5 порт',
    tunStack: 'Драйвер сетевого стека TUN',
    autoConnectOnLaunch: 'Автоподключение при старте',
    bypassLAN: 'Обход локальной сети (LAN)',
    bypassDomestic: 'Обход локальных и домашних сайтов',
    clearLogs: 'Очистить журнал',
    copyLogs: 'Копировать журнал',
    cancel: 'Отмена',
    import: 'Импортировать',
    save: 'Сохранить',
    pingAll: 'Проверить пинг',
    searchServers: 'Поиск серверов по имени или IP...',
    timeout: 'Таймаут',
    rulesDescription: 'Управление распределением трафика между прямым доступом и туннелем',
    ruleModeDesc: 'Отечественные сервисы и локальная сеть идут напрямую, заблокированные — через прокси.',
    globalModeDesc: 'Весь сетевой трафик компьютера направляется через выбранный сервер.',
    directModeDesc: 'Трафик идет напрямую мимо прокси (полезно для диагностики).',
    coreStatus: 'Статус сетевых ядер',
    installed: 'Установлено',
  },
  en: {
    appName: 'AtmosphereEx',
    appSubtitle: 'Next-Gen Proxy & Tunnel Suite',
    // Nav
    home: 'Home',
    nodes: 'Servers',
    subscriptions: 'Subscriptions',
    routing: 'Routing Rules',
    logs: 'Core Logs',
    settings: 'Settings',
    // Status
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    disconnecting: 'Disconnecting...',
    tapToConnect: 'CONNECT',
    tapToDisconnect: 'DISCONNECT',
    readyToProtect: 'Ready to secure your connection',
    connectionEstablished: 'Secure tunnel active',
    // Telemetry
    download: 'Download',
    upload: 'Upload',
    duration: 'Session Uptime',
    totalData: 'Total Data',
    trafficSpeed: 'Speed',
    // Node selection
    selectedNode: 'Active Server',
    noServerSelected: 'No Server Selected',
    chooseServer: 'Choose Server',
    allServers: 'All Servers',
    // Modes
    modeRule: 'Rule',
    modeGlobal: 'Global',
    modeDirect: 'Direct',
    tunMode: 'TUN Adapter',
    proxyMode: 'System Proxy',
    // Empty state & quick import
    noNodesTitle: 'No servers added yet',
    noNodesDesc: 'Add a subscription URL or paste server links (VLESS, VMess, Trojan, Shadowsocks)',
    pasteFromClipboard: 'Paste from Clipboard',
    addSubscription: 'Add Subscription',
    addNode: 'Add Server',
    importSuccess: 'Successfully imported',
    importFailed: 'Failed to import',
    clipboardEmpty: 'No valid proxy link or subscription found in clipboard',
    oneClickPaste: 'Import from Clipboard',
    // Subscriptions
    subName: 'Subscription Name',
    subUrl: 'Subscription URL',
    subUrlPlaceholder: 'https://example.com/api/v1/client/subscribe?...',
    subCount: 'servers',
    updateSub: 'Update',
    deleteSub: 'Delete',
    updatedAt: 'Updated',
    autoSync: 'Automated remote node synchronization',
    // Settings
    language: 'Interface Language',
    systemDefault: 'System Default',
    coreEngine: 'Core Engine',
    connectionMethod: 'Traffic Interception Mode',
    inboundPorts: 'Local Inbound Ports',
    mixedPort: 'Mixed Port (HTTP/SOCKS5)',
    socksPort: 'SOCKS5 Port',
    tunStack: 'TUN Network Stack Driver',
    autoConnectOnLaunch: 'Auto-connect on launch',
    bypassLAN: 'Bypass Local Network (LAN)',
    bypassDomestic: 'Bypass Domestic/Local Sites',
    clearLogs: 'Clear Logs',
    copyLogs: 'Copy Logs',
    cancel: 'Cancel',
    import: 'Import',
    save: 'Save',
    pingAll: 'Ping All',
    searchServers: 'Search servers by name or IP...',
    timeout: 'Timeout',
    rulesDescription: 'Manage how network traffic is routed between direct and proxy tunnels',
    ruleModeDesc: 'Domestic services and LAN bypass proxy directly, foreign blocked sites route via AtmosphereEx tunnel.',
    globalModeDesc: 'All network traffic from the PC is routed through the proxy tunnel.',
    directModeDesc: 'All traffic bypasses the proxy engine directly.',
    coreStatus: 'Core Engines Status',
    installed: 'Installed',
  }
};

export function getActiveLanguage(setting: Language): 'ru' | 'en' {
  if (setting === 'ru') return 'ru';
  if (setting === 'en') return 'en';
  // auto: detect from browser / system
  try {
    const navLang = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
    if (navLang.toLowerCase().startsWith('ru')) {
      return 'ru';
    }
  } catch (e) {}
  return 'en';
}

export function useI18n(langSetting: Language) {
  const lang = getActiveLanguage(langSetting);
  return {
    t: translations[lang],
    lang,
  };
}
