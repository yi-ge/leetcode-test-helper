#!/usr/bin/env node
import os from 'os'

// 环境检测
if (os.type() !== 'Darwin' && os.type() !== 'Linux' && os.type() !== 'Windows_NT') {
  console.log('当前操作系统：', os.type())
  console.log('暂仅支持MacOS、Linux和Windows使用此脚本')
  exit(0)
}

if (os.type() === 'Windows_NT') {

} else {

}