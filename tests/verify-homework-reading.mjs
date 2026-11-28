import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from './browser-runtime.mjs';

// Structure from a scrubbed, unsubmitted homework sample. IDs, content,
// native callbacks, AI responses, and platform confirmations are simulated.
const passage = 'Shared reading passage.<br>Its second paragraph carries a key detail.';
const options = ['A', 'B', 'C', 'D'];
const expected = ['C', 'B', 'D', 'A', 'D'];
const children = expected.map((_, index) => {
  const id = '1000000' + index + '-0000-4000-8000-000000000000';
  const rows = options.map(letter => '<div class="clearfix hoverDiv workTextWrap" qid="' + id +
    '" qtype="15" onclick="addChoice(this)"><span class="choice' + id + ' num_option fl" data="' +
    letter + '">' + letter + '</span><div class="fl answer_p">Option ' + letter + '</div></div>').join('');
  return '<div class="reading_answer readingItem91000001" qtype="0">' +
    '<div class="reader_answer_tit workTextWrap combined-tit">(' + (index + 1) +
    ') <span class="read_type">(单选题)</span> Child stem ' + (index + 1) + '?</div>' +
    '<input type="hidden" value=""><div class="stem_answer">' + rows + '</div></div>';
}).join('');
const html = '<!doctype html><meta charset="utf-8"><style>.hoverDiv{min-height:24px;cursor:pointer}</style>' +
  '<div class="subNav"><div id="submitFocus"><a href="#" onclick="return saveWork()">暂时保存</a>' +
  '<a href="#" class="completeBtn" role="button" onclick="return submitValidate()">提交</a></div></div>' +
  '<main class="fanyaMarking"><form id="submitForm"><div class="whiteDiv">' +
  '<div class="questionLi singleQuesId" typename="阅读理解" id="question91000001">' +
  '<h3 class="mark_name">1. <span class="colorShallow">(阅读理解)</span>' + passage + '</h3>' +
  '<div class="clear"></div><input id="answertype91000001" name="answertype91000001" type="hidden" value="15">' +
  '<input id="answer91000001" name="answer91000001" type="hidden"><div class="readComprehensionQues" data="91000001">' +
  children + '</div></div></div></form></main>';
const script = await readFile(new URL('../dist/xuexitong-ai-assistant.user.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const status = page => page.locator('[data-xxt-codex-panel] pre').first();
const waitStatus = (page, message) => page.waitForFunction(
  text => document.querySelector('[data-xxt-codex-panel] pre')?.textContent.includes(text), message
);
const counts = page => page.evaluate(() => window.testCounts);
const selectMode = (page, group, value) =>
  page.locator('[data-choice-group="' + group + '"][data-choice="' + value + '"]').click();

async function scenario(name, test) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await page.goto('https://mooc1.chaoxing.com/mooc-ans/mooc2/work/dowork?courseId=fixture-course&workId=fixture-work');
    await page.evaluate(expected => {
      window.unsafeWindow = window;
      document.hasFocus = () => true;
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
      const config = { provider: 'custom', protocol: 'chat', baseUrl: 'https://model.synthetic.invalid/v1',
        model: 'fixture-only', key: 'fixture-only', maxTokens: 8192, jsonMode: false, reasoning: '' };
      const settings = { 'xxt-quiet-enabled': false, 'xxt-ai-enabled': true, 'xxt-ai-config': config, 'xxt-purpose-schema': true };
      window.GM_getValue = (key, fallback) => Object.hasOwn(settings, key) ? settings[key] : fallback;
      window.GM_setValue = (key, value) => { settings[key] = value; };
      window.testCounts = { models: 0, choice: 0, save: 0, submit: 0 };
      window.modelQuestions = [];
      window.GM_xmlhttpRequest = spec => {
        window.testCounts.models++;
        const timer = setTimeout(() => {
          const content = JSON.parse(spec.data).messages[0].content;
          const text = Array.isArray(content) ? content[0].text : content;
          const questions = JSON.parse(text.split('\n题目：')[1].split('\n之前的平台反馈')[0]);
          window.modelQuestions.push(...questions);
          const answers = questions.map((q, index) => ({
            id: q.id, choices: [expected[index]], readable: true, confidence: 1, explanation: '模拟答案'
          }));
          spec.onload({ status: 200, responseText: JSON.stringify({ choices: [{ message: {
            content: JSON.stringify({ answers })
          } }] }) });
        }, 20);
        return { abort() { clearTimeout(timer); spec.onabort?.(); } };
      };
      window.addChoice = row => {
        window.testCounts.choice++;
        const item = row.closest('.reading_answer');
        item.querySelector('.check_answer')?.classList.remove('check_answer');
        const marker = row.querySelector('.num_option');
        marker.classList.add('check_answer');
        if (!window.skipFieldUpdate) item.querySelector('input[type=hidden]').value = marker.getAttribute('data');
      };
      function acknowledge(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        document.body.append(toast);
        return false;
      }
      window.saveWork = () => { window.testCounts.save++; return acknowledge('暂时保存成功'); };
      window.submitValidate = () => { window.testCounts.submit++; return acknowledge('作业提交成功'); };
    }, expected);
    await page.addScriptTag({ content: script });
    await selectMode(page, '学习板块', 'homework');
    await test(page);
    assert.deepEqual(pageErrors, []);
    console.log('PASS ' + name);
  } finally {
    await context.close();
  }
}

try {
  await scenario('preview carries the shared passage into five independently identified questions', async page => {
    await page.locator('[data-action=solve]').click();
    await waitStatus(page, '第1.5题：D');
    const sent = await page.evaluate(() => window.modelQuestions);
    assert.equal(new Set(sent.map(question => question.id)).size, 5);
    for (const [index, question] of sent.entries()) {
      assert.equal(question.type, 'single');
      assert.match(question.text, /Shared reading passage\.\nIts second paragraph carries a key detail\./);
      assert(question.text.includes('Child stem ' + (index + 1) + '?'));
      assert.deepEqual(question.options.map(option => option.key), options);
    }
    assert.deepEqual(await counts(page), { models: 1, choice: 0, save: 0, submit: 0 });
    assert((await status(page).innerText()).includes('第1.1题：C'));
  });
  await scenario('native options, five matching field reads, no extra finish by default', async page => {
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '已填写可处理题目');
    const states = await page.locator('.reading_answer').evaluateAll(items => items.map(item => [
      item.querySelector('.check_answer').getAttribute('data'), item.querySelector('input[type=hidden]').value
    ]));
    assert.deepEqual(states, expected.map(letter => [letter, letter]));
    assert.deepEqual(await counts(page), { models: 1, choice: 5, save: 0, submit: 0 });
  });
  await scenario('an existing different choice is preserved before any new choice', async page => {
    await page.locator('.reading_answer').nth(4).locator('.hoverDiv').first().click();
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '已有作答与AI答案不同');
    assert.deepEqual(await counts(page), { models: 1, choice: 1, save: 0, submit: 0 });
    assert.equal(await page.locator('.reading_answer').nth(4).locator('input').inputValue(), 'A');
  });
  await scenario('visual selection without field confirmation stops before native save', async page => {
    await page.evaluate(() => { window.skipFieldUpdate = true; });
    await page.locator('[data-choice=save]').click();
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '页面选项与作答字段不一致');
    assert.deepEqual(await counts(page), { models: 1, choice: 1, save: 0, submit: 0 });
  });
  await scenario('native save mode is reached after all five field checks', async page => {
    await page.locator('[data-choice=save]').click();
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '已观察到暂时保存成功');
    assert.deepEqual(await counts(page), { models: 1, choice: 5, save: 1, submit: 0 });
  });
  await scenario('explicit submit mode reaches the native callback only once', async page => {
    await selectMode(page, '主观题', 'ai');
    await selectMode(page, '作答后', 'submit');
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '已观察到作业提交成功');
    await page.locator('[data-action=start]').click();
    await waitStatus(page, '本轮不重复填写或提交');
    assert.deepEqual(await counts(page), { models: 1, choice: 5, save: 0, submit: 1 });
  });
  await scenario('one unverified choice layout blocks the entire group', async page => {
    await page.locator('.reading_answer').last().locator('.hoverDiv').last().evaluate(row => row.setAttribute('qid', 'different'));
    await page.locator('[data-action=solve]').click();
    await waitStatus(page, '有未适配题型');
    assert.deepEqual(await counts(page), { models: 0, choice: 0, save: 0, submit: 0 });
  });
} finally {
  await browser.close();
}
