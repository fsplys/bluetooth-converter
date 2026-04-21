/**
 * 类型定义文件
 */

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

/** 解析错误信息 */
export interface ParseError {
  /** 错误类型 */
  type: string;
  /** 错误消息 */
  message: string;
  /** 错误位置（可选） */
  position?: number;
}

/** 设备类型 */
export type DeviceType = 'Mouse' | 'Keyboard' | 'Audio/Voice' | 'Gamepad' | 'Peripheral';
