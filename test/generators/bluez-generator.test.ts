import { generateBlueZInfo, inferDeviceType } from '../../src/generators/bluez-generator';
import { ParsedDevice } from '../../src/types';
import { describe, test, expect } from 'vitest';

// 测试设备类型推断函数
describe('BlueZ Generator Utils', () => {
  test('inferDeviceType should infer mouse type correctly', () => {
    expect(inferDeviceType({ name: 'Bluetooth Mouse', address: '', deviceKey: '', hasDetails: false })).toBe('Mouse');
    expect(inferDeviceType({ name: 'Trackpad', address: '', deviceKey: '', hasDetails: false })).toBe('Mouse');
    expect(inferDeviceType({ name: '触摸板', address: '', deviceKey: '', hasDetails: false })).toBe('Mouse');
  });

  test('inferDeviceType should infer keyboard type correctly', () => {
    expect(inferDeviceType({ name: 'Bluetooth Keyboard', address: '', deviceKey: '', hasDetails: false })).toBe('Keyboard');
    expect(inferDeviceType({ name: '键盘', address: '', deviceKey: '', hasDetails: false })).toBe('Keyboard');
  });

  test('inferDeviceType should infer audio type correctly', () => {
    expect(inferDeviceType({ name: 'Bluetooth Headphones', address: '', deviceKey: '', hasDetails: false })).toBe('Audio/Voice');
    expect(inferDeviceType({ name: 'Speaker', address: '', deviceKey: '', hasDetails: false })).toBe('Audio/Voice');
    expect(inferDeviceType({ name: '耳机', address: '', deviceKey: '', hasDetails: false })).toBe('Audio/Voice');
  });

  test('inferDeviceType should infer gamepad type correctly', () => {
    expect(inferDeviceType({ name: 'Gamepad', address: '', deviceKey: '', hasDetails: false })).toBe('Gamepad');
    expect(inferDeviceType({ name: 'Controller', address: '', deviceKey: '', hasDetails: false })).toBe('Gamepad');
    expect(inferDeviceType({ name: '游戏手柄', address: '', deviceKey: '', hasDetails: false })).toBe('Gamepad');
  });

  test('inferDeviceType should infer peripheral type for other devices', () => {
    expect(inferDeviceType({ name: 'Smartwatch', address: '', deviceKey: '', hasDetails: false })).toBe('Peripheral');
    expect(inferDeviceType({ name: 'Phone', address: '', deviceKey: '', hasDetails: false })).toBe('Peripheral');
    expect(inferDeviceType({ name: 'Unknown Device', address: '', deviceKey: '', hasDetails: false })).toBe('Peripheral');
  });
});

// 测试 BlueZ info 文件生成函数
describe('BlueZ Generator', () => {
  const testDevice: ParsedDevice = {
    address: 'C5:C2:72:04:2E:A6',
    name: 'Bluetooth Mouse',
    deviceKey: 'c5c272042ea6',
    linkKey: '6FBAACFECF267A89AF8658EA779874E7',
    ltk: '2E7CC4810BAD12085E11A7728BAF1179',
    irk: '6FBAACFECF267A89AF8658EA779874E7',
    ediv: 41120,
    erand: '17483610236477551698',
    addressType: 1,
    hasDetails: true
  };

  test('generateBlueZInfo should generate info file correctly', () => {
    const infoContent = generateBlueZInfo(testDevice, 'Test Mouse');
    expect(infoContent).toContain('[General]');
    expect(infoContent).toContain('Name=Test Mouse');
    expect(infoContent).toContain('[LongTermKey]');
    expect(infoContent).toContain('Key=2E7CC4810BAD12085E11A7728BAF1179');
    expect(infoContent).toContain('[LinkKey]');
    expect(infoContent).toContain('Key=6FBAACFECF267A89AF8658EA779874E7');
  });

  test('generateBlueZInfo should throw error for device without linkKey', () => {
    const deviceWithoutLinkKey = { ...testDevice, linkKey: undefined };
    expect(() => generateBlueZInfo(deviceWithoutLinkKey as ParsedDevice)).toThrow('设备缺少 LinkKey，无法生成完整的 info 文件');
  });

  test('generateBlueZInfo should use default name if not provided', () => {
    const infoContent = generateBlueZInfo(testDevice);
    expect(infoContent).toContain('Name=Bluetooth Mouse');
  });
});
