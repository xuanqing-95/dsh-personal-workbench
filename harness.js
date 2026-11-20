// Passive Harness observations. Only run() and toggle() write to the Host.
const SCHEDULE_LIMIT = 100, AI_LIMIT = 20, TARGET_LIMIT = 20, TEXT_LIMIT = 1500;
const CALL_MS = 3000, SNAPSHOT_MS = 12000, RUN_MS = 15000;
const failures = {
  UNAVAILABLE: 'Harness 服务尚未接入。', READ_FAILED: 'Harness 读取失败，请刷新核对。',
  TIMEOUT: 'Harness 读取超时，请刷新核对。', INVALID_DATA: 'Harness 返回的数据无法验证。',
  NOT_FOUND: '自动化不存在，请刷新列表。', BUSY: '任务正在执行、等待输入或已有排队指令，未重复派发。',
  COOLDOWN: '刚刚派发过此任务，请稍后刷新执行状态。', IN_FLIGHT: '此任务的操作尚未结束。',
  DISPATCH_UNKNOWN: '派发结果未能确认；请到原会话核对，当前不会重复派发。',
  WRITE_UNKNOWN: '修改结果未能确认，请刷新自动化状态后再决定。',
  CONFLICT: '自动化已变化，请刷新后重新操作。', INVALID_INPUT: '任务操作参数无效。',
  NOT_CHECKED: '超出本次读取范围，尚未检查。', RESULT_UNVERIFIED: '未在本次历史窗口找到这次投递，尚未关联执行结果。',
};
function fail(code) { const error = new Error(failures[code] || failures.READ_FAILED); error.code = code; throw error; }
function reason(error) { return failures[error?.code] || failures.READ_FAILED; }
function identifier(value) { return typeof value === 'string' && value.length > 0 && value.length <= 300 && !/[\s\u0000-\u001f]/u.test(value); }
function safeText(value, max = TEXT_LIMIT) {
  if (typeof value !== 'string') return '';
  const masked = value.replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[已隐藏凭据]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [已隐藏凭据]')
    .replace(/((?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|secret)\s*[:=]\s*)[^\s,;]+/gi, '$1[已隐藏凭据]');
  return [...masked].slice(0, max).join('');
}
function instant(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined;
}
function receipt(value) {
  if (!value || !identifier(value.messageId) || !instant(value.deliveredAt)) return undefined;
  return { messageId: value.messageId, deliveredAt: instant(value.deliveredAt),
    ...(instant(value.scheduledAt) ? { scheduledAt: instant(value.scheduledAt) } : {}),
    ...(identifier(value.targetSessionId) ? { targetSessionId: value.targetSessionId } : {}) };
}
function destination(entry) {
  return identifier(entry?.lastDelivery?.targetSessionId) ? entry.lastDelivery.targetSessionId
    : identifier(entry?.target?.sessionId) ? entry.target.sessionId : undefined;
}
function scheduleLabel(entry) {
  switch (entry.kind) {
    case 'daily': return `每天 ${safeText(entry.time, 30)} · ${safeText(entry.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, 80)}`;
    case 'weekly': return `每周 ${Array.isArray(entry.weekdays) ? entry.weekdays.slice(0, 7).map(x => safeText(String(x), 10)).join('、') : ''} ${safeText(entry.time, 30)} · ${safeText(entry.timeZone || '', 80)}`;
    case 'every': return Number.isFinite(entry.everySeconds) ? `每 ${entry.everySeconds} 秒` : '周期任务';
    case 'after': case 'at': return instant(entry.scheduledAt) || '单次任务';
    case 'cron': return `${safeText(entry.expression, 100)} · ${safeText(entry.timeZone || '', 80)}`;
    case 'rrule': return safeText(entry.rrule, 160) || '自定义重复规则';
    default: return '时间规则待查看';
  }
}
async function bounded(call, milliseconds = CALL_MS, parent) {
  if (parent?.aborted) fail('TIMEOUT');
  const abort = new AbortController();
  let timer, onAbort;
  const timedOut = new Promise((_, reject) => {
    const rejectTimeout = () => { abort.abort(); const e = new Error(failures.TIMEOUT); e.code = 'TIMEOUT'; reject(e); };
    timer = setTimeout(rejectTimeout, milliseconds);
    if (parent) { onAbort = rejectTimeout; parent.addEventListener('abort', onAbort, { once: true }); }
  });
  try { return await Promise.race([Promise.resolve().then(() => call(abort.signal)), timedOut]); }
  finally { clearTimeout(timer); if (parent && onAbort) parent.removeEventListener('abort', onAbort); }
}
function stateView(raw) {
  if (!raw || typeof raw.running !== 'boolean' || !Array.isArray(raw.pendingInput)
      || raw.pendingInput.some(x => !['approval', 'question', 'other'].includes(x))
      || (raw.queue !== null && !Array.isArray(raw.queue))) fail('INVALID_DATA');
  return { running: raw.running, pendingInput: [...raw.pendingInput],
    queue: raw.queue === null ? null : raw.queue.length };
}
function busy(state) { return state.running || state.pendingInput.length > 0 || (state.queue ?? 0) > 0; }
function readingStatus(observation) {
  return { stateAvailable: Boolean(observation?.execution), historyAvailable: Array.isArray(observation?.events),
    ...(observation?.stateError ? { stateError: observation.stateError } : {}),
    ...(observation?.historyError ? { historyError: observation.historyError } : {}) };
}
function eventList(page) {
  if (!page || !Array.isArray(page.records) || typeof page.hasMore !== 'boolean') fail('INVALID_DATA');
  // The Host bounds by message count, so non-message events can exceed that count.
  return page.records.slice(-2000).filter(row => row?.type === 'event' && row.event && Number.isSafeInteger(row.event.seq))
    .map(row => row.event).sort((a, b) => a.seq - b.seq);
}
function latestReply(events, delivery) {
  let candidates = events;
  let currentDelivery;
  if (delivery) {
    const anchor = events.find(e => e.type === 'user/message' && e.surfaceOp === 'append' && e.data?.id === delivery.messageId);
    if (!anchor) return { error: failures.RESULT_UNVERIFIED };
    // Stop at the next user input: a later unrelated turn is not this delivery's result.
    const next = events.find(e => e.seq > anchor.seq && e.type === 'user/message' && e.surfaceOp === 'append');
    currentDelivery = !next;
    candidates = events.filter(e => e.seq > anchor.seq && (!next || e.seq < next.seq));
  }
  const turn = delivery ? { currentDelivery } : {};
  for (let i = candidates.length - 1; i >= 0; i--) {
    const event = candidates[i];
    if (event.type !== 'assistant/message' || event.surfaceOp !== 'append' || !Array.isArray(event.data?.message?.content)) continue;
    const text = safeText(event.data.message.content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n')).trim();
    if (text) return { ...turn, result: { text, ...(instant(event.time) ? { createdAt: instant(event.time) } : {}) } };
  }
  return turn;
}
async function mapLimit(values, concurrency, fn) {
  const results = new Array(values.length); let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    for (;;) { const current = index++; if (current >= values.length) break; results[current] = await fn(values[current]); }
  }));
  return results;
}

export function createHarnessAdapter({ schedule, controller }) {
  if (typeof schedule !== 'function' || typeof controller !== 'function') throw new TypeError('Harness service getters required');
  const locks = new Set(), dispatchedUntil = new Map(), uncertain = new Set();
  function service(getter) { try { return getter(); } catch { return undefined; } }
  async function observe(ctrl, id, parent) {
    const [state, history] = await Promise.allSettled([
      bounded(signal => {
        if (typeof ctrl?.state !== 'function') fail('UNAVAILABLE');
        return ctrl.state({ sessionId: id }, signal);
      }, CALL_MS, parent),
      bounded(signal => {
        if (typeof ctrl?.events !== 'function') fail('UNAVAILABLE');
        return ctrl.events({ address: { kind: 'session', sessionId: id }, maxMessages: 50 }, signal);
      }, CALL_MS, parent),
    ]);
    let execution, events, stateError, historyError;
    try { if (state.status === 'rejected') throw state.reason; execution = stateView(state.value); } catch (e) { stateError = reason(e); }
    try { if (history.status === 'rejected') throw history.reason; events = eventList(history.value); } catch (e) { historyError = reason(e); }
    // A missing reply/history is not an unknown execution state or business
    // failure. Keep each successful read and retain the legacy partial summary.
    const error = stateError || historyError;
    return { execution, events, ...(stateError ? { stateError } : {}), ...(historyError ? { historyError } : {}),
      ...(error ? { error } : {}) };
  }
  function mapped(entry, ctrl, observation) {
    const lastDelivery = receipt(entry.lastDelivery), sessionId = destination(entry);
    const occupied = entry.executionActive === true || (instant(entry.deliveryFloorEndsAt) && Date.parse(entry.deliveryFloorEndsAt) > Date.now());
    const currentTarget = identifier(entry.target?.sessionId) ? entry.target.sessionId : undefined;
    const requiresState = entry.target?.kind === 'session' || Boolean(currentTarget);
    const stateKnown = !requiresState || (sessionId === currentTarget && observation?.execution);
    const error = uncertain.has(entry.id) ? failures.DISPATCH_UNKNOWN : sessionId && !observation ? failures.NOT_CHECKED : observation?.error;
    const result = lastDelivery && observation?.events ? latestReply(observation.events, lastDelivery) : {};
    // Active Harness rules advance scheduledAt after dispatch; an ended rule retains its last occurrence.
    const nextRunAt = !['ended','paused'].includes(entry.status)
      ? instant(entry.nextRunAt) || (entry.status === 'active' ? instant(entry.scheduledAt) : undefined)
      : undefined;
    return { id: entry.id, name: safeText(entry.title || '未命名自动化', 120), prompt: safeText(entry.prompt), status: safeText(entry.status, 30),
      scheduleLabel: scheduleLabel(entry), source: 'harness', timeZone:safeText(entry.timeZone,80)||undefined,
      ...(nextRunAt ? {nextRunAt} : {}),
      canRun: typeof service(schedule)?.run === 'function' && !occupied && !locks.has(entry.id) && !uncertain.has(entry.id)
        && !(dispatchedUntil.get(entry.id) > Date.now()) && Boolean(stateKnown) && (!requiresState || !busy(observation.execution)),
      canToggle: typeof service(schedule)?.edit === 'function' && !locks.has(entry.id),
      ...(entry.updatedAt === undefined ? {} : { updatedAt: entry.updatedAt }),
      ...(lastDelivery ? { lastDelivery, lastRun: lastDelivery.deliveredAt } : {}),
      ...(sessionId ? { sessionId, ...readingStatus(observation) } : {}), ...(observation?.execution ? { execution: observation.execution } : {}),
      ...result, ...(error ? { error } : {}) };
  }
  return Object.freeze({
    async snapshot(followedIds=[]) {
      const sched = service(schedule), ctrl = service(controller), abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), SNAPSHOT_MS);
      try {
        const [catalog, sessions] = await Promise.allSettled([
          sched?.catalog ? bounded(() => sched.catalog(), CALL_MS, abort.signal) : Promise.reject({ code: 'UNAVAILABLE' }),
          ctrl?.list ? bounded(signal => ctrl.list({}, signal), CALL_MS, abort.signal) : Promise.reject({ code: 'UNAVAILABLE' }),
        ]);
        let allSchedules, allSessions, scheduleError, sessionError;
        try { if (catalog.status === 'rejected') throw catalog.reason; if (!Array.isArray(catalog.value) || catalog.value.some(e => !identifier(e?.id))) fail('INVALID_DATA'); allSchedules = catalog.value; } catch (e) { scheduleError = reason(e); }
        try { if (sessions.status === 'rejected') throw sessions.reason; if (!Array.isArray(sessions.value?.items) || sessions.value.items.some(e => !identifier(e?.sessionId))) fail('INVALID_DATA'); allSessions = sessions.value.items; } catch (e) { sessionError = reason(e); }
        const followed=new Set(followedIds);
        const sessionsByPriority=[...(allSessions||[]).filter(e=>followed.has(e.sessionId)),...(allSessions||[]).filter(e=>!followed.has(e.sessionId))];
        const schedules = (allSchedules || []).slice(0, SCHEDULE_LIMIT), ai = sessionsByPriority.slice(0, AI_LIMIT);
        const targetIds = [...new Set(schedules.map(destination).filter(Boolean))].slice(0, TARGET_LIMIT);
        const ids = [...new Set([...ai.map(e => e.sessionId), ...targetIds])];
        const observations = new Map(await mapLimit(ids, 4, async id => [id, await observe(ctrl, id, abort.signal)]));
        const automationItems = schedules.map(e => mapped(e, ctrl, observations.get(destination(e))));
        const aiItems = ai.map(e => {
          const observed = observations.get(e.sessionId), execution = observed?.execution;
          const title = e.projections?.values?.title ?? e.title;
          return { id: e.sessionId, followed:followed.has(e.sessionId), title: safeText(typeof title === 'string' ? title : title?.title || '未命名会话', 120),
            ...readingStatus(observed),
            running: execution?.running ?? null, pendingInput: execution?.pendingInput ?? null, queue: execution?.queue ?? null,
            ...(observed?.events ? latestReply(observed.events) : {}),
            ...(observed?.error ? { error: observed.error } : !observed ? { error: failures.UNAVAILABLE } : {}) };
        });
        return {
          automations: { availability: scheduleError ? 'unavailable' : automationItems.some(e => e.error) ? 'partial' : 'connected', items: automationItems,
            ...(scheduleError ? { reason: scheduleError } : {}), coverage: { shown: schedules.length, total: allSchedules?.length ?? null, limit: SCHEDULE_LIMIT,
              truncated: (allSchedules?.length ?? 0) > SCHEDULE_LIMIT, sessionTargetsChecked: targetIds.filter(id => observations.get(id)?.execution).length,
              sessionTargetLimit: TARGET_LIMIT, note: '最多展示 100 条自动化，检查 20 个关联会话；投递不代表完成。' } },
          ai: { availability: sessionError ? 'unavailable' : aiItems.some(e => e.error) ? 'partial' : 'connected', items: aiItems,
            ...(sessionError ? { reason: sessionError } : {}), coverage: { shown: ai.length, total: allSessions?.length ?? null, limit: AI_LIMIT,
              truncated: (allSessions?.length ?? 0) > AI_LIMIT, note: '最多 20 个会话，优先展示已收录助手；最新回复最多 1500 字，空闲不代表完成。' } },
        };
      } finally { clearTimeout(timer); abort.abort(); }
    },
    async run({ id } = {}) {
      if (!identifier(id)) fail('INVALID_INPUT');
      if (locks.has(id)) fail('IN_FLIGHT');
      if (uncertain.has(id)) fail('DISPATCH_UNKNOWN');
      if (dispatchedUntil.get(id) > Date.now()) fail('COOLDOWN');
      const sched = service(schedule), ctrl = service(controller);
      if (!sched?.view || !sched?.run) fail('UNAVAILABLE');
      locks.add(id);
      try {
        const entry = await bounded(() => sched.view({ id }));
        if (entry?.code === 'schedule_not_found') fail('NOT_FOUND');
        if (!entry || entry.id !== id || entry.code) fail('INVALID_DATA');
        if (entry.executionActive === true || (instant(entry.deliveryFloorEndsAt) && Date.parse(entry.deliveryFloorEndsAt) > Date.now())) fail('BUSY');
        const targetId = identifier(entry.target?.sessionId) ? entry.target.sessionId : undefined;
        if (entry.target?.kind === 'session' && !targetId) fail('INVALID_DATA');
        if (targetId) {
          if (!ctrl?.state) fail('UNAVAILABLE');
          const state = stateView(await bounded(signal => ctrl.state({ sessionId: targetId }, signal)));
          if (busy(state)) fail('BUSY');
        } else if (!['new', 'new_once'].includes(entry.target?.kind)) fail('INVALID_DATA');
        let result;
        try { result = await bounded(signal => sched.run({ id }, signal), RUN_MS); }
        catch { uncertain.add(id); fail('DISPATCH_UNKNOWN'); }
        if (result?.code === 'schedule_execution_pending') fail('BUSY');
        if (result?.code === 'schedule_not_found') fail('NOT_FOUND');
        const delivered = receipt(result?.lastDelivery);
        if (result?.id !== id || result.code || !delivered || delivered.messageId === entry.lastDelivery?.messageId) { uncertain.add(id); fail('DISPATCH_UNKNOWN'); }
        dispatchedUntil.set(id, Date.now() + 60000);
        return { dispatched: true, id, lastDelivery: delivered, ...(delivered.targetSessionId ? { sessionId: delivered.targetSessionId } : {}), message: '指令已投递，执行结果仍需查看接收会话。' };
      } catch (e) { if (e?.code && failures[e.code]) throw e; fail('READ_FAILED'); }
      finally { locks.delete(id); }
    },
    async toggle({ id, enabled, expectedUpdatedAt } = {}) {
      if (!identifier(id) || typeof enabled !== 'boolean' || (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null && typeof expectedUpdatedAt !== 'string')) fail('INVALID_INPUT');
      if (locks.has(id)) fail('IN_FLIGHT');
      const sched = service(schedule); if (!sched?.view || !sched?.edit) fail('UNAVAILABLE');
      locks.add(id);
      try {
        const entry = await bounded(() => sched.view({ id }));
        if (entry?.code === 'schedule_not_found') fail('NOT_FOUND');
        if (entry?.id !== id || entry.code) fail('INVALID_DATA');
        const revision = entry.updatedAt ?? null;
        if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== revision) fail('CONFLICT');
        let result;
        try { result = await bounded(signal => sched.edit({ id, action: 'update', patch: { active: enabled }, expectedUpdatedAt: revision }, undefined, signal), RUN_MS); }
        catch (e) { if (e?.code === 'schedule_conflict' || e?.details?.code === 'schedule_conflict') fail('CONFLICT'); fail('WRITE_UNKNOWN'); }
        if (result?.code === 'schedule_conflict') fail('CONFLICT');
        if (result?.id !== id || result.code || (enabled ? result.status !== 'active' : result.status !== 'paused')) fail('WRITE_UNKNOWN');
        return { id, enabled, status: result.status, ...(result.updatedAt === undefined ? {} : { updatedAt: result.updatedAt }) };
      } catch (e) { if (e?.code && failures[e.code]) throw e; fail('READ_FAILED'); }
      finally { locks.delete(id); }
    },
  });
}
