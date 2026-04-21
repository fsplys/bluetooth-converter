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
});
