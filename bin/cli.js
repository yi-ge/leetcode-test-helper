#!/usr/bin/env node
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

// 环境检测
if (
  os.type() !== 'Darwin' &&
  os.type() !== 'Linux' &&
  os.type() !== 'Windows_NT'
) {
  console.log('当前操作系统：', os.type())
  console.log('暂仅支持MacOS、Linux和Windows使用此脚本')
  exit(0)
}
console.log(process.argv)
console.log(process.argv.slice(3))
spawn(
  'node',
  [
    '--no-warnings',
    '--experimental-vm-modules',
    '--experimental-specifier-resolution=node',
    '--loader',
    'ts-node/esm',
    path.join(process.cwd(), 'node_modules/leetcode-test-helper/src/main.ts'),
    process.argv.slice(3),
  ],
  {
    stdio: 'inherit',
    shell: os.type() === 'Windows_NT',
  }
)
