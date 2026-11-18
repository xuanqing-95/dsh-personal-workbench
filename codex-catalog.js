import { execFile } from 'node:child_process';
import { open } from 'node:fs/promises';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';

// This is a passive catalog, not a runtime-status authority. An inProgress turn
// in the history projection can outlive its process; consumers must not silently
// promote this stored status to a verified live execution.
const LIMIT = 64, MAX_OUTPUT = 512 * 1024, MAX_NAMES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['inProgress', 'completed', 'failed', 'interrupted']);
const UNAVAILABLE = 'Codex 记录暂时无法读取，请稍后刷新。';
const PARTIAL = '部分 Codex 记录暂时无法核对，请在 Codex 中查看。';
const CATALOG_SQL = `SELECT id, title, source, updated_at
FROM threads
WHERE archived = 0 AND source IN ('cli', 'vscode')
ORDER BY updated_at DESC, id DESC
LIMIT 65`;

function safeTitle(value) {
  if (typeof value !== 'string') return '未命名 Codex 对话';
  const masked = value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, ' ')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[已隐藏凭据]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [已隐藏凭据]')
    .replace(/((?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|secret)\s*[:=]\s*)[^\s,;]+/gi, '$1[已隐藏凭据]');
  // Legacy SQL titles can contain a whole delegated instruction rather than a
  // human-facing chat name. Never display markup/instruction envelopes.
  if (masked.trimStart().startsWith('<')) return 'Codex 对话';
  return [...masked.trim()].slice(0, 200).join('') || '未命名 Codex 对话';
}

async function readBoundedNames(file) {
  const handle = await open(file, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_NAMES) throw new Error('Names index unavailable');
    // Never allocate or read beyond the cap, even if the append-only index grows
    // while this handle is open. A second stat detects changed file length.
    const buffer = Buffer.alloc(info.size);
    let size = 0;
    while (size < buffer.length) {
      const part = await handle.read(buffer, size, buffer.length - size, size);
      if (!part.bytesRead) break;
      size += part.bytesRead;
    }
    const after = await handle.stat();
    if (size !== info.size || after.size !== info.size) throw new Error('Names index changed while reading');
    return buffer.subarray(0, size).toString('utf8');
  } finally { await handle.close(); }
}

function latestNames(raw, allowed, clock) {
  const names = new Map();
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_NAMES) return names;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    if (!record || typeof record.id !== 'string' || !UUID.test(record.id) || !allowed.has(record.id.toLowerCase())
      || typeof record.thread_name !== 'string' || !record.thread_name.trim()
      || record.thread_name.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, ' ').trimStart().startsWith('<')
      || typeof record.updated_at !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(record.updated_at)) continue;
    const stamp = Date.parse(record.updated_at), date = record.updated_at.slice(0, 10);
    const calendar = new Date(date + 'T00:00:00.000Z');
    if (!Number.isFinite(stamp) || stamp > clock || !Number.isFinite(calendar.valueOf()) || calendar.toISOString().slice(0, 10) !== date) continue;
    const id = record.id.toLowerCase(), previous = names.get(id);
    // Append order breaks equal timestamps: the last valid rename wins.
    if (!previous || stamp >= previous.stamp) names.set(id, { stamp, title: safeTitle(record.thread_name) });
  }
  return names;
}

function timestamp(value, unit, now) {
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  const milliseconds = unit === 'seconds' ? value * 1000 : value;
  if (!Number.isSafeInteger(milliseconds) || milliseconds > now) return null;
  const instant = new Date(milliseconds);
  return Number.isFinite(instant.valueOf()) ? instant.toISOString() : null;
}

function historySQL(ids) {
  // Every interpolated value has passed UUID validation. No path, expression,
  // caller-supplied SQL or conversation text enters this statement.
  return `WITH wanted(thread_id) AS (VALUES ${ids.map(id => `('${id}')`).join(',')})
SELECT w.thread_id, t.turn_id, t.status, t.started_at, t.completed_at,
  (SELECT MAX(MAX(COALESCE(i.created_at_ms, 0), COALESCE(i.started_at_ms, 0), COALESCE(i.completed_at_ms, 0)))
   FROM thread_items AS i WHERE i.thread_id = w.thread_id AND i.turn_id = t.turn_id) AS last_activity_at_ms
FROM wanted AS w
LEFT JOIN thread_turns AS t ON t.thread_id = w.thread_id
  AND t.rollout_ordinal = (SELECT MAX(latest.rollout_ordinal) FROM thread_turns AS latest WHERE latest.thread_id = w.thread_id)`;
}

export function createCodexCatalogReader({ home = os.homedir(), codexHome = path.isAbsolute(process.env.CODEX_HOME||'') ? process.env.CODEX_HOME : path.join(home,'.codex'), run = promisify(execFile), now = () => Date.now(), readNames = readBoundedNames } = {}) {
  const catalogPath = path.join(codexHome, 'state_5.sqlite');
  const historyPath = path.join(codexHome, 'thread_history_1.sqlite');
  const namesPath = path.join(codexHome, 'session_index.jsonl');
  const readClock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value <= 0 || !Number.isFinite(new Date(value).valueOf())) throw new Error('Invalid clock');
    return value;
  };
  async function query(database, sql, rowLimit) {
    const { stdout } = await run('/usr/bin/sqlite3', ['-readonly', '-json', database, sql],
      { shell: false, timeout: 3000, maxBuffer: MAX_OUTPUT });
    if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > MAX_OUTPUT) throw new Error('Invalid catalog response');
    const rows = stdout.trim() ? JSON.parse(stdout) : [];
    if (!Array.isArray(rows) || rows.length > rowLimit || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error('Invalid catalog response');
    }
    return rows;
  }
  return async function read() {
    const coverage = { limit: LIMIT, truncated: false };
    let clock, catalog;
    try {
      clock = readClock();
      catalog = await query(catalogPath, CATALOG_SQL, LIMIT + 1);
    } catch {
      return { availability: 'unavailable', items: [], coverage, reason: UNAVAILABLE };
    }
    coverage.truncated = catalog.length > LIMIT;
    let partial = false;
    const seen = new Set(), roots = [];
    for (const row of catalog) {
      if (typeof row.id !== 'string' || !UUID.test(row.id) || !['cli', 'vscode'].includes(row.source)) { partial = true; continue; }
      const id = row.id.toLowerCase();
      if (seen.has(id)) { partial = true; continue; }
      seen.add(id);
      if (roots.length >= LIMIT) break;
      roots.push({ id, lookupId: row.id, title: safeTitle(row.title), rawUpdatedAt: row.updated_at });
    }
    const base = root => ({ id: root.id, title: root.title, turnId: null, status: null,
      lastActivityAt: null, startedAt: null, completedAt: null, updatedAt: root.updatedAt });
    if (!roots.length) return { availability: partial ? 'partial' : 'connected', items: [], coverage, ...(partial ? { reason: PARTIAL } : {}) };
    const [historyRead, namesRead] = await Promise.allSettled([
      query(historyPath, historySQL(roots.map(root => root.lookupId)), LIMIT),
      Promise.resolve().then(() => readNames(namesPath)),
    ]);
    // The history query can observe an item committed after the first SQL read.
    // Validate source timestamps against the clock after both reads finish.
    try { clock = readClock(); }
    catch { return { availability: 'unavailable', items: [], coverage, reason: UNAVAILABLE }; }
    const names = latestNames(namesRead.status === 'fulfilled' ? namesRead.value : '', new Set(roots.map(root => root.id)), clock);
    for (const root of roots) {
      root.updatedAt = timestamp(root.rawUpdatedAt, 'seconds', clock);
      if (!root.updatedAt) partial = true;
      if (names.has(root.id)) root.title = names.get(root.id).title;
    }
    // Missing/invalid name metadata does not make execution metadata unavailable.
    if (historyRead.status === 'rejected') return { availability: 'partial', items: roots.map(base), coverage, reason: PARTIAL };
    const turns = historyRead.value;
    const byThread = new Map(), repeated = new Set();
    for (const turn of turns) {
      if (typeof turn.thread_id !== 'string' || !UUID.test(turn.thread_id) || !seen.has(turn.thread_id.toLowerCase())) { partial = true; continue; }
      const id = turn.thread_id.toLowerCase();
      if (byThread.has(id) || repeated.has(id)) { partial = true; byThread.delete(id); repeated.add(id); continue; }
      byThread.set(id, turn);
    }
    const items = roots.map(root => {
      const item = base(root), turn = byThread.get(root.id);
      if (!turn || typeof turn.turn_id !== 'string' || !turn.turn_id || turn.turn_id.length > 128 || /[\s\u0000-\u001f\u007f]/u.test(turn.turn_id)) { partial = true; return item; }
      item.turnId = turn.turn_id;
      item.status = STATUSES.has(turn.status) ? turn.status : null;
      if (!item.status) partial = true;
      item.startedAt = timestamp(turn.started_at, 'seconds', clock);
      item.completedAt = timestamp(turn.completed_at, 'seconds', clock);
      const activity = timestamp(turn.last_activity_at_ms, 'milliseconds', clock);
      for (const [raw, normalized] of [[turn.started_at, item.startedAt], [turn.completed_at, item.completedAt], [turn.last_activity_at_ms, activity]]) {
        if (raw !== null && raw !== undefined && normalized === null) partial = true;
      }
      item.lastActivityAt = [item.startedAt, item.completedAt, activity].filter(Boolean).sort().at(-1) || null;
      return item;
    });
    return { availability: partial ? 'partial' : 'connected', items, coverage, ...(partial ? { reason: PARTIAL } : {}) };
  };
}
