import { ParsedDevice, DeviceType } from '../types';

/**
 * 推断设备类型
 */
export function inferDeviceType(device: ParsedDevice): DeviceType {
  const name = device.name.toLowerCase();
  
  // 鼠标相关
  if (name.includes('mouse') || name.includes('trackpad') || name.includes('触摸板') || name.includes('mousepad')) {
    return 'Mouse';
  }
  
  // 键盘相关
  if (name.includes('keyboard') || name.includes('keyboard') || name.includes('键盘')) {
    return 'Keyboard';
  }
  
  // 音频相关
  if (name.includes('headphone') || name.includes('headset') || name.includes('audio') || 
      name.includes('speaker') || name.includes('earphone') || name.includes('headphones') ||
      name.includes('耳机') || name.includes('扬声器') || name.includes('音响')) {
    return 'Audio/Voice';
  }
  
  // 游戏手柄相关
  if (name.includes('gamepad') || name.includes('controller') || name.includes('joystick') ||
      name.includes('game pad') || name.includes('游戏手柄') || name.includes('控制器')) {
    return 'Gamepad';
  }
  
  // 其他设备类型
  if (name.includes('watch') || name.includes('智能手表')) {
    return 'Peripheral';
  }
  
  if (name.includes('phone') || name.includes('手机')) {
    return 'Peripheral';
  }
  
  if (name.includes('tablet') || name.includes('平板')) {
    return 'Peripheral';
  }
  
  if (name.includes('speaker') || name.includes('音箱')) {
    return 'Audio/Voice';
  }
  
  if (name.includes('printer') || name.includes('打印机')) {
    return 'Peripheral';
  }
  
  if (name.includes('scanner') || name.includes('扫描仪')) {
    return 'Peripheral';
  }
  
  if (name.includes('camera') || name.includes('摄像头')) {
    return 'Peripheral';
  }
  
  if (name.includes('fitness') || name.includes('health') || name.includes('健康') || name.includes('运动')) {
    return 'Peripheral';
  }
  
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
  // 输入验证
  if (!device || typeof device !== 'object') {
    throw new Error('设备信息不能为空且必须是对象类型');
  }

  if (!device.deviceKey || typeof device.deviceKey !== 'string') {
    throw new Error('设备键不能为空且必须是字符串类型');
  }

  if (!device.address || typeof device.address !== 'string') {
    throw new Error('设备地址不能为空且必须是字符串类型');
  }

  try {
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
    } else {
      throw new Error('设备缺少 LinkKey，无法生成完整的 info 文件');
    }

    const infoContent = lines.join('\n');
    
    if (!infoContent || infoContent.trim().length === 0) {
      throw new Error('生成的 info 文件内容为空');
    }

    return infoContent;
  } catch (error) {
    throw new Error(`生成 BlueZ info 文件时出错: ${(error as Error).message}`);
  }
}
