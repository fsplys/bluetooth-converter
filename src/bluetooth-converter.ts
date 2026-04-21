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

// 导入类型
import { ParsedDevice, DeviceType } from './types';

// 导入解析器
import {
  parseRegistry,
  parseHexBytesRaw,
  parseHexToBigIntDecimal,
  parseBluetoothAddress,
  formatMacAddress
} from './parsers/registry-parser';

// 导入生成器
import {
  generateBlueZInfo,
  inferDeviceType
} from './generators/bluez-generator';

// 导入文件工具
import {
  downloadFile,
  copyToClipboard
} from './utils/file-utils';

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

// 导出所有函数和常量
export {
  // 类型
  type ParsedDevice,
  type DeviceType,
  
  // 解析器函数
  parseRegistry,
  parseHexBytesRaw,
  parseHexToBigIntDecimal,
  parseBluetoothAddress,
  formatMacAddress,
  
  // 生成器函数
  generateBlueZInfo,
  inferDeviceType,
  
  // 文件工具函数
  downloadFile,
  copyToClipboard,
  
  // 示例数据
  SAMPLE_REGISTRY
};
