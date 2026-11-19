import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
function section(start, end) {
  const left = source.indexOf(start);
  const right = source.indexOf(end, left);
  assert.ok(left >= 0 && right > left);
  return source.slice(left, right);
}
const quotaView = section('const codexQuota=list(usage?.quotas)', 'const usageTrigger=')
  + section('function financeCards(){', 'function usageRing(');

function render(quotas, accounts, canConnectHarness = true) {
  const context = {
    usage: {quotas}, quotaData: {accounts, canConnectHarness}, quotaError: '', quotaBusy: false,
    list: value => Array.isArray(value) ? value : [],
    h: (type, props, ...children) => ({type, props, children}),
    grid: {card: () => ({}), handles: () => null}, contentProps: {},
    usageOverview: () => null, usageRing: () => null,
    usageTime: value => value, usageZone: 'UTC'
  };
  function labels(node) {
    if (Array.isArray(node)) return node.map(labels).join(' ');
    if (typeof node === 'string') return node;
    return node?.children ? labels(node.children) : '';
  }
  const [card, dialog] = vm.runInNewContext(quotaView + '\n[financeCards(),quotaManager()]', context);
  return {card: labels(card), dialog: labels(dialog)};
}

const legacyManual = {provider: 'manual', id: 'manual-legacy', label: 'LegacyAccount', entries: [{label: 'LegacyUnits', value: 37, unit: '次'}]};
const wallet = {provider: 'harness', id: 'harness', entries: [{label: '充值余额', value: '16.80', unit: 'CNY'}]};
function codex(resetAt) {
  return {provider: 'Codex', observedAt: new Date().toISOString(), windows: [{minutes: 300, remaining: 73, resetAt}]};
}

test('a client receiving legacy manual accounts still shows the first-run quota card and genuine connection choices', () => {
  const {card, dialog} = render([], [legacyManual]);
  assert.match(card, /连接额度/);
  assert.match(card, /—/);
  assert.match(dialog, /Codex 套餐额度/);
  assert.match(dialog, /连接当前账号/);
  assert.doesNotMatch(card + dialog, /LegacyAccount|LegacyUnits|37|共 2 个来源|0%/);
  assert.doesNotMatch(render([], [], false).dialog, /连接当前账号/);
});

test('both genuine sources keep their own units and expired records never supply a live percentage', () => {
  const future = new Date(Date.now() + 3600000).toISOString();
  const {card, dialog} = render([codex(future)], [legacyManual, wallet]);
  for (const area of [card, dialog]) {
    assert.match(area, /73%/);
    assert.match(area, /¥16\.80/);
    assert.doesNotMatch(area, /LegacyAccount|LegacyUnits/);
  }
  assert.match(card, /共 2 个来源/);
  assert.match(dialog, /断开连接/);
  const expired = render([codex('2000-01-01T00:00:00Z')], [wallet]);
  assert.match(expired.card, /¥16\.80/);
  assert.match(expired.dialog, /等待更新/);
  assert.doesNotMatch(expired.card + expired.dialog, /73%|共 2 个来源/);
});
