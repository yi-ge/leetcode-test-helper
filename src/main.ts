#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { argv, exit, stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { Page } from 'playwright-core'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// 基础函数
const __filename = join(fileURLToPath(import.meta.url), '../../../')
const __dirname = dirname(__filename)
const sleep = (n: number) => new Promise(r => { setTimeout(r, n) })
const homeDir = os.homedir()
const userDataDir = (() => {
  switch (os.type()) {
    case 'Linux':
      return join(homeDir, '/.config/google-chromium')
    case 'Darwin':
      return join(homeDir, '/Library/Application Support/Google/Chromium')
    case 'Windows_NT':
      return join(homeDir, '/.google-chromium')
    default:
      return ''
  }
})()
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir)

const cmdExists = (cmd: string) => {
  try {
    execSync(
      os.platform() === 'win32'
        ? `cmd /c "(help ${cmd} > nul || exit 0) && where ${cmd} > nul 2> nul"`
        : `command -v ${cmd}`,
    )
    return true
  }
  catch {
    return false
  }
}
const command = cmdExists('code-insiders') ? 'code-insiders' : 'code'


// 交互
if (argv.length > 4) {
  console.log('参数过多。')
  exit(0)
}

const language = argv[2]?.toLocaleLowerCase().trim()

if (!language) {
  console.log('缺少编程语言参数，请参考实例仓库配置。')
  exit(0)
}

let url = ''

if (!argv[3]) {
  const rl = readline.createInterface({ input, output })

  url = await rl.question('请输入LeetCode URL（回车/1：每日一题，2：随机一题）：')

  rl.close()
} else {
  url = argv[3]
}


// 启动浏览器
chromium.plugins.setDependencyDefaults('stealth/evasions/webgl.vendor', {
  vendor: 'Bob',
  renderer: 'Alice'
})

chromium.use(StealthPlugin())

const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  ignoreDefaultArgs: [
    '--enable-automation',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    // '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-features=Translate,BackForwardCache,AvoidUnnecessaryBeforeUnloadCheckSync',
    '--disable-hang-monitor',
    // '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    // '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--password-store=basic',
    '--enable-blink-features=IdleDetection',
  ],
  // defaultViewport: null,
  deviceScaleFactor: 2.5,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // args: ['--restore-last-session', '--start-maximized']
  args: ['--start-maximized', '--no-default-browser-check']
})

const pages = browser.pages()
const page = pages[0]
await page.setViewportSize({ width: 0, height: 0 })

const setDefaultLocalStorage = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.setItem('global_lang_key', '"${language}"')
    localStorage.setItem('daily-question:guide-modal-shown', '"true"')
    localStorage.setItem('SOLUTION_TAB_TITLE:is-hide-new-feature-popover', 'true')
  })
}

if (url === '' || url === '1') {
  console.log('每日一题')
  await page.goto('https://leetcode.cn/problemset/all/', {
    waitUntil: 'networkidle'
  })
  await setDefaultLocalStorage(page)
  // @ts-ignore
  url = await page.$eval(`[role=row] a`, el => el.href)
  await page.goto(url, {
    waitUntil: 'networkidle'
  })
} else if (url === '2') {
  console.log('随机一题')
  await page.goto('https://leetcode.cn/problemset/all/', {
    waitUntil: 'networkidle'
  })
  await setDefaultLocalStorage(page)
  await page.evaluate(() => {
    const headings = document.evaluate("//span[contains(., '随机一题')]", document, null, XPathResult.ANY_TYPE, null)
    let iterateNext = headings.iterateNext()
    // @ts-ignore
    iterateNext.parentNode?.click()
    return ''
  })
  await page.waitForTimeout(2000)
  url = page.url()
  await page.goto(url, {
    waitUntil: 'networkidle'
  })
} else {
  await page.goto(url, {
    waitUntil: 'networkidle'
  })
  await setDefaultLocalStorage(page)
  await page.goto(url, {
    waitUntil: 'networkidle'
  })
}

// 标题/名称处理
await page.waitForTimeout(1000)
const LeetCodeTitle = (await page.title())?.split('-')?.shift()?.trim()
const title = (await page.title())?.split('-')?.shift()?.trim().split('.')?.pop()?.trim()
console.log(`名称：${title}`)

// 标签/分类处理
const tags = await page.$$eval(`a[class^='topic-tag']`, (items: any[]) => {
  return items.map((item) => {
    return item.textContent
  })
})

const tagToClassification = {
  '数组': 'array',
  '字符串': 'string',
  '排序': 'sort',
  '矩阵': 'array',
  '模拟': 'other',
  '枚举': 'array',
  '字符串匹配': 'string',
  '桶排序': 'sort',
  '计数排序': 'sort',
  '基数排序': 'sort',
  '动态规划': 'other',
  '深度优先搜索': 'search',
  '贪心': 'other',
  '广度优先搜索': 'search',
  '二分查找': 'search',
  '回溯': 'other',
  '递归': 'sort',
  '分治': 'other',
  '记忆化搜索': 'search',
  '归并排序': 'sort',
  '快速选择': 'search',
  '哈希表': 'map',
  '树': 'tree',
  '二叉树': 'tree',
  '栈': 'stack',
  '堆（优先队列）': 'heap',
  '图': 'graphs',
  '链表': 'list',
  '二叉搜索树': 'tree',
  '单调栈': 'stack',
  '有序集合': 'array',
  '队列': 'array',
  '拓扑排序': 'sort',
  '最短路': 'other',
  '双向链表': 'list',
  '单调队列': 'array',
  '最小生成树': 'tree',
  '欧拉回路': 'other',
  '双连通分量': 'other',
  '强连通分量': 'other',
  '并查集': 'other',
  '字典树': 'tree',
  '线段树': 'tree',
  '树状数组': 'array',
  '后缀数组': 'array',
  '双指针': 'other',
  '位运算': 'math',
  '前缀和': 'math',
  '计数': 'math',
  '滑动窗口': 'other',
  '状态压缩': 'other',
  '哈希函数': 'other',
  '滚动哈希': 'other',
  '扫描线': 'other',
  '数学': 'math',
  '几何': 'math',
  '博弈': 'math',
  '组合数学': 'math',
  '数论': 'math',
  '随机化': 'math',
  '概率与统计': 'math',
  '水塘抽样': 'math',
  '拒绝采样': 'math',
  '数据库': 'other',
  '设计': 'other',
  '数据流': 'other',
  '交互': 'other',
  '脑筋急转弯': 'other',
  '迭代器': 'other',
  '多线程': 'other',
  'Shell': 'other',
  '未知': 'other'
}

const classificationToReadmeTitle = {
  'string': '字符串',
  'array': '数组/队列/集合/映射',
  'stack': '栈',
  'math': '数学',
  'heap': '堆',
  'tree': '树',
  'list': '链表',
  'graphs': '图',
  'sort': '排序',
  'other': '其它'
}
let tagIndex = 0
let classification = (tags.length > 0 ? tags[tagIndex] : '未知') as string

const tagToClassificationMap = new Map(Object.entries(tagToClassification))
let classificationStr = tagToClassificationMap.get(classification) || 'other'

while (tagIndex < tags.length && classificationStr === 'other') {
  classification = tags[++tagIndex]
  classificationStr = tagToClassificationMap.get(classification) || 'other'
}

const languageSourceDocSuffixMap = new Map<string, string>([
  ['typescript', '.ts'],
  ['c++', '.cpp'],
  ['rust', '.rs']
])

const languageTestFileSuffixMap = new Map<string, string>([
  ['typescript', '.test.ts'],
  ['c++', '_test.cpp'],
  ['rust', '_test.rs']
])
const classificationToReadmeTitleMap = new Map(Object.entries(classificationToReadmeTitle))
const readmeTitle = classificationToReadmeTitleMap.get(classificationStr) || '其它'
const reg = /[^/\\]+[/\\]*$/
const fileName = reg.exec(url)?.shift()?.replace(/[\/$]+/g, '')
const filePath = join(__dirname, `src/${classificationStr}`, fileName + languageSourceDocSuffixMap.get(language))
const imageFilePath = join(__dirname, `images/${classificationStr}`, fileName + '.jpeg')
const testFilePath = join(__dirname, `test/${classificationStr}`, fileName + languageTestFileSuffixMap.get(language))

if (!fs.existsSync(dirname(filePath))) fs.mkdirSync(dirname(filePath))
if (!fs.existsSync(dirname(testFilePath))) fs.mkdirSync(dirname(testFilePath))
if (!fs.existsSync(dirname(imageFilePath))) fs.mkdirSync(dirname(imageFilePath))

console.log('标签：', tags)
console.log('分类：', classification)

// 添加README.md说明
let readmeFileContent = fs.readFileSync(join(__dirname, 'README.md'), 'utf-8')
if (readmeFileContent.includes(url)) {
  console.log('已在README.md中添加过此题目。')
} else {
  const index = readmeFileContent.indexOf('### ' + readmeTitle)
  // * 不要删除下面存在的空行
  const instructions = `
- [${title}](src/${classificationStr}/${fileName + '.ts'})  [${tags.join(', ')}]

  - LeetCode ${LeetCodeTitle} <${url}>`
  readmeFileContent = readmeFileContent.slice(0, index) + readmeFileContent.slice(index).replace(/\n/i, '\n' + instructions + '\n')
  fs.writeFileSync(join(__dirname, 'README.md'), readmeFileContent, 'utf-8')
}

// 保存说明截图, 方便快速查阅
const screenshot = async () => {
  const screenshotPage = await browser.newPage()
  await screenshotPage.goto(url, {
    waitUntil: 'networkidle'
  })
  await screenshotPage.waitForTimeout(1000)
  await screenshotPage.setViewportSize({ width: 1920, height: 3000 })
  await screenshotPage.evaluate(`document.querySelector('[class^="content_"').setAttribute('id', 'screenshot-content')`)
  const desContent = await screenshotPage.$('#screenshot-content')
  await desContent?.screenshot({
    path: imageFilePath,
    type: 'jpeg',
    omitBackground: true,
    quality: 100
  })
  await screenshotPage.close()
}
screenshot() // async
await page.waitForTimeout(2000)

// 代码/测试代码处理
let code: string = (await page.evaluate('monaco.editor.getModels()[0].getValue()')) as string

if (!fileName) {
  console.log('未检测到文件名。')
  exit(1)
}

if (language === 'typescript') {
  const noCommentCode = code.replace(reg, function (word) { // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word
  })
  const keyStr = noCommentCode.match(/(function|class)((\s.*?\(([^)]*)\))|(\s.*?\{))/ig)?.shift()
  const functionName = keyStr?.match(/(function|class)([ \t])([^(\(|\{)]+)/i)?.[3]?.trim()
  code = keyStr && !code.includes('export ') ? code.replace(keyStr, `export ${keyStr}`) : code

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code = `// ${title}
// ${url}
// INLINE  ../../images/${classificationStr}/${fileName}.jpeg

` + code
  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await page.evaluate(() => {
    let examples = ``
    const headings = document.evaluate("//strong[contains(., '示例')]", document, null, XPathResult.ANY_TYPE, null)
    let iterateNext = headings.iterateNext()
    let isFirst = true
    while (iterateNext) {
      if (isFirst) {
        isFirst = false
      } else {
        examples += '\n'
      }
      // @ts-ignore
      if (iterateNext?.innerText) examples += iterateNext?.innerText + '\n'
      // @ts-ignore
      let desNode = iterateNext?.parentNode?.nextSibling?.nextSibling
      // @ts-ignore
      while (desNode?.tagName === 'IMG') {
        desNode = desNode?.nextSibling?.nextSibling
      }
      // @ts-ignore
      examples += desNode?.innerText
      iterateNext = headings.iterateNext()
    }
    return examples
  })

  examples = examples.split('\n').map((item: any) => {
    return item ? '  // ' + item : ''
  }).join('\n')

  // * 不要删除下面存在的空行
  const testCode = `import { ${functionName} } from '../../src/${classificationStr}/${fileName}'

test('${title}', () => {
${examples}
  expect(${functionName}()).toBeFalsy()
})`

  fs.writeFileSync(filePath, code, 'utf-8')

  if (fs.existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。')
  } else {
    fs.writeFileSync(testFilePath, testCode, 'utf-8')
  }
} else if (language === 'c++') {
  const noCommentCode = code.replace(reg, function (word) { // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word
  })
  const keyClassStr = noCommentCode.match(/class(\s.*?\{)/ig)?.shift()
  const className = keyClassStr?.match(/(class)([ \t])([^(\(|\{)]+)/i)?.[3]?.trim()
  const keyFuncStr = noCommentCode.match(/.*(\(([^)]*)\))\s?.*?\{/ig)?.shift()
  const functionName = keyFuncStr?.match(/((\w+)?([\s\*]+)(\w+|\w+::\w+))\(/i)?.[4]
  let declaration = ''
  if (functionName) { // 如果包含 function 推测函数声明
    const argument = keyFuncStr.match(/\(([^)]*)\)/i)?.[1]
    const declarationArgument = argument?.split(',')?.map(item => {
      return item.trim()?.split(' ')?.[1]?.replace('&', '')?.trim()
    })?.join(', ')
    declaration = argument && declarationArgument ? functionName + ' (' + declarationArgument + ')' : ''
  }

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code = `// ${title}
  // ${url}
  // INLINE  ../../images/${classificationStr}/${fileName}.jpeg
  #include <headers.hpp>
  ` + code
  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await page.evaluate(() => {
    let examples = ``
    // @ts-ignore
    const headings = document.evaluate("//strong[contains(., '示例')]", document, null, XPathResult.ANY_TYPE, null)
    let iterateNext = headings.iterateNext()
    let isFirst = true
    while (iterateNext) {
      if (isFirst) {
        isFirst = false
      } else {
        examples += '\n'
      }
      // @ts-ignore
      examples += iterateNext?.innerText + '\n'
      // @ts-ignore
      let desNode = iterateNext?.parentNode?.nextSibling?.nextSibling
      // @ts-ignore
      while (desNode.tagName === 'IMG') {
        desNode = desNode?.nextSibling?.nextSibling
      }
      // @ts-ignore
      examples += desNode?.innerText
      iterateNext = headings.iterateNext()
    }
    return examples
  })

  examples = examples.split('\n').map(item => {
    return item ? '  // ' + item : ''
  }).join('\n')


  if (fs.existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。')
  } else {
    if (functionName) {
      // * 不要删除下面存在的空行
      const testCode = `#include <${classificationStr}/${fileName + '.cpp'}>
  TEST(${title}, ${functionName})
  {
  ${examples}
    ${className} ${className?.toLocaleLowerCase()};
    EXPECT_EQ(${className?.toLocaleLowerCase()}.${declaration}, 1);
  }
  `

      fs.writeFileSync(filePath, code, 'utf-8')
      fs.writeFileSync(testFilePath, testCode, 'utf-8')

      // 触发Cmake
      const cmakePath = os.type() === 'Darwin' ? '/opt/homebrew/bin/cmake' : 'cmake'
      console.log(execSync(`${cmakePath} --no-warn-unused-cli -DCMAKE_EXPORT_COMPILE_COMMANDS:BOOL=TRUE -DCMAKE_BUILD_TYPE:STRING=Debug -S${join(__dirname, '../')} -B${join(__dirname, '../')}/build`)?.toString())
    } else {
      console.log('该题目暂不支持自动生成测试代码模板，请手工编写测试用例。')
      fs.writeFileSync(testFilePath, `#include <gtest/gtest.h>`, 'utf-8')
    }
  }
} else if (language === 'rust') {
  const noCommentCode = code.replace(reg, function (word) { // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word
  })
  const keyFuncStr = noCommentCode.match(/.*(\(([^)]*)\))\s?.*?\{/ig)?.shift()
  const functionName = keyFuncStr?.match(/((\w+)?([\s\*]+)(\w+|\w+::\w+))\(/i)?.[4]

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code = `// ${title}
  // ${url}
  // INLINE  ../../images/${classificationStr}/${fileName}.jpeg
  pub struct Solution;
  ` + code

  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await page.evaluate(() => {
    let examples = ``
    // @ts-ignore
    const headings = document.evaluate("//strong[contains(., '示例')]", document, null, XPathResult.ANY_TYPE, null)
    let iterateNext = headings.iterateNext()
    let isFirst = true
    while (iterateNext) {
      if (isFirst) {
        isFirst = false
      } else {
        examples += '\n'
      }
      // @ts-ignore
      examples += iterateNext?.innerText + '\n'
      // @ts-ignore
      let desNode = iterateNext?.parentNode?.nextSibling?.nextSibling
      // @ts-ignore
      while (desNode && desNode.tagName === 'IMG') {
        desNode = desNode?.nextSibling?.nextSibling
      }
      // @ts-ignore
      examples += desNode?.innerText
      iterateNext = headings.iterateNext()
    }
    return examples
  })

  examples = examples.split('\n').map(item => {
    return item ? '    // ' + item : ''
  }).join('\n')

  if (fs.existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。')
  } else {
    if (functionName) {
      // * 不要删除下面存在的空行
      const testCode = `use rust_practice::${classificationStr}::${fileName}::Solution;
  #[test]
  fn ${functionName}() {
  ${examples}
      assert_eq!(Solution::${functionName}(), 1);
  }
  `
      fs.writeFileSync(filePath, code, 'utf-8')
      fs.writeFileSync(testFilePath, testCode, 'utf-8')
      const modPath = join(dirname(filePath), 'mod.rs')
      const testModPath = join(dirname(testFilePath), 'mod.rs')
      if (!fs.existsSync(modPath) || !fs.readFileSync(modPath, 'utf-8')?.includes(`pub mod ${fileName};`)) {
        fs.appendFileSync(modPath, `pub mod ${fileName};\n`, 'utf-8')
      }

      if (!fs.existsSync(testModPath) || !fs.readFileSync(testModPath, 'utf-8')?.includes(`pub mod ${fileName};`)) {
        fs.appendFileSync(testModPath, `pub mod ${fileName}_test;\n`, 'utf-8')
      }

      const libPath = join(__dirname, '../src/lib.rs')
      const testsPath = join(__dirname, '../tests/tests.rs')
      if (!fs.readFileSync(libPath, 'utf-8')?.includes(`pub mod ${classificationStr};`)) {
        fs.appendFileSync(libPath, `pub mod ${classificationStr};\n`, 'utf-8')
      }

      if (!fs.readFileSync(testsPath, 'utf-8')?.includes(`mod ${classificationStr};`)) {
        fs.appendFileSync(testsPath, `mod ${classificationStr};\n`, 'utf-8')
      }
    } else {
      console.log('该题目暂不支持自动生成测试代码模板，请手工编写测试用例。')
      fs.writeFileSync(testFilePath, `use rust_practice::${classificationStr}::${fileName}::Solution;`, 'utf-8')
    }
  }
}


execSync(command + ' ' + testFilePath)
sleep(100)
execSync(command + ' ' + filePath)


try {
  const isLogin = !((await page.$eval(`div[class*='AuthLinks']`, el => (el as HTMLElement).innerText))?.includes('登录'))

  if (!isLogin) {
    console.log('如果有会员建议在弹出的浏览器登陆，之后访问VIP题目时可获得访问权限。')
  }
} catch (_) { }

console.log('可以开始写代码了。')

// 代码更新（回写到LeetCode编辑框）
const updateCode = async (filePath: string, title: string, language: string) => {
  let fileContent = fs.readFileSync(filePath, 'utf-8')
  switch (language) {
    case 'typescript':
      if (fileContent.includes('export ')) fileContent = fileContent.replace(/export\s/ig, '')
      break
    case 'c++':
      fileContent = fileContent.replace('#include <headers.hpp>', '')
      break
    case 'rust':
      fileContent = fileContent.replace('pub struct Solution;', '')
      fileContent = fileContent.replace('use crate::libs::list_node::ListNode;\n', '')
      fileContent = fileContent.replace('use crate::libs::tree_node::TreeNode;\n', '')
      break
  }
  await page.evaluate(`monaco.editor.getModels()[0].setValue(\`${fileContent}\`)`)
  console.log(`${title} 代码已同步。`)
}

let timer: NodeJS.Timeout | null = null
const debounce = (func: Function, time: number) => {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    func.call(this)
  }, time)
}

fs.watchFile(filePath, async (curr, prev) => {
  debounce(() => {
    updateCode(filePath, title || fileName, language)
  }, 500)
})

// await browser.close()

