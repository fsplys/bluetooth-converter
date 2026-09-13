import {
  parseRegistry,
  parseHexBytesRaw,
  parseHexToBigIntDecimal,
  parseBluetoothAddress,
  formatMacAddress
} from '../../src/parsers/registry-parser';
import { SAMPLE_REGISTRY } from '../../src/bluetooth-converter';
import { describe, test, expect } from 'vitest';

// 测试十六进制解析函数
describe('Registry Parser Utils', () => {
  test('parseHexBytesRaw should parse hex bytes correctly', () => {
    expect(parseHexBytesRaw('a0,63,fb,5b')).toBe('A063FB5B');
    expect(parseHexBytesRaw('a0,63,fb,5b', true)).toBe('5BFB63A0');
    expect(parseHexBytesRaw('00,11,22')).toBe('001122');
  });

  test('parseHexToBigIntDecimal should parse hex to bigint correctly', () => {
    expect(parseHexToBigIntDecimal('99,b8,db,e0,c1,5d,c4,52', true).toString()).toBe('5963994893827946649');
  });

  test('parseBluetoothAddress should parse address correctly', () => {
    expect(parseBluetoothAddress('a6,2e,04,72,c2,c5,00,00')).toBe('C5:C2:72:04:2E:A6');
  });

  test('formatMacAddress should format MAC address correctly', () => {
    expect(formatMacAddress('c5c272042ea6')).toBe('C5:C2:72:04:2E:A6');
  });
});

// 测试注册表解析函数
describe('Registry Parser', () => {
  test('parseRegistry should parse sample registry correctly', () => {
    const devices = parseRegistry(SAMPLE_REGISTRY);
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0]).toHaveProperty('address');
    expect(devices[0]).toHaveProperty('deviceKey');
    expect(devices[0]).toHaveProperty('linkKey');
  });

  test('parseRegistry should throw error for empty input', () => {
    expect(() => parseRegistry('')).toThrow('注册表文本不能为空且必须是字符串类型');
  });

  test('parseRegistry should throw error for whitespace only input', () => {
    expect(() => parseRegistry('   ')).toThrow('注册表文本不能只包含空白字符');
  });

  test('parseRegistry should throw error for invalid input', () => {
    expect(() => parseRegistry('invalid registry')).toThrow('未能找到适配器级别信息，请确保注册表包含完整的 Keys 项');
  });

  test('parseRegistry should not let fallback address override devices without details block', () => {
    // 适配器下两个设备，只有 c5c272042ea6 有详细信息块
    const reg = `Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys]

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188]
"201804092aed"=hex:e0,c5,a5,b0,88,d7,a3,50,57,ea,f6,a4,f4,80,77,20
"c5c272042ea6"=hex:6f,aa,ba,cf,ed,26,7a,89,af,86,58,ea,77,98,74,e7

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188\\c5c272042ea6]
"Address"=hex(b):a6,2e,04,72,c2,c5,00,00
"LTK"=hex:2e,7c,c4,81,0b,ad,12,08,5e,11,a7,72,8b,af,11,79
"EDIV"=dword:0000a0a0
`;
    const devices = parseRegistry(reg);
    const noDetails = devices.find(d => d.deviceKey === '201804092aed');
    expect(noDetails).toBeDefined();
    // 无详细信息块的设备，address 必须由自身 deviceKey 推导，不能被回退模板覆盖
    expect(noDetails!.address).toBe('20:18:04:09:2A:ED');
    expect(noDetails!.hasDetails).toBe(false);
    // LinkKey 必须是各自的值
    expect(noDetails!.linkKey).toBe('E0C5A5B088D7A35057EAF6A4F4807720');
  });

  test('parseRegistry should use each device\'s own details when available', () => {
    // 两个设备都有各自的详细信息块，LTK/EDIV 应互不相同
    const reg = `Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys]

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188]
"201804092aed"=hex:e0,c5,a5,b0,88,d7,a3,50,57,ea,f6,a4,f4,80,77,20
"c5c272042ea6"=hex:6f,aa,ba,cf,ed,26,7a,89,af,86,58,ea,77,98,74,e7

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188\\c5c272042ea6]
"Address"=hex(b):a6,2e,04,72,c2,c5,00,00
"LTK"=hex:2e,7c,c4,81,0b,ad,12,08,5e,11,a7,72,8b,af,11,79
"EDIV"=dword:0000a0a0

[HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\BTHPORT\\Parameters\\Keys\\a0510b8e5188\\201804092aed]
"Address"=hex(b):ed,2a,09,04,18,20,00,00
"LTK"=hex:aa,bb,cc,dd,ee,ff,00,11,22,33,44,55,66,77,88,99
"EDIV"=dword:0000b1b1
`;
    const devices = parseRegistry(reg);
    const d1 = devices.find(d => d.deviceKey === '201804092aed')!;
    const d2 = devices.find(d => d.deviceKey === 'c5c272042ea6')!;
    // 各自使用自身的 LTK 和 EDIV，互不覆盖
    expect(d1.ltk).toBe('AABBCCDDEEFF00112233445566778899');
    expect(d1.ediv).toBe(0xb1b1);
    expect(d2.ltk).toBe('2E7CC4810BAD12085E11A7728BAF1179');
    expect(d2.ediv).toBe(0xa0a0);
    expect(d1.address).toBe('20:18:04:09:2A:ED');
    expect(d2.address).toBe('C5:C2:72:04:2E:A6');
  });
});
