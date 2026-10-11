<div align="center">

# AtmosphereEx

**Next-Gen Proxy & Network Tunneling Suite for Windows**  
*Современный клиент защищённой маршрутизации и сетевого туннелирования для Windows*

<p align="center">
  <a href="#english">English</a> •
  <a href="#русский">Русский</a>
</p>

---

</div>

<a name="english"></a>
## 🇬🇧 English

### Overview
**AtmosphereEx** is a lightweight, high-performance proxy and network tunneling client built specifically for Windows. It combines a native .NET Framework host with Microsoft Edge WebView2 and a modern, responsive React interface.

Unlike bulky Electron-based applications, AtmosphereEx consumes minimal system resources while providing enterprise-grade tunneling capabilities through deep integration with **sing-box** and **Xray-core**.

---

### Key Features
- **Dual-Engine Architecture:**
  - `sing-box` (v1.14+) — High-performance L3 TUN virtual adapter (`Wintun`), gVisor stack, and low-latency DNS routing.
  - `Xray-core` (v26.3+) — Advanced transport protocols including VLESS XTLS Reality, gRPC, WebSocket, and XHTTP.
- **Protocol Support:**
  - `VLESS` (XTLS Reality, TLS, WebSocket, gRPC, XHTTP / SplitHTTP)
  - `VMess` (WebSocket, TLS, gRPC)
  - `Trojan` (TLS)
  - `Shadowsocks` (AEAD ciphers)
- **Flexible Connection Modes:**
  - **TUN Mode (Virtual Adapter):** Full-system network encapsulation via the kernel-level `Wintun` driver. Captures traffic from all applications and games seamlessly.
  - **System Proxy Mode:** Automatic configuration and teardown of Windows WinINet HTTP/SOCKS proxy parameters.
- **Smart Routing:**
  - Direct routing for local area networks (LAN) and domestic resources.
  - Automatic proxying for restricted and blocked destinations.
  - IPv6 leak prevention and integrated DNS sniffing.
  - Hot-switching between nodes without resetting the TUN adapter.
- **Security & Privacy:**
  - Strict TLS chain verification with Root CA cryptographic thumbprint pinning.
  - Zero bundled subscriptions, zero third-party telemetry, zero user tracking.
  - Origin-locked local IPC bridge (`https://atmosphere.local`).

---

### Project Structure
```text
atmosphere_code/
├── assets/                  # Application icons (.ico, .png)
├── scripts/                 # Build scripts & native backend host
│   ├── PulseHost.cs         # WinForms / WebView2 native host (AtmosphereEx.exe)
│   ├── AtmosphereInstaller.cs # Standalone self-extracting installer
│   ├── build_installer.ps1  # Automated installer compiler
│   ├── create_shortcut.ps1  # Shortcut generation utility
│   └── download-cores.js    # Automated sing-box / xray / wintun downloader
├── src/
│   ├── renderer/            # React + Vite + Tailwind CSS frontend
│   └── shared/              # Shared TypeScript definitions
├── package.json             # Node dependencies and build scripts
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite bundler configuration
```

---

### Building from Source

#### Prerequisites
- **Windows 10 / 11** (64-bit)
- **Node.js** v18+ & **npm**
- **.NET Framework 4.8** (included with modern Windows)
- **Microsoft Edge WebView2 Runtime**

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/atmosphere.git
cd atmosphere
npm install
```

#### 2. Download Network Cores
Download `sing-box`, `xray`, `wintun.dll`, and geo-databases into the `bin/` directory:
```bash
node scripts/download-cores.js
```

#### 3. Build Web Interface
```bash
npm run build:renderer
```

#### 4. Compile Native Host (`AtmosphereEx.exe`)
Run in PowerShell:
```powershell
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /out:"AtmosphereEx.exe" /win32icon:"assets\icon.ico" /reference:System.Windows.Forms.dll,System.Drawing.dll,System.Web.Extensions.dll,"Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll" "scripts\PulseHost.cs"
```

#### 5. Build Installer (`AtmosphereEx-Setup.exe`)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_installer.ps1
```

---

<a name="русский"></a>
## 🇷🇺 Русский

### Описание
**AtmosphereEx** — легковесный и высокопроизводительный клиент маршрутизации и сетевого туннелирования для Windows. Приложение объединяет нативный системный хост на .NET Framework с Microsoft Edge WebView2 и современным интерфейсом на React и Tailwind CSS.

В отличие от тяжелых решений на базе Electron, AtmosphereEx практически не нагружает оперативную память и процессор, обеспечивая при этом максимальную стабильность благодаря тесной интеграции с ядрами **sing-box** и **Xray-core**.

---

### Основные возможности
- **Двухъядерная система:**
  - `sing-box` (v1.14+) — виртуальный L3 TUN-адаптер на базе драйвера `Wintun`, сетевой стек gVisor, низкие задержки при DNS-запросах.
  - `Xray-core` (v26.3+) — поддержка всех современных протоколов обхода, включая VLESS XTLS Reality, gRPC, WebSocket и XHTTP.
- **Поддерживаемые протоколы:**
  - `VLESS` (XTLS Reality, TLS, WebSocket, gRPC, XHTTP / SplitHTTP)
  - `VMess` (WebSocket, TLS, gRPC)
  - `Trojan` (TLS)
  - `Shadowsocks` (AEAD-шифрование)
- **Режимы подключения:**
  - **TUN-режим (Виртуальный адаптер):** полный захват системного трафика на уровне ядра через драйвер `Wintun`. Все программы, браузеры и игры работают через туннель без дополнительной настройки.
  - **Системный прокси:** автоматическая настройка системных параметров прокси Windows (WinINet) с гарантированным сбросом при отключении.
- **Умная маршрутизация:**
  - Прямой доступ для локальной сети (LAN) и отечественных ресурсов.
  - Защищённый туннель для заблокированных и внешних ресурсов.
  - Защита от утечек IPv6 и встроенный сниффинг протоколов.
  - Мгновенное переключение между серверами без сброса TUN-адаптера.
- **Безопасность и приватность:**
  - Строгая валидация цепочек TLS с пиннингом отпечатков доверенных корневых центров сертификации (Root CA).
  - Никаких предустановленных подписок, сторонних серверов и скрытой телеметрии.
  - Локальный изолированный IPC-мост (`https://atmosphere.local`).

---

### Структура проекта
```text
atmosphere_code/
├── assets/                  # Иконки и графические ресурсы (.ico, .png)
├── scripts/                 # Скрипты сборки и бэкенд
│   ├── PulseHost.cs         # Нативный хост WinForms / WebView2 (AtmosphereEx.exe)
│   ├── AtmosphereInstaller.cs # Самораспаковывающийся инсталлятор
│   ├── build_installer.ps1  # Скрипт сборки инсталлятора
│   ├── create_shortcut.ps1  # Утилита создания ярлыков
│   └── download-cores.js    # Автоматическая загрузка ядер sing-box / xray / wintun
├── src/
│   ├── renderer/            # Веб-интерфейс на React + Vite + Tailwind CSS
│   └── shared/              # Общие типы TypeScript
├── package.json             # NPM-зависимости и сценарии
├── tsconfig.json            # Конфигурация TypeScript
└── vite.config.ts           # Конфигурация сборщика Vite
```

---

### Сборка из исходников

#### Требования к системе
- **Windows 10 / 11** (64-bit)
- **Node.js** v18+ и пакетный менеджер **npm**
- **.NET Framework 4.8** (входит в состав Windows)
- **Microsoft Edge WebView2 Runtime**

#### 1. Клонирование и установка зависимостей
```bash
git clone https://github.com/your-username/atmosphere.git
cd atmosphere
npm install
```

#### 2. Загрузка бинарных ядер
Скрипт автоматически скачает актуальные версии `sing-box`, `xray`, `wintun.dll` и базы гео-IP в папку `bin/`:
```bash
node scripts/download-cores.js
```

#### 3. Сборка фронтенда
```bash
npm run build:renderer
```

#### 4. Компиляция исполняемого файла (`AtmosphereEx.exe`)
Выполните команду в PowerShell:
```powershell
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /out:"AtmosphereEx.exe" /win32icon:"assets\icon.ico" /reference:System.Windows.Forms.dll,System.Drawing.dll,System.Web.Extensions.dll,"Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll" "scripts\PulseHost.cs"
```

#### 5. Сборка установщика (`AtmosphereEx-Setup.exe`)
Запустите скрипт автоматической сборки:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_installer.ps1
```

---

## Telegram
https://t.me/AtmosphereEx_vpn


## 📄 License / Лицензия

Distributed under the MIT License. See `LICENSE` for more information.
