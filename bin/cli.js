#!/usr/bin/env node
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

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

process.env.TS_NODE_PROJECT = path.normalize(
  'node_modules/leetcode-test-helper/tsconfig.json'
)

spawnSync(
  'node',
  [
    '--no-warnings',
    '--input-type=module',
    '--experimental-vm-modules',
    '--experimental-specifier-resolution=node',
    '--experimental-network-imports',
    '--loader',
    'ts-node/esm',
    path.normalize('node_modules/leetcode-test-helper/src/main.ts'),
    process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
    windowsHide: true,
    env: process.env,
  }
)
