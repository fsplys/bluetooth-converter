import { ParsedDevice } from '../types';

// ==================== 正则表达式常量 ====================

/** 预编译的正则表达式 */
const REGEX = {
  // 适配器级别匹配
  adapter: /\[HKEY_LOCAL_MACHINE[^\]]*?\\Parameters\\Keys\\([0-9A-Fa-f]+)\]([\s\S]*?)(?=\[HKEY_LOCAL_MACHINE|$)/g,
  // 设备 MAC 到 LinkKey 映射匹配
  deviceMap: /"([0-9a-fA-F]{12})"=hex:([0-9a-fA-F,]+)/g,
  // 设备详细信息块匹配
  deviceDetails: /\[HKEY_LOCAL_MACHINE[^\]]*?\\Parameters\\Keys\\([0-9A-Fa-f]+)\\([0-9A-Fa-f]+)\]/g,
  // 地址字段匹配
  address: /"Address"=hex\(b\):([0-9a-fA-F,]+)/,
  // LTK 字段匹配
  ltk: /"LTK"=hex:([0-9a-fA-F,]+)/,
  // IRK 字段匹配
  irk: /"IRK"=hex:([0-9a-fA-F,]+)/,
  // CSRK 字段匹配
  csrk: /"CSRK"=hex:([0-9a-fA-F,]+)/,
  // EDIV 字段匹配
  ediv: /"EDIV"=dword:([0-9a-fA-F]+)/,
  // ERand 字段匹配
  erand: /"ERand"=hex\(b\):([0-9a-fA-F,]+)/,
  // 地址类型字段匹配
  addressType: /"AddressType"=dword:([0-9a-fA-F]+)/,
  // 认证请求字段匹配
  authReq: /"AuthReq"=dword:([0-9a-fA-F]+)/,
  // 密钥长度字段匹配
  keyLength: /"KeyLength"=dword:([0-9a-fA-F]+)/,
  // ControlSet 标准化
  controlSet: /ControlSet\d+/g
};

// ==================== 工具函数 ====================

/**
 * 解析十六进制字节串为无分隔符字符串（大写）
 * @param hexStr 十六进制字符串，格式如 "a0,63,fb,5b"
 * @param reverse 是否反转字节顺序
 */
export function parseHexBytesRaw(hexStr: string, reverse: boolean = false): string {
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
export function parseHexToBigIntDecimal(hexStr: string, reverse: boolean = false): bigint {
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
export function parseBluetoothAddress(hexStr: string): string {
  const bytes = hexStr.split(',').map(b => b.trim().padStart(2, '0').toUpperCase());
  const macBytes = bytes.slice(0, 6).reverse();
  return macBytes.join(':');
}

/**
 * 格式化 MAC 地址（12字符 hex 转为 aa:bb:cc:dd:ee:ff）
 */
export function formatMacAddress(hexStr: string): string {
  return hexStr.replace(/(..)/g, '$1:').slice(0, -1).toUpperCase();
}

/**
 * 从单个设备详细信息块内容中解析各字段
 * @param blockContent 设备子键对应的注册表内容片段
 */
function parseDeviceDetails(blockContent: string): Partial<ParsedDevice> {
  const details: Partial<ParsedDevice> = {};

  const addressMatch = blockContent.match(REGEX.address);
  if (addressMatch) details.address = parseBluetoothAddress(addressMatch[1]);

  const ltkMatch = blockContent.match(REGEX.ltk);
  if (ltkMatch) details.ltk = parseHexBytesRaw(ltkMatch[1]);

  const irkMatch = blockContent.match(REGEX.irk);
  if (irkMatch) details.irk = parseHexBytesRaw(irkMatch[1]);

  const csrkMatch = blockContent.match(REGEX.csrk);
  if (csrkMatch) details.csrk = parseHexBytesRaw(csrkMatch[1]);

  const edivMatch = blockContent.match(REGEX.ediv);
  if (edivMatch) details.ediv = parseInt(edivMatch[1], 16);

  const erandMatch = blockContent.match(REGEX.erand);
  if (erandMatch) details.erand = parseHexToBigIntDecimal(erandMatch[1], true).toString();

  const addrTypeMatch = blockContent.match(REGEX.addressType);
  if (addrTypeMatch) details.addressType = parseInt(addrTypeMatch[1], 16);

  const authReqMatch = blockContent.match(REGEX.authReq);
  if (authReqMatch) details.authReq = parseInt(authReqMatch[1], 16);

  const keyLenMatch = blockContent.match(REGEX.keyLength);
  if (keyLenMatch) details.keyLength = parseInt(keyLenMatch[1], 16);

  return details;
}

/**
 * 解析 Windows 注册表文本格式
 * 
 * 处理流程：
 * 1. 从适配器级别提取所有设备 MAC -> LinkKey 映射
 * 2. 为每个有详细信息块的设备独立解析 LTK、IRK、EDIV 等，首个设备作为缺失字段回退模板
 * 3. 为所有设备创建对象：自身详细信息优先，缺失字段用回退模板补全，LinkKey 使用各自值
 * 
 * @param registryText 注册表文本内容
 * @returns 解析后的设备数组
 */
export function parseRegistry(registryText: string): ParsedDevice[] {
  // 输入验证
  if (!registryText || typeof registryText !== 'string') {
    throw new Error('注册表文本不能为空且必须是字符串类型');
  }

  if (registryText.trim().length === 0) {
    throw new Error('注册表文本不能只包含空白字符');
  }

  // 标准化路径：支持 ControlSet001, ControlSet002, CurrentControlSet
  const normalizedText = registryText.replace(REGEX.controlSet, 'ControlSetXXX');

  // 第一步：从适配器级别提取所有设备 MAC -> LinkKey 映射
  const allDeviceMappings = new Map<string, Map<string, string>>();
  
  let adapterMatch;
  
  // 重置正则表达式的 lastIndex
  REGEX.adapter.lastIndex = 0;
  while ((adapterMatch = REGEX.adapter.exec(normalizedText)) !== null) {
    const adapterMac = adapterMatch[1];
    const adapterContent = adapterMatch[2];
    
    const deviceMap = new Map<string, string>();
    let hexMatch;
    
    // 重置正则表达式的 lastIndex
    REGEX.deviceMap.lastIndex = 0;
    while ((hexMatch = REGEX.deviceMap.exec(adapterContent)) !== null) {
      try {
        deviceMap.set(hexMatch[1].toLowerCase(), parseHexBytesRaw(hexMatch[2]));
      } catch (error) {
        throw new Error(`解析设备 ${hexMatch[1]} 的 LinkKey 时出错: ${(error as Error).message}`);
      }
    }
    
    if (deviceMap.size > 0) {
      allDeviceMappings.set(adapterMac, deviceMap);
    }
  }

  if (allDeviceMappings.size === 0) {
    throw new Error('未能找到适配器级别信息，请确保注册表包含完整的 Keys 项');
  }

  // 第二步：为每个有详细信息块的设备独立解析，并保留第一个作为回退模板
  const deviceDetailsMap = new Map<string, Partial<ParsedDevice>>();
  let fallbackDetails: Partial<ParsedDevice> = {};
  const deviceKeysWithDetails = new Set<string>();
  
  let match;
  
  REGEX.deviceDetails.lastIndex = 0;
  while ((match = REGEX.deviceDetails.exec(normalizedText)) !== null) {
    const deviceKey = match[2].toLowerCase();
    const startIndex = match.index + match[0].length;
    
    const nextBlockStart = normalizedText.indexOf('[', startIndex);
    const blockContent = nextBlockStart === -1 
      ? normalizedText.substring(startIndex) 
      : normalizedText.substring(startIndex, nextBlockStart);

    // 标记为有详细信息的设备
    deviceKeysWithDetails.add(deviceKey);

    try {
      const details = parseDeviceDetails(blockContent);
      deviceDetailsMap.set(deviceKey, details);
      // 第一个有详细信息的设备作为缺失字段的回退模板
      if (Object.keys(fallbackDetails).length === 0) {
        fallbackDetails = details;
      }
    } catch (error) {
      throw new Error(`解析设备 ${deviceKey} 详细信息时出错: ${(error as Error).message}`);
    }
  }

  // 第三步：为所有有 LinkKey 的设备创建完整的设备对象
  const devices: ParsedDevice[] = [];
  
  for (const [, deviceMap] of allDeviceMappings) {
    for (const [deviceKey, linkKey] of deviceMap) {
      try {
        // 自身详细信息优先，缺失字段用第一个设备的模板补全
        const ownDetails = deviceDetailsMap.get(deviceKey) ?? {};
        const device: ParsedDevice = {
          name: '',
          deviceKey: deviceKey,
          linkKey: linkKey,
          hasDetails: deviceKeysWithDetails.has(deviceKey),
          ...fallbackDetails,
          ...ownDetails,
          // address 必须由 deviceKey 确定，放在最后避免被回退模板中其他设备的地址覆盖
          address: formatMacAddress(deviceKey),
        };
        
        devices.push(device);
      } catch (error) {
        throw new Error(`创建设备对象时出错: ${(error as Error).message}`);
      }
    }
  }

  if (devices.length === 0) {
    throw new Error('未能解析到任何蓝牙设备信息，请检查注册表格式是否正确');
  }

  // 去重
  const seen = new Set<string>();
  const uniqueDevices = devices.filter(device => {
    if (seen.has(device.deviceKey)) {
      return false;
    }
    seen.add(device.deviceKey);
    return true;
  });

  if (uniqueDevices.length === 0) {
    throw new Error('所有设备信息重复或无效');
  }

  return uniqueDevices;
}
