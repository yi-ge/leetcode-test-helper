#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { argv, exit, stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const __filename = join(fileURLToPath(import.meta.url), '../../');
const __dirname = dirname(__filename);
const sleep = (n) => new Promise(r => { setTimeout(r, n); });
const homeDir = os.homedir();
const userDataDir = (() => {
    switch (os.type()) {
        case 'Linux':
            return join(homeDir, '/.config/google-chromium');
        case 'Darwin':
            return join(homeDir, '/Library/Application Support/Google/Chromium');
        case 'Windows_NT':
            return join(homeDir, '/.google-chromium');
        default:
            return '';
    }
})();
const cmdExists = (cmd) => {
    try {
        execSync(os.platform() === 'win32'
            ? `cmd /c "(help ${cmd} > nul || exit 0) && where ${cmd} > nul 2> nul"`
            : `command -v ${cmd}`);
        return true;
    }
    catch {
        return false;
    }
};
const command = cmdExists('code-insiders') ? 'code-insiders' : 'code';
if (!fs.existsSync(userDataDir))
    fs.mkdirSync(userDataDir);
if (argv.length > 3) {
    console.log('参数过多。');
    exit(0);
}
let url = '';
if (!argv[2]) {
    const rl = readline.createInterface({ input, output });
    url = await rl.question('请输入LeetCode URL（回车/1：每日一题，2：随机一题）：');
    rl.close();
}
else {
    url = argv[2];
}
chromium.plugins.setDependencyDefaults('stealth/evasions/webgl.vendor', {
    vendor: 'Bob',
    renderer: 'Alice'
});
chromium.use(StealthPlugin());
const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: [
        '--enable-automation',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-features=Translate,BackForwardCache,AvoidUnnecessaryBeforeUnloadCheckSync',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--password-store=basic',
        '--enable-blink-features=IdleDetection',
    ],
    deviceScaleFactor: 2.5,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--start-maximized', '--no-default-browser-check']
});
const pages = browser.pages();
const page = pages[0];
await page.setViewportSize({ width: 0, height: 0 });
const setDefaultLocalStorage = async (page) => {
    await page.evaluate(() => {
        localStorage.setItem('global_lang_key', '"typescript"');
        localStorage.setItem('daily-question:guide-modal-shown', '"true"');
        localStorage.setItem('SOLUTION_TAB_TITLE:is-hide-new-feature-popover', 'true');
    });
};
if (url === '' || url === '1') {
    console.log('每日一题');
    await page.goto('https://leetcode.cn/problemset/all/', {
        waitUntil: 'networkidle'
    });
    await setDefaultLocalStorage(page);
    url = await page.$eval(`[role=row] a`, el => el.href);
    await page.goto(url, {
        waitUntil: 'networkidle'
    });
}
else if (url === '2') {
    console.log('随机一题');
    await page.goto('https://leetcode.cn/problemset/all/', {
        waitUntil: 'networkidle'
    });
    await setDefaultLocalStorage(page);
    await page.evaluate(() => {
        const headings = document.evaluate("//span[contains(., '随机一题')]", document, null, XPathResult.ANY_TYPE, null);
        let iterateNext = headings.iterateNext();
        iterateNext.parentNode?.click();
        return '';
    });
    await page.waitForTimeout(2000);
    url = page.url();
    await page.goto(url, {
        waitUntil: 'networkidle'
    });
}
else {
    await page.goto(url, {
        waitUntil: 'networkidle'
    });
    await setDefaultLocalStorage(page);
    await page.goto(url, {
        waitUntil: 'networkidle'
    });
}
await page.waitForTimeout(1000);
const LeetCodeTitle = (await page.title())?.split('-')?.shift()?.trim();
const title = (await page.title())?.split('-')?.shift()?.trim().split('.')?.pop()?.trim();
console.log(`名称：${title}`);
const tags = await page.$$eval(`a[class^='topic-tag']`, (items) => {
    return items.map((item) => {
        return item.textContent;
    });
});
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
};
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
};
let tagIndex = 0;
let classification = tags.length > 0 ? tags[tagIndex] : '未知';
const tagToClassificationMap = new Map(Object.entries(tagToClassification));
let classificationStr = tagToClassificationMap.get(classification) || 'other';
while (tagIndex < tags.length && classificationStr === 'other') {
    classification = tags[++tagIndex];
    classificationStr = tagToClassificationMap.get(classification) || 'other';
}
const classificationToReadmeTitleMap = new Map(Object.entries(classificationToReadmeTitle));
const readmeTitle = classificationToReadmeTitleMap.get(classificationStr) || '其它';
const reg = /[^/\\]+[/\\]*$/;
const fileName = reg.exec(url)?.shift()?.replace(/[\/$]+/g, '');
const filePath = join(__dirname, classificationStr, fileName + '.ts');
const imageFilePath = join(__dirname, `images/${classificationStr}`, fileName + '.jpeg');
const testFilePath = join(__dirname, `test/${classificationStr}`, fileName + '.test.ts');
if (!fs.existsSync(dirname(filePath)))
    fs.mkdirSync(dirname(filePath));
if (!fs.existsSync(dirname(testFilePath)))
    fs.mkdirSync(dirname(testFilePath));
if (!fs.existsSync(dirname(imageFilePath)))
    fs.mkdirSync(dirname(imageFilePath));
console.log('标签：', tags);
console.log('分类：', classification);
let readmeFileContent = fs.readFileSync(join(__dirname, 'README.md'), 'utf-8');
if (readmeFileContent.includes(url)) {
    console.log('已在README.md中添加过此题目。');
}
else {
    const index = readmeFileContent.indexOf('### ' + readmeTitle);
    const instructions = `
- [${title}](src/${classificationStr}/${fileName + '.ts'})  [${tags.join(', ')}]

  - LeetCode ${LeetCodeTitle} <${url}>`;
    readmeFileContent = readmeFileContent.slice(0, index) + readmeFileContent.slice(index).replace(/\n/i, '\n' + instructions + '\n');
    fs.writeFileSync(join(__dirname, 'README.md'), readmeFileContent, 'utf-8');
}
const screenshot = async () => {
    const screenshotPage = await browser.newPage();
    await screenshotPage.goto(url, {
        waitUntil: 'networkidle'
    });
    await screenshotPage.waitForTimeout(1000);
    await screenshotPage.setViewportSize({ width: 1920, height: 3000 });
    const desContent = await screenshotPage.$('[class^="content_"');
    await desContent?.screenshot({
        path: imageFilePath,
        type: 'jpeg',
        omitBackground: true,
        quality: 100
    });
    await screenshotPage.close();
};
screenshot();
let code = (await page.evaluate('monaco.editor.getModels()[0].getValue()'));
if (!fileName) {
    console.log('未检测到文件名。');
    exit(1);
}
const noCommentCode = code.replace(reg, function (word) {
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word;
});
const keyStr = noCommentCode.match(/(function|class)((\s.*?\(([^)]*)\))|(\s.*?\{))/ig)?.shift();
const functionName = keyStr?.match(/(function|class)([ \t])([^(\(|\{)]+)/i)?.[3]?.trim();
code = keyStr && !code.includes('export ') ? code.replace(keyStr, `export ${keyStr}`) : code;
if (!code.includes(`// ${url}`)) {
    code = `// ${title}
// ${url}
// INLINE  ../../images/${classificationStr}/${fileName}.jpeg

` + code;
}
else {
    console.log('检测到已经同步过该题目，将再次打开此题。');
}
let examples = await page.evaluate(() => {
    let examples = ``;
    const headings = document.evaluate("//strong[contains(., '示例')]", document, null, XPathResult.ANY_TYPE, null);
    let iterateNext = headings.iterateNext();
    let isFirst = true;
    while (iterateNext) {
        if (isFirst) {
            isFirst = false;
        }
        else {
            examples += '\n';
        }
        if (iterateNext?.innerText)
            examples += iterateNext?.innerText + '\n';
        let desNode = iterateNext?.parentNode?.nextSibling?.nextSibling;
        while (desNode?.tagName === 'IMG') {
            desNode = desNode?.nextSibling?.nextSibling;
        }
        examples += desNode?.innerText;
        iterateNext = headings.iterateNext();
    }
    return examples;
});
examples = examples.split('\n').map((item) => {
    return item ? '  // ' + item : '';
}).join('\n');
const testCode = `import { ${functionName} } from '../../src/${classificationStr}/${fileName}'

test('${title}', () => {
${examples}
  expect(${functionName}()).toBeFalsy()
})`;
fs.writeFileSync(filePath, code, 'utf-8');
if (fs.existsSync(testFilePath)) {
    console.log('已存在测试代码，将不会再生成测试用例。');
}
else {
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
}
execSync(command + ' ' + testFilePath);
sleep(100);
execSync(command + ' ' + filePath);
try {
    const isLogin = !((await page.$eval(`div[class*='AuthLinks']`, el => el.innerText))?.includes('登录'));
    if (!isLogin) {
        console.log('如果有会员建议在弹出的浏览器登陆，之后访问VIP题目时可获得访问权限。');
    }
}
catch (_) { }
console.log('可以开始写代码了。');
const updateCode = async (filePath, title) => {
    let fileContent = fs.readFileSync(filePath, 'utf-8');
    if (fileContent.includes('export '))
        fileContent = fileContent.replace(/export\s/ig, '');
    await page.evaluate(`monaco.editor.getModels()[0].setValue(\`${fileContent}\`)`);
    console.log(`${title} 代码已同步。`);
};
let timer = null;
const debounce = (func, time) => {
    if (timer)
        return;
    timer = setTimeout(() => {
        timer = null;
        func.call(this);
    }, time);
};
fs.watchFile(filePath, async (curr, prev) => {
    debounce(() => {
        updateCode(filePath, title || fileName);
    }, 500);
});