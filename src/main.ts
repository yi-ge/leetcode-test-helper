#!/usr/bin/env node
import { execSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  watchFile,
  writeFileSync,
} from 'node:fs'
import { homedir, platform, type as OSType } from 'node:os'
import { dirname, join } from 'node:path'
import { argv, exit, stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { Page } from 'playwright-core'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// * 由于编译配置限制，请勿将代码分离到多个文件。

/**
 * 基础函数
 */
// 延时函数
const sleep = (n: number) =>
  new Promise((r) => {
    setTimeout(r, n)
  })
// 判断命令是否存在
const cmdExists = (cmd: string) => {
  try {
    execSync(
      platform() === 'win32'
        ? `cmd /c "(help ${cmd} > nul || exit 0) && where ${cmd} > nul 2> nul"`
        : `command -v ${cmd}`
    )
    return true
  } catch {
    return false
  }
}

/**
 * 全局变量
 */
// 文件所在路径
const __filename = join(fileURLToPath(import.meta.url), '../../../')
// 目录所在路径
const __dirname = dirname(__filename)
// 浏览器用户数据目录
const userDataDir = (() => {
  switch (OSType()) {
    case 'Linux':
      return join(homedir(), '/.config/google-chromium')
    case 'Darwin':
      return join(homedir(), '/Library/Application Support/Google/Chromium')
    case 'Windows_NT':
      return join(homedir(), '/.google-chromium')
    default:
      return ''
  }
})()
// 用于打开 VS Code 的命令
const command = cmdExists('code-insiders') ? 'code-insiders' : 'code'

/**
 * 初始化 - 执行浏览器操作代码前
 * 命令被注册为lcp
 * 第一个参数是 language
 * 第二个参数是 url
 * 从命令行参数获取编程语言及LeetCode URL
 */
const init = async () => {
  // 如果浏览器用户目录不存在则新建
  if (!existsSync(userDataDir)) mkdirSync(userDataDir)

  // 配置浏览器
  chromium.plugins.setDependencyDefaults('stealth/evasions/webgl.vendor', {
    vendor: 'Bob',
    renderer: 'Alice',
  })

  chromium.use(StealthPlugin())

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
    const rl = createInterface({ input, output })

    url = await rl.question(
      '请输入LeetCode URL（回车/1：每日一题，2：随机一题）：'
    )

    rl.close()
  } else {
    url = argv[3]
  }

  return {
    language,
    url,
  }
}

let { url, language } = await init()

let executablePath = existsSync(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
)
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : undefined

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
  // deviceScaleFactor: 1,
  executablePath,
  // args: ['--restore-last-session', '--start-maximized']
  args: ['--start-maximized', '--no-default-browser-check'],
})

const pages = browser.pages()
const page = pages[0] // 第一个页面是空的，所以直接使用第一个标签的页面
await page.setViewportSize({ width: 0, height: 0 }) // 避免大小被浏览器固定

// 设置LeetCode代码编辑器当前编程语言
const setDefaultLocalStorage = async (page: Page, language: string) => {
  await page.evaluate(
    ([language]) => {
      window.localStorage.setItem('global_lang_key', `"${language}"`)
      window.localStorage.setItem('daily-question:guide-modal-shown', '"true"')
      window.localStorage.setItem(
        'SOLUTION_TAB_TITLE:is-hide-new-feature-popover',
        'true'
      )
    },
    [language]
  )
}

if (url === '' || url === '1') {
  console.log('每日一题')
  await page.goto('https://leetcode.cn/problemset/all/', {
    waitUntil: 'domcontentloaded',
  })
  await setDefaultLocalStorage(page, language)
  await page.waitForSelector('[role=row] a')
  // @ts-ignore
  url = await page.$eval(`[role=row] a`, (el) => el.href)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  })
} else if (url === '2') {
  console.log('随机一题')
  await page.goto('https://leetcode.cn/problemset/all/', {
    waitUntil: 'domcontentloaded',
  })
  await setDefaultLocalStorage(page, language)
  await page.evaluate(() => {
    const headings = document.evaluate(
      "//span[contains(., '随机一题')]",
      document,
      null,
      XPathResult.ANY_TYPE,
      null
    )
    let iterateNext = headings.iterateNext()
    // @ts-ignore
    iterateNext.parentNode?.click()
    return ''
  })
  await page.waitForTimeout(2000)
  url = page.url()
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  })
} else {
  // 用户传入的URL
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  })
  await setDefaultLocalStorage(page, language)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  })
}

// 标题/名称处理
await page.waitForTimeout(2000)
let LeetCodeTitle = (await page.title())?.split('-')?.shift()?.trim()
while (LeetCodeTitle.trim() === '') {
  await page.waitForTimeout(1000)
  LeetCodeTitle = (await page.title())?.split('-')?.shift()?.trim()
}
const title = LeetCodeTitle.split('.')?.pop()?.trim()
console.log(`名称：${title}`)

// 标签/分类处理
const tags = await page.$$eval('a[href^="/tag/"]', (elements) =>
  elements.map((element) => element.textContent)
)

const tagToClassification = {
  数组: 'array',
  字符串: 'string',
  排序: 'sort',
  矩阵: 'array',
  模拟: 'other',
  枚举: 'array',
  字符串匹配: 'string',
  桶排序: 'sort',
  计数排序: 'sort',
  基数排序: 'sort',
  动态规划: 'other',
  深度优先搜索: 'search',
  贪心: 'other',
  广度优先搜索: 'search',
  二分查找: 'search',
  回溯: 'other',
  递归: 'sort',
  分治: 'other',
  记忆化搜索: 'search',
  归并排序: 'sort',
  快速选择: 'search',
  哈希表: 'map',
  树: 'tree',
  二叉树: 'tree',
  栈: 'stack',
  '堆（优先队列）': 'heap',
  图: 'graphs',
  链表: 'list',
  二叉搜索树: 'tree',
  单调栈: 'stack',
  有序集合: 'array',
  队列: 'array',
  拓扑排序: 'sort',
  最短路: 'other',
  双向链表: 'list',
  单调队列: 'array',
  最小生成树: 'tree',
  欧拉回路: 'other',
  双连通分量: 'other',
  强连通分量: 'other',
  并查集: 'other',
  字典树: 'tree',
  线段树: 'tree',
  树状数组: 'array',
  后缀数组: 'array',
  双指针: 'other',
  位运算: 'math',
  前缀和: 'math',
  计数: 'math',
  滑动窗口: 'other',
  状态压缩: 'other',
  哈希函数: 'other',
  滚动哈希: 'other',
  扫描线: 'other',
  数学: 'math',
  几何: 'math',
  博弈: 'math',
  组合数学: 'math',
  数论: 'math',
  随机化: 'math',
  概率与统计: 'math',
  水塘抽样: 'math',
  拒绝采样: 'math',
  数据库: 'other',
  设计: 'other',
  数据流: 'other',
  交互: 'other',
  脑筋急转弯: 'other',
  迭代器: 'other',
  多线程: 'other',
  Shell: 'other',
  未知: 'other',
}

const classificationToReadmeTitle = {
  string: '字符串',
  array: '数组/队列/集合/映射',
  stack: '栈',
  math: '数学',
  heap: '堆',
  tree: '树',
  list: '链表',
  graphs: '图',
  sort: '排序',
  other: '其它',
}
let tagIndex = 0
let classification = (tags.length > 0 ? tags[tagIndex] : '未知') as string
if (tags.includes('排序')) {
  classification = '排序'
} else if (tags.includes('图')) {
  classification = '图'
} else if (tags.includes('栈')) {
  classification = '栈'
} else if (tags.includes('堆')) {
  classification = '堆'
} else if (tags.includes('链表')) {
  classification = '链表'
}

const tagToClassificationMap = new Map(Object.entries(tagToClassification))
let classificationStr = tagToClassificationMap.get(classification) || 'other'

while (tagIndex < tags.length && classificationStr === 'other') {
  classification = tags[++tagIndex]
  classificationStr = tagToClassificationMap.get(classification) || 'other'
}

const languageSourceDocSuffixMap = new Map<string, string>([
  ['typescript', '.ts'],
  ['c++', '.cpp'],
  ['rust', '.rs'],
])

const languageTestFileSuffixMap = new Map<string, string>([
  ['typescript', '.test.ts'],
  ['c++', '_test.cpp'],
  ['rust', '_test.rs'],
])
const classificationToReadmeTitleMap = new Map(
  Object.entries(classificationToReadmeTitle)
)
const readmeTitle =
  classificationToReadmeTitleMap.get(classificationStr) || '其它'
const reg = /[^/\\]+[/\\]*$/
if (url.includes('?')) {
  url = url.split('?')[0] // 移除 '?' 及其后的查询参数
}
const fileName =
  language === 'typescript'
    ? reg
        .exec(url)
        ?.shift()
        ?.replace(/[\/$]+/g, '')
    : reg
        .exec(url)
        ?.shift()
        ?.replace(/-/gi, '_')
        ?.replace(/[\/$]+/g, '')
const filePath = join(
  __dirname,
  `src/${classificationStr}`,
  fileName + languageSourceDocSuffixMap.get(language)
)
const imageFilePath = join(
  __dirname,
  `images/${classificationStr}`,
  fileName + '.jpeg'
)
const testFilePath = join(
  __dirname,
  (language === 'rust' ? 'tests' : 'test') + `/${classificationStr}`,
  fileName + languageTestFileSuffixMap.get(language)
)

if (!existsSync(dirname(filePath))) mkdirSync(dirname(filePath))
if (!existsSync(dirname(testFilePath))) mkdirSync(dirname(testFilePath))
if (!existsSync(dirname(imageFilePath))) mkdirSync(dirname(imageFilePath))

console.log('标签：', tags)
console.log('分类：', classification)

// 添加README.md说明
let readmeFileContent = readFileSync(join(__dirname, 'README.md'), 'utf-8')
if (readmeFileContent.includes(url)) {
  console.log('已在README.md中添加过此题目。')
} else {
  const index = readmeFileContent.indexOf('### ' + readmeTitle)
  // * 不要删除下面存在的空行
  const instructions = `
- [${title}](src/${classificationStr}/${
    fileName + languageSourceDocSuffixMap.get(language)
  })  [${tags.join(', ')}]

  - LeetCode ${LeetCodeTitle} <${url}>`
  readmeFileContent =
    readmeFileContent.slice(0, index) +
    readmeFileContent.slice(index).replace(/\n/i, '\n' + instructions + '\n')
  writeFileSync(join(__dirname, 'README.md'), readmeFileContent, 'utf-8')
}

// 保存说明截图, 方便快速查阅
const screenshot = async () => {
  const screenshotPage = await browser.newPage()
  await screenshotPage.goto(url, {
    waitUntil: 'domcontentloaded',
  })
  await screenshotPage.setViewportSize({ width: 0, height: 0 })
  await screenshotPage.waitForTimeout(2000)
  // 获取目标元素
  let targetElement = await screenshotPage.evaluateHandle(() => {
    let element = document
      .querySelector('.flex.w-full.flex-1')
      .children[2].cloneNode(true) as HTMLElement
    element.setAttribute('id', 'screenshot-content')
    element.style.width = 'auto'
    element.style.height = 'auto'
    element.style.maxWidth = '800px'
    element.style.padding = '10px'
    document.body.innerHTML = ''
    document.body.appendChild(element)
    return element
  })

  // 获取元素的大小和位置
  const boundingBox = await targetElement.boundingBox()

  // console.log(boundingBox)

  // 截图特定区域
  // await screenshotPage.screenshot({
  //   path: imageFilePath,
  //   type: 'jpeg',
  //   quality: 100,
  // clip: {
  //   x: boundingBox.x,
  //   y: boundingBox.y,
  //   width: Math.min(boundingBox.width, 1920),
  //   height: Math.min(boundingBox.height, 3000),
  // },
  // })
  // await targetElement?.screenshot({
  //   path: imageFilePath,
  //   type: 'jpeg',
  //   omitBackground: true,
  //   quality: 100,
  // })
  await screenshotPage.screenshot({
    path: imageFilePath,
    type: 'jpeg',
    omitBackground: true,
    quality: 100,
    fullPage: true,
    clip: {
      x: boundingBox.x,
      y: boundingBox.y,
      width: Math.min(parseInt(boundingBox.width.toString()), 1920),
      height: Math.min(parseInt(boundingBox.height.toString()), 3000),
    },
  })
  await screenshotPage.close()
}
await screenshot() // async
await page.waitForTimeout(2000)

// 代码/测试代码处理
let code: string = (await page.evaluate(
  'monaco.editor.getModels()[0].getValue()'
)) as string

if (!fileName) {
  console.log('未检测到文件名。')
  exit(1)
}

const getExamples = async (page: Page) => {
  return await page.evaluate(() => {
    let examples = ``
    const headings = document.evaluate(
      "//strong[contains(., '示例')]",
      document,
      null,
      XPathResult.ANY_TYPE,
      null
    )
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
      while (desNode && desNode?.tagName !== 'PRE') {
        desNode = desNode?.nextSibling?.nextSibling
      }
      // @ts-ignore
      examples += desNode?.innerText
      iterateNext = headings.iterateNext()
    }

    return examples
  })
}

if (language === 'typescript') {
  const noCommentCode = code.replace(reg, function (word) {
    // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? '' : word
  })
  const keyStr = noCommentCode
    .match(/(function|class)((\s.*?\(([^)]*)\))|(\s.*?\{))/gi)
    ?.shift()
  const functionName = keyStr
    ?.match(/(function|class)([ \t])([^(\(|\{)]+)/i)?.[3]
    ?.trim()
  code =
    keyStr && !code.includes('export ')
      ? code.replace(keyStr, `export ${keyStr}`)
      : code

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code =
      `// ${title}
// ${url}
// INLINE  ../../images/${classificationStr}/${fileName}.jpeg

` + code
  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await getExamples(page)
  examples = examples
    .split('\n')
    .map((item: any) => {
      return item ? '  // ' + item : ''
    })
    .join('\n')

  // * 不要删除下面存在的空行
  const testCode = `import { ${functionName} } from '../../src/${classificationStr}/${fileName}'

test('${title}', () => {
${examples}
  expect(${functionName}()).toBeFalsy()
})`

  writeFileSync(filePath, code, 'utf-8')

  if (existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。')
  } else {
    writeFileSync(testFilePath, testCode, 'utf-8')
  }
} else if (language === 'c++') {
  const noCommentCode = code.replace(reg, function (word) {
    // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? '' : word
  })
  const keyClassStr = noCommentCode.match(/class(\s.*?\{)/gi)?.shift()
  const className = keyClassStr
    ?.match(/(class)([ \t])([^(\(|\{)]+)/i)?.[3]
    ?.trim()
  const keyFuncStr = noCommentCode.match(/.*(\(([^)]*)\))\s?.*?\{/gi)?.shift()
  const functionName = keyFuncStr?.match(
    /((\w+)?([\s\*]+)(\w+|\w+::\w+))\(/i
  )?.[4]
  let declaration = ''
  if (functionName) {
    // 如果包含 function 推测函数声明
    const argument = keyFuncStr.match(/\(([^)]*)\)/i)?.[1]
    const declarationArgument = argument
      ?.split(',')
      ?.map((item) => {
        return item.trim()?.split(' ')?.[1]?.replace('&', '')?.trim()
      })
      ?.join(', ')
    declaration =
      argument && declarationArgument
        ? functionName + ' (' + declarationArgument + ')'
        : ''
  }

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code =
      `// ${title}
// ${url}
// INLINE  ../../images/${classificationStr}/${fileName}.jpeg

#include <headers.hpp>

` + code
  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await getExamples(page)
  examples = examples
    .split('\n')
    .map((item) => {
      return item ? '  // ' + item : ''
    })
    .join('\n')

  if (existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。')
  } else {
    if (functionName) {
      // * 不要删除下面存在的空行
      const testCode = `#include <${classificationStr}/${fileName + '.cpp'}>

TEST(${title}, ${functionName})
{
  ${className} ${className?.toLocaleLowerCase()};
${examples}
  EXPECT_EQ(${className?.toLocaleLowerCase()}.${declaration}, 1);
}
`

      writeFileSync(filePath, code, 'utf-8')
      writeFileSync(testFilePath, testCode, 'utf-8')

      // 触发Cmake
      const cmakePath =
        OSType() === 'Darwin' ? '/opt/homebrew/bin/cmake' : 'cmake'
      console.log(
        execSync(
          `${cmakePath} --no-warn-unused-cli -DCMAKE_EXPORT_COMPILE_COMMANDS:BOOL=TRUE -DCMAKE_BUILD_TYPE:STRING=Debug -S${join(
            __dirname
          )} -B${join(__dirname, './build')}`
        )?.toString()
      )
    } else {
      console.log('该题目暂不支持自动生成测试代码模板，请手工编写测试用例。')
      writeFileSync(testFilePath, `#include <gtest/gtest.h>`, 'utf-8')
    }
  }
} else if (language === 'rust') {
  const noCommentCode = code.replace(reg, function (word) {
    // 去除注释后的代码
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? '' : word
  })
  const keyFuncStr = noCommentCode.match(/.*(\(([^)]*)\))\s?.*?\{/gi)?.shift()
  const functionName = keyFuncStr?.match(
    /((\w+)?([\s\*]+)(\w+|\w+::\w+))\(/i
  )?.[4]

  // * 不要删除下面存在的空行
  if (!code.includes(`// ${url}`)) {
    code =
      `// ${title}
// ${url}
// INLINE  ../../images/${classificationStr}/${fileName}.jpeg

pub struct Solution;

` + code
  } else {
    console.log('检测到已经同步过该题目，将再次打开此题。')
  }

  let examples = await getExamples(page)
  examples = examples
    .split('\n')
    .map((item) => {
      return item ? '    // ' + item : ''
    })
    .join('\n')

  if (existsSync(testFilePath)) {
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
      writeFileSync(filePath, code, 'utf-8')
      writeFileSync(testFilePath, testCode, 'utf-8')
      const modPath = join(dirname(filePath), 'mod.rs')
      const testModPath = join(dirname(testFilePath), 'mod.rs')
      if (
        !existsSync(modPath) ||
        !readFileSync(modPath, 'utf-8')?.includes(`pub mod ${fileName};`)
      ) {
        appendFileSync(modPath, `pub mod ${fileName};\n`, 'utf-8')
      }

      if (
        !existsSync(testModPath) ||
        !readFileSync(testModPath, 'utf-8')?.includes(`pub mod ${fileName};`)
      ) {
        appendFileSync(testModPath, `pub mod ${fileName}_test;\n`, 'utf-8')
      }

      const libPath = join(__dirname, './src/lib.rs')
      const testsPath = join(__dirname, './tests/tests.rs')
      if (
        !readFileSync(libPath, 'utf-8')?.includes(
          `pub mod ${classificationStr};`
        )
      ) {
        appendFileSync(libPath, `pub mod ${classificationStr};\n`, 'utf-8')
      }

      if (
        !readFileSync(testsPath, 'utf-8')?.includes(`mod ${classificationStr};`)
      ) {
        appendFileSync(testsPath, `mod ${classificationStr};\n`, 'utf-8')
      }
    } else {
      console.log('该题目暂不支持自动生成测试代码模板，请手工编写测试用例。')
      writeFileSync(
        testFilePath,
        `use rust_practice::${classificationStr}::${fileName}::Solution;`,
        'utf-8'
      )
    }
  }
}

// 代码更新（回写到LeetCode编辑框）
const updateCode = async (
  filePath: string,
  title: string,
  language: string
) => {
  let fileContent = readFileSync(filePath, 'utf-8')
  switch (language) {
    case 'typescript':
      if (fileContent.includes('export '))
        fileContent = fileContent.replace(/export\s/gi, '')
      break
    case 'c++':
      fileContent = fileContent.replace('#include <headers.hpp>', '')
      break
    case 'rust':
      fileContent = fileContent.replace('pub struct Solution;', '')
      fileContent = fileContent.replace(
        'use crate::libs::list_node::ListNode;\n',
        ''
      )
      fileContent = fileContent.replace(
        'use crate::libs::tree_node::TreeNode;\n',
        ''
      )
      break
  }
  await page.evaluate(
    `monaco.editor.getModels()[0].setValue(\`${fileContent}\`)`
  )
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

try {
  watchFile(filePath, async (curr, prev) => {
    debounce(() => {
      updateCode(filePath, title || fileName, language)
    }, 500)
  })
} catch (err) {
  console.error(err)
  await browser.close()
}

execSync(command + ' ' + testFilePath)
sleep(100)
execSync(command + ' ' + filePath)

try {
  const isLogin = !(
    await page.$eval(
      `div[class*='AuthLinks']`,
      (el) => (el as HTMLElement).innerText
    )
  )?.includes('登录')

  if (!isLogin) {
    console.log(
      '如果有会员建议在弹出的浏览器登陆，之后访问VIP题目时可获得访问权限。'
    )
  }
} catch (_) {}

console.log('可以开始写代码了。')
