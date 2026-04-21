/**
 * Windows 注册表蓝牙设备信息到 Ubuntu BlueZ info 文件转换器
 * 
 * 功能：解析 Windows 11 注册表中的蓝牙设备信息，转换为 Ubuntu BlueZ 格式
 * 
 * 注册表格式：
 * - 适配器级别: [HKEY_LOCAL_MACHINE\...\Parameters\Keys\<适配器MAC>] 
 *   包含设备MAC到LinkKey的映射
 * - 设备级别: [HKEY_LOCAL_MACHINE\...\Parameters\Keys\<适配器MAC>\<设备MAC>]
 *   包含 LTK、IRK、EDIV、ERand 等详细信息
 */

// ==================== 类型定义 ====================

/** 解析后的设备信息 */
export interface ParsedDevice {
  /** 蓝牙 MAC 地址 */
  address: string;
  /** 设备名称 */
  name: string;
  /** 设备在注册表中的键 */
  deviceKey: string;
  /** LinkKey（从适配器级别获取） */
  linkKey?: string;
  /** Long Term Key */
  ltk?: string;
  /** Identity Resolving Key */
  irk?: string;
  /** Connection Signature Resolving Key */
  csrk?: string;
  /** Encrypted Diversifier */
  ediv?: number;
  /** Random Number (大整数，使用字符串存储以避免精度丢失) */
  erand?: string;
  /** 地址类型 (1=public, 0=random) */
  addressType?: number;
  /** 认证请求标志 */
  authReq?: number;
  /** 密钥长度 */
  keyLength?: number;
  /** 是否有详细信息块 */
  hasDetails: boolean;
}

// ==================== 工具函数 ====================

/**
 * 解析十六进制字节串为无分隔符字符串（大写）
 * @param hexStr 十六进制字符串，格式如 "a0,63,fb,5b"
 * @param reverse 是否反转字节顺序
 */
function parseHexBytesRaw(hexStr: string, reverse: boolean = false): string {
  const bytes = hexStr.split(',').map(b => b.trim().padStart(2, '0').toUpperCase());
  if (reverse) {
    bytes.reverse();
  }
  return bytes.join('');
}

/**
 * 解析十六进制字节串为大整数（用于 Rand）
 * Windows ERand 按相反顺序排列，需要反转后转换
 */
function parseHexToBigIntDecimal(hexStr: string, reverse: boolean = false): bigint {
  const bytes = hexStr.split(',').map(b => b.trim().padStart(2, '0').toUpperCase());
  if (reverse) {
    bytes.reverse();
  }
  const hexStr2 = bytes.join('');
  return BigInt('0x' + hexStr2);
}

/**
 * 解析 Bluetooth MAC 地址
 * Windows Address 字段为 8 字节，取后 6 字节并反序
 */
function parseBluetoothAddress(hexStr: string): string {
  const bytes = hexStr.split(',').map(b => b.trim().padStart(2, '0').toUpperCase());
  const macBytes = bytes.slice(0, 6).reverse();
  return macBytes.join(':');
}

/**
 * 格式化 MAC 地址（12字符 hex 转为 aa:bb:cc:dd:ee:ff）
 */
function formatMacAddress(hexStr: string): string {
  return hexStr.replace(/(..)/g, '$1:').slice(0, -1).toUpperCase();
}

// ==================== 示例数据 ====================

/** 示例注册表数据 */
const SAMPLE_REGISTRY = `Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys]

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188]
"201804092aed"=hex:a0,63,fb,5b,38,10,65,45,5b,20,40,b6,89,a6,be,f2
"7445ce3c6fea"=hex:e0,c5,a5,b0,88,d7,a3,50,57,ea,f6,a4,f4,80,77,20
"MasterIRK"=hex:b7,76,3f,b2,1e,6b,21,e8,7d,1d,53,4d,10,37,b9,f4
"c5c272042ea6"=hex:6f,aa,ba,cf,ed,26,7a,89,af,86,58,ea,77,98,74,e7
"34885db65ee7"=hex:4e,ef,63,f7,09,e2,f6,d3,a1,54,cf,df,7d,12,a5,78

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188\\c5c272042ea6]
"Address"=hex(b):a6,2e,04,72,c2,c5,00,00
"AddressType"=dword:00000001
"AuthReq"=dword:0000002d
"EDIV"=dword:0000a0a0
"ERand"=hex(b):99,b8,db,e0,c1,5d,c4,52
"IRK"=hex:6f,aa,ba,cf,ed,26,7a,89,af,86,58,ea,77,98,74,e7
"KeyLength"=dword:00000010
"LTK"=hex:2e,7c,c4,81,0b,ad,12,08,5e,11,a7,72,8b,af,11,79
"MasterIRKStatus"=dword:00000001
`;

// ==================== 核心解析函数 ====================

/**
 * 解析 Windows 注册表文本格式
 * 
 * 处理流程：
 * 1. 从适配器级别提取所有设备 MAC -> LinkKey 映射
 * 2. 从设备详细信息块提取共享数据（LTK、IRK、EDIV 等）
 * 3. 为所有设备创建完整的设备对象（共享详细信息，使用各自的 LinkKey）
 * 
 * @param registryText 注册表文本内容
 * @returns 解析后的设备数组
 */
export function parseRegistry(registryText: string): ParsedDevice[] {
  // 标准化路径：支持 ControlSet001, ControlSet002, CurrentControlSet
  const normalizedText = registryText.replace(/ControlSet\d+/g, 'ControlSetXXX');

  // 第一步：从适配器级别提取所有设备 MAC -> LinkKey 映射
  const allDeviceMappings = new Map<string, Map<string, string>>();
  
  const adapterRegex = /\[HKEY_LOCAL_MACHINE[^\]]*?\\Parameters\\Keys\\([0-9A-Fa-f]+)\]([\s\S]*?)(?=\[HKEY_LOCAL_MACHINE|$)/g;
  let adapterMatch;
  
  while ((adapterMatch = adapterRegex.exec(normalizedText)) !== null) {
    const adapterMac = adapterMatch[1];
    const adapterContent = adapterMatch[2];
    
    const deviceMap = new Map<string, string>();
    const hexPattern = /"([0-9a-fA-F]{12})"=hex:([0-9a-fA-F,]+)/g;
    let hexMatch;
    
    while ((hexMatch = hexPattern.exec(adapterContent)) !== null) {
      deviceMap.set(hexMatch[1].toLowerCase(), parseHexBytesRaw(hexMatch[2]));
    }
    
    if (deviceMap.size > 0) {
      allDeviceMappings.set(adapterMac, deviceMap);
    }
  }

  // 第二步：从设备详细信息块提取共享数据
  let sharedDetails: Partial<ParsedDevice> = {};
  const deviceKeysWithDetails = new Set<string>();
  
  const keysPattern = /\[HKEY_LOCAL_MACHINE[^\]]*?\\Parameters\\Keys\\([0-9A-Fa-f]+)\\([0-9A-Fa-f]+)\]/g;
  let match;
  
  while ((match = keysPattern.exec(normalizedText)) !== null) {
    const deviceKey = match[2];
    const startIndex = match.index + match[0].length;
    
    const nextBlockStart = normalizedText.indexOf('[', startIndex);
    const blockContent = nextBlockStart === -1 
      ? normalizedText.substring(startIndex) 
      : normalizedText.substring(startIndex, nextBlockStart);

    // 标记为有详细信息的设备
    deviceKeysWithDetails.add(deviceKey.toLowerCase());

    // 只从第一个有详细信息的设备提取共享数据作为模板
    if (Object.keys(sharedDetails).length === 0) {
      // 解析各个字段
      const addressMatch = blockContent.match(/"Address"=hex\(b\):([0-9a-fA-F,]+)/);
      if (addressMatch) sharedDetails.address = parseBluetoothAddress(addressMatch[1]);

      const ltkMatch = blockContent.match(/"LTK"=hex:([0-9a-fA-F,]+)/);
      if (ltkMatch) sharedDetails.ltk = parseHexBytesRaw(ltkMatch[1]);

      const irkMatch = blockContent.match(/"IRK"=hex:([0-9a-fA-F,]+)/);
      if (irkMatch) sharedDetails.irk = parseHexBytesRaw(irkMatch[1]);

      const csrkMatch = blockContent.match(/"CSRK"=hex:([0-9a-fA-F,]+)/);
      if (csrkMatch) sharedDetails.csrk = parseHexBytesRaw(csrkMatch[1]);

      const edivMatch = blockContent.match(/"EDIV"=dword:([0-9a-fA-F]+)/);
      if (edivMatch) sharedDetails.ediv = parseInt(edivMatch[1], 16);

      const erandMatch = blockContent.match(/"ERand"=hex\(b\):([0-9a-fA-F,]+)/);
      if (erandMatch) sharedDetails.erand = parseHexToBigIntDecimal(erandMatch[1], true).toString();

      const addrTypeMatch = blockContent.match(/"AddressType"=dword:([0-9a-fA-F]+)/);
      if (addrTypeMatch) sharedDetails.addressType = parseInt(addrTypeMatch[1], 16);

      const authReqMatch = blockContent.match(/"AuthReq"=dword:([0-9a-fA-F]+)/);
      if (authReqMatch) sharedDetails.authReq = parseInt(authReqMatch[1], 16);

      const keyLenMatch = blockContent.match(/"KeyLength"=dword:([0-9a-fA-F]+)/);
      if (keyLenMatch) sharedDetails.keyLength = parseInt(keyLenMatch[1], 16);
    }
  }

  // 第三步：为所有有 LinkKey 的设备创建完整的设备对象
  const devices: ParsedDevice[] = [];
  
  for (const [, deviceMap] of allDeviceMappings) {
    for (const [deviceKey, linkKey] of deviceMap) {
      const device: ParsedDevice = {
        address: formatMacAddress(deviceKey),
        name: '',
        deviceKey: deviceKey,
        linkKey: linkKey,
        hasDetails: deviceKeysWithDetails.has(deviceKey),
        ...sharedDetails
      };
      
      devices.push(device);
    }
  }

  // 去重
  const seen = new Set<string>();
  return devices.filter(device => {
    if (seen.has(device.deviceKey)) {
      return false;
    }
    seen.add(device.deviceKey);
    return true;
  });
}

// ==================== 生成函数 ====================

/**
 * 推断设备类型
 */
function inferDeviceType(device: ParsedDevice): string {
  const name = device.name.toLowerCase();
  if (name.includes('mouse')) return 'Mouse';
  if (name.includes('keyboard')) return 'Keyboard';
  if (name.includes('headphone') || name.includes('headset') || name.includes('audio')) return 'Audio/Voice';
  if (name.includes('speaker')) return 'Audio/Voice';
  if (name.includes('gamepad') || name.includes('controller')) return 'Gamepad';
  if (name.includes('trackpad')) return 'Mouse';
  if (name.includes('触摸板')) return 'Mouse';
  return 'Peripheral';
}

/**
 * 生成 Ubuntu BlueZ info 文件内容
 * 
 * 转换规则：
 * - LTK (大写) → LongTermKey.Key
 * - ERand (反序转十进制) → LongTermKey.Rand
 * - EDIV (十进制) → LongTermKey.EDiv
 * - IRK (大写) → IdentityResolvingKey.Key
 * - CSRK (大写) → LocalSignatureKey.Key
 * - 适配器级别 LinkKey → LinkKey.Key
 */
export function generateBlueZInfo(device: ParsedDevice, deviceName?: string): string {
  const name = deviceName || device.name || 'Unknown Device';

  const lines: string[] = [
    '[General]',
    `Name=${name}`,
    'Class=0x000580',
    'SupportedTechnologies=BR/EDR;LE;',
    'Trusted=true',
    'Blocked=false',
    'Services=00001124-0000-1000-8000-00805f9b34fb;00001200-0000-1000-8000-00805f9b34fb;',
    `AddressType=${device.addressType === 1 ? 'public' : 'random'}`,
    'PreferredBearer=last-used',
    'LastUsedBearer=bredr',
    'CablePairing=false',
    'WakeAllowed=true',
    '',
  ];

  // [LongTermKey]
  if (device.ltk) {
    lines.push('[LongTermKey]');
    lines.push(`Key=${device.ltk}`);
    lines.push('EncSize=16');
    if (device.ediv !== undefined) {
      lines.push(`EDiv=${device.ediv}`);
    }
    if (device.erand !== undefined) {
      lines.push(`Rand=${device.erand}`);
    }
    lines.push('Type=0', '');
  }

  // [IdentityResolvingKey]
  if (device.irk) {
    lines.push('[IdentityResolvingKey]');
    lines.push(`Key=${device.irk}`);
    lines.push('');
  }

  // [LocalSignatureKey]
  // 处理规则: 直接复制 Windows 注册表中的 CSRK 值，去掉十六进制字节之间的逗号
  // 例如: hex:00,11,22,33,44,55,66,77,88,99,aa,bb,cc,dd,ee,ff → 00112233445566778899AABBCCDDEEFF
  if (device.csrk) {
    lines.push('[LocalSignatureKey]');
    lines.push(`Key=${device.csrk}`);
    lines.push('Counter=0');
    lines.push('Authenticated=false');
    lines.push('');
  } else {
    // Windows 注册表中通常不存储 CSRK，使用全零默认值
    lines.push('[LocalSignatureKey]');
    lines.push('Key=00000000000000000000000000000000');
    lines.push('Counter=0');
    lines.push('Authenticated=false');
    lines.push('');
  }

  // [LinkKey] - 使用用户选择的设备对应的 LinkKey
  if (device.linkKey) {
    lines.push('[LinkKey]');
    lines.push(`Key=${device.linkKey}`);
    lines.push('Type=0');
    lines.push('PINLength=0');
  }

  return lines.join('\n');
}

// ==================== 文件操作函数 ====================

/**
 * 下载文本文件
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

// 导出示例数据
export { SAMPLE_REGISTRY };
