import './index.css';
import { parseRegistry, generateBlueZInfo, downloadFile, copyToClipboard, SAMPLE_REGISTRY, ParsedDevice } from './bluetooth-converter';

// 状态管理
let parsedDevices: ParsedDevice[] = [];
let selectedDeviceIndex = 0;

export function initApp(): void {
  const app = document.getElementById('app');

  if (!app) {
    console.error('App element not found');
    return;
  }

  renderApp(app);
}

function renderApp(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <!-- Header -->
      <header class="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold">Win11 到 Ubuntu 蓝牙鼠标信息转换器</h1>
              <p class="text-sm text-slate-400">将 Windows 注册表蓝牙设备信息转换为 Ubuntu BlueZ 格式</p>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Input Panel -->
          <div class="bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-semibold">Windows 注册表信息</h2>
              </div>
              <button id="loadSample" class="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                加载示例
              </button>
            </div>
            <div class="p-6">
              <textarea
                id="registryInput"
                class="w-full h-48 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-sm font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="粘贴 Windows 注册表中的蓝牙设备信息...

从以下路径导出完整内容：
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters\Keys\
（需要包含适配器级别和设备级别的完整信息）"></textarea>
              
              <!-- Device Name Input -->
              <div class="mt-4">
                <label class="block text-sm text-slate-400 mb-2">
                  <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  设备名称（用于生成的 info 文件）
                </label>
                <input
                  type="text"
                  id="deviceNameInput"
                  value="Bluetooth Mouse M336/M337/M535"
                  class="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div class="mt-4 flex items-center gap-3">
                <button id="parseBtn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  解析
                </button>
                <button id="clearBtn" class="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
                  清空
                </button>
              </div>
            </div>
          </div>

          <!-- Output Panel -->
          <div class="bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-700/50">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 class="text-lg font-semibold">Ubuntu BlueZ Info 文件</h2>
              </div>
            </div>
            <div class="p-6">
              <!-- Device Selector -->
              <div id="deviceSelector" class="mb-4 hidden">
                <label class="block text-sm text-slate-400 mb-2">
                  <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                  </svg>
                  选择蓝牙鼠标对应的设备：
                </label>
                <select id="deviceSelect" class="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500">
                </select>
                <p class="mt-2 text-xs text-slate-500">
                  提示：没有详细信息的设备会使用第一个设备的共享数据（LTK、IRK、EDIV等），但 LinkKey 使用各自对应的值。
                </p>
              </div>

              <textarea
                id="outputArea"
                class="w-full h-48 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-sm font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="转换后的 Ubuntu BlueZ info 文件将显示在这里..."
                readonly
              ></textarea>

              <!-- Info Display -->
              <div id="deviceInfo" class="mt-4 hidden">
                <h3 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  解析结果
                </h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-900/30 rounded-lg p-3">
                    <div class="text-xs text-slate-500 mb-1">设备键</div>
                    <div id="infoDeviceKey" class="text-sm font-medium text-slate-200">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3">
                    <div class="text-xs text-slate-500 mb-1">蓝牙地址</div>
                    <div id="infoAddress" class="text-sm font-medium text-slate-200">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3">
                    <div class="text-xs text-slate-500 mb-1">LongTermKey.Key</div>
                    <div id="infoLtk" class="text-sm font-medium text-slate-200 font-mono truncate">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3">
                    <div class="text-xs text-slate-500 mb-1">EDiv</div>
                    <div id="infoEdiv" class="text-sm font-medium text-slate-200">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3 col-span-2">
                    <div class="text-xs text-slate-500 mb-1">Rand</div>
                    <div id="infoRand" class="text-sm font-medium text-slate-200 font-mono">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3 col-span-2">
                    <div class="text-xs text-slate-500 mb-1">IdentityResolvingKey.Key</div>
                    <div id="infoIrk" class="text-sm font-medium text-slate-200 font-mono truncate">-</div>
                  </div>
                  <div class="bg-slate-900/30 rounded-lg p-3 col-span-2 bg-blue-900/20 border border-blue-700/30">
                    <div class="text-xs text-blue-400 mb-1">LinkKey.Key（根据选择的设备生成）</div>
                    <div id="infoLinkKey" class="text-sm font-medium text-blue-200 font-mono truncate">-</div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex items-center gap-3">
                <button id="copyBtn" class="px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  复制
                </button>
                <button id="downloadBtn" class="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  下载 info 文件
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="mt-8 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            使用说明
          </h3>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">1</div>
              <div>
                <h4 class="font-medium mb-1">导出 Windows 注册表</h4>
                <p class="text-sm text-slate-400">在 Windows 中打开 regedit，导航到以下路径并右键导出整个 Keys 项：</p>
                <code class="mt-2 block text-xs bg-slate-700 p-2 rounded break-all">HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters\Keys</code>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">2</div>
              <div>
                <h4 class="font-medium mb-1">粘贴并选择设备</h4>
                <p class="text-sm text-slate-400">将导出的 .reg 文件内容粘贴到左侧，填写设备名称，从列表中选择蓝牙鼠标对应的设备，点击"解析"。</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">3</div>
              <div>
                <h4 class="font-medium mb-1">部署到 Ubuntu</h4>
                <p class="text-sm text-slate-400">下载 info 文件，保存到适配器目录：</p>
                <code class="mt-2 block text-xs bg-slate-700 p-2 rounded break-all">/var/lib/bluetooth/[适配器地址]/[设备地址]/info</code>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Toast Notification -->
      <div id="toast" class="fixed bottom-6 right-6 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 flex items-center gap-3">
        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span id="toastMessage" class="text-sm">操作成功</span>
      </div>
    </div>
  `;

  // 添加事件监听
  setupEventListeners();
}

function setupEventListeners(): void {
  const registryInput = document.getElementById('registryInput') as HTMLTextAreaElement;
  const parseBtn = document.getElementById('parseBtn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const loadSampleBtn = document.getElementById('loadSample') as HTMLButtonElement;
  const outputArea = document.getElementById('outputArea') as HTMLTextAreaElement;
  const deviceSelect = document.getElementById('deviceSelect') as HTMLSelectElement;
  const deviceSelector = document.getElementById('deviceSelector') as HTMLDivElement;
  const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
  const deviceInfo = document.getElementById('deviceInfo') as HTMLDivElement;
  const deviceNameInput = document.getElementById('deviceNameInput') as HTMLInputElement;

  // 加载示例
  loadSampleBtn.addEventListener('click', () => {
    registryInput.value = SAMPLE_REGISTRY;
    deviceNameInput.value = 'Bluetooth Mouse M336';
    showToast('已加载示例数据');
  });

  // 解析
  parseBtn.addEventListener('click', () => {
    const input = registryInput.value.trim();
    if (!input) {
      showToast('请先输入注册表信息');
      return;
    }

    const deviceName = deviceNameInput.value.trim();
    if (!deviceName) {
      showToast('请输入设备名称');
      deviceNameInput.focus();
      return;
    }

    try {
      parsedDevices = parseRegistry(input);

      if (parsedDevices.length === 0) {
        showToast('未能解析到蓝牙设备信息');
        return;
      }

      selectedDeviceIndex = 0;
      updateDeviceSelector();
      updateOutput();
      showToast(`成功解析 ${parsedDevices.length} 个设备`);
    } catch (error) {
      showToast(`解析错误: ${(error as Error).message}`);
      console.error('解析错误:', error);
    }
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    registryInput.value = '';
    deviceNameInput.value = '';
    outputArea.value = '';
    parsedDevices = [];
    selectedDeviceIndex = 0;
    deviceSelector.classList.add('hidden');
    deviceInfo.classList.add('hidden');
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    showToast('已清空');
  });

  // 设备选择
  deviceSelect.addEventListener('change', () => {
    selectedDeviceIndex = parseInt(deviceSelect.value);
    updateOutput();
  });

  // 防抖函数
  function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // 实时预览功能
  const debouncedParse = debounce(() => {
    const input = registryInput.value.trim();
    const deviceName = deviceNameInput.value.trim();
    
    if (!input || !deviceName) {
      return;
    }

    try {
      parsedDevices = parseRegistry(input);
      
      if (parsedDevices.length > 0) {
        selectedDeviceIndex = 0;
        updateDeviceSelector();
        updateOutput();
      }
    } catch (error) {
      // 实时预览时不显示错误，避免干扰用户输入
      console.debug('实时预览解析错误:', error);
    }
  }, 500);

  // 注册表输入变化时触发实时预览
  registryInput.addEventListener('input', debouncedParse);
  
  // 设备名称变化时更新输出
  deviceNameInput.addEventListener('input', () => {
    if (parsedDevices.length > 0) {
      updateOutput();
    } else {
      debouncedParse();
    }
  });

  // 复制
  copyBtn.addEventListener('click', async () => {
    const text = outputArea.value;
    const success = await copyToClipboard(text);
    if (success) {
      showToast('已复制到剪贴板');
    } else {
      showToast('复制失败，请手动选择复制');
    }
  });

  // 下载
  downloadBtn.addEventListener('click', () => {
    const device = parsedDevices[selectedDeviceIndex];
    const content = outputArea.value;
    if (device) {
      // 将 deviceKey 转换为 Ubuntu MAC 格式 (如 C5:C2:72:04:2E:A6)
      const macAddress = device.deviceKey.replace(/([0-9a-fA-F]{2})/g, '$1:').replace(/:$/, '').toUpperCase();
      downloadFile(content, `${macAddress}.info`);
    } else {
      downloadFile(content, 'bluetooth_info.info');
    }
    showToast('文件已下载');
  });

  function updateDeviceSelector(): void {
    deviceSelect.innerHTML = '';
    parsedDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      // 显示设备键和 MAC 地址
      option.textContent = `${device.deviceKey} (${device.address}) ${device.hasDetails ? '' : '- 共享数据'}`;
      deviceSelect.appendChild(option);
    });
    deviceSelector.classList.remove('hidden');
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  }

  function updateOutput(): void {
    const device = parsedDevices[selectedDeviceIndex];
    if (!device) return;

    const deviceName = deviceNameInput.value.trim() || device.name || 'Unknown Device';
    const info = generateBlueZInfo(device, deviceName);
    outputArea.value = info;

    // 更新设备信息显示
    deviceInfo.classList.remove('hidden');
    (document.getElementById('infoDeviceKey') as HTMLDivElement).textContent = device.deviceKey;
    (document.getElementById('infoAddress') as HTMLDivElement).textContent = device.address;
    (document.getElementById('infoLtk') as HTMLDivElement).textContent = device.ltk || '-';
    (document.getElementById('infoEdiv') as HTMLDivElement).textContent = device.ediv?.toString() || '-';
    (document.getElementById('infoRand') as HTMLDivElement).textContent = device.erand?.toString() || '-';
    (document.getElementById('infoIrk') as HTMLDivElement).textContent = device.irk || '-';
    (document.getElementById('infoLinkKey') as HTMLDivElement).textContent = device.linkKey || '-';
  }
}

function showToast(message: string): void {
  const toast = document.getElementById('toast') as HTMLDivElement;
  const toastMessage = document.getElementById('toastMessage') as HTMLSpanElement;

  toastMessage.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2500);
}
