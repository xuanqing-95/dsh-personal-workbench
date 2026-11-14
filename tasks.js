import { randomUUID } from 'node:crypto';

/**
 * Personal tasks, deliberately independent of Redflow status and network APIs.
 * All methods return Promises; list returns {items,today,scope:'profile'}, mutations return Task.
 * store.read(): root | null | undefined (absent); store.write(root): {ok:true}.
 * write MUST acknowledge only after durable commit. Any other outcome is unknown:
 * the shared store instance is write-blocked until explicitly reconciled by its owner
 * and supplied as a new adapter. No automatic retry or rollback is attempted.
 * Serialization is shared by createTasks instances using the same adapter object;
 * external writers/processes require adapter-level locking/CAS.
 * all = unarchived; archived = archived; waiting = unarchived status waiting.
 * today = unarchived, non-done due today
 * or overdue, plus done tasks whose updatedAt falls today on the local host.
 * Thus editing an already-done task today includes it; this is NOT completedAt.
 * dueDate/link are null when absent; update accepts null to clear either.
 * Timestamps are epoch milliseconds; revision starts at 1; cap includes archives.
 */
const gates = new WeakMap();
const priorities = ['high', 'normal', 'low'];
const statuses = ['todo', 'doing', 'waiting', 'done'];
const owners = ['human', 'ai'];
const kinds = ['redflow-run', 'redflow-original', 'redflow-rewrite'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
});
function fail(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  throw error;
}
function object(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail('INVALID_INPUT', 'Expected a plain object.');
  }
  if (Reflect.ownKeys(value).some(key => !allowed.includes(key)
    || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
    || !('value' in Object.getOwnPropertyDescriptor(value, key)))) {
    fail('INVALID_INPUT', 'Unknown field or unsupported property.');
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail('INVALID_INPUT', `Missing ${key}.`);
  }
}
function choice(value, values, name) {
  if (!values.includes(value)) fail('INVALID_INPUT', `Invalid ${name}.`);
  return value;
}
function title(value) {
  if (typeof value !== 'string' || !value.trim() || [...value].length > 200) {
    fail('INVALID_INPUT', 'title must be nonblank and at most 200 Unicode characters.');
  }
  return value.trim();
}
function id(value) {
  if (typeof value !== 'string' || !uuid.test(value)) fail('INVALID_INPUT', 'Expected UUID.');
  return value;
}
function date(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') {
    fail('INVALID_INPUT', 'dueDate must be a real YYYY-MM-DD date.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail('INVALID_INPUT', 'dueDate must be a real YYYY-MM-DD date.');
  }
  return value;
}
function link(value) {
  if (value === null) return null;
  object(value, ['kind', 'id'], ['kind', 'id']);
  return { kind: choice(value.kind, kinds, 'link kind'), id: id(value.id) };
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail('INVALID_INPUT', 'Expected positive safe-integer revision.');
  return value;
}
function timestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isFinite(new Date(value).getTime())) {
    fail('INVALID_INPUT', 'Expected valid nonnegative epoch milliseconds.');
  }
  return value;
}
function day(value) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(value).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function fields(input) {
  const out = {};
  for (const key of Object.keys(input)) {
    if (key === 'title') out.title = title(input.title);
    if (key === 'priority') out.priority = choice(input.priority, priorities, 'priority');
    if (key === 'status') out.status = choice(input.status, statuses, 'status');
    if (key === 'owner') out.owner = choice(input.owner, owners, 'owner');
    if (key === 'dueDate') out.dueDate = date(input.dueDate);
    if (key === 'link') out.link = link(input.link);
  }
  return out;
}
function root(value) {
  if (value === null || value === undefined) return { version: 1, tasks: [] };
  try {
    object(value, ['version', 'tasks'], ['version', 'tasks']);
    if (value.version !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 500) {
      fail('INVALID_INPUT', 'Invalid task root.');
    }
    const seen = new Set();
    for (const task of value.tasks) {
      const keys = ['id', 'title', 'status', 'priority', 'dueDate', 'link', 'createdAt', 'updatedAt', 'revision', 'archived'];
      object(task, [...keys, 'owner'], keys);
      id(task.id); fields(task); revision(task.revision);
      timestamp(task.createdAt); timestamp(task.updatedAt);
      if (typeof task.archived !== 'boolean' || task.updatedAt < task.createdAt || seen.has(task.id.toLowerCase())) {
        fail('INVALID_INPUT', 'Invalid task record.');
      }
      seen.add(task.id.toLowerCase());
    }
    return { ...structuredClone(value), tasks: value.tasks.map(task => ({ ...structuredClone(task), owner: task.owner ?? 'human' })) };
  } catch {
    fail('STORE_CORRUPT', 'Stored tasks are invalid; refusing to overwrite them.');
  }
}

export function createTasks({ store, now = () => Date.now() }) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function' || typeof now !== 'function') {
    fail('INVALID_INPUT', 'Expected store.read, store.write and now functions.');
  }
  if (!gates.has(store)) gates.set(store, { tail: Promise.resolve(), blocked: false });
  const gate = gates.get(store);
  function enqueue(prepare, operation) {
    // Validate and snapshot at invocation, not after waiting for earlier operations.
    let input;
    try { input = prepare(); } catch (error) { return Promise.reject(error); }
    const result = gate.tail.then(() => operation(input));
    gate.tail = result.catch(() => {});
    return result;
  }
  async function load() {
    let value;
    try { value = await store.read(); }
    catch { fail('STORE_READ_FAILED', 'Could not read durable tasks; no write attempted.'); }
    return root(value);
  }
  async function commit(value, task) {
    try {
      const acknowledgement = await store.write(structuredClone(value));
      if (!acknowledgement || acknowledgement.ok !== true) throw new Error('Unacknowledged write');
    } catch {
      gate.blocked = true;
      fail('STORE_WRITE_UNKNOWN', 'Durable write outcome is unknown. Reconcile storage before using a new adapter; do not blindly retry.');
    }
    return structuredClone(task);
  }
  function writable() {
    if (gate.blocked) fail('STORE_WRITE_BLOCKED', 'Writes blocked after unknown durable outcome; reconcile storage first.');
  }
  function target(value, input) {
    const task = value.tasks.find(task => task.id.toLowerCase() === input.id.toLowerCase());
    if (!task) fail('NOT_FOUND', 'Task does not exist.');
    if (task.revision !== input.expectedRevision) {
      fail('REVISION_CONFLICT', 'Task changed; list again before deciding whether to retry.', { id: task.id, expectedRevision: input.expectedRevision, actualRevision: task.revision });
    }
    if (task.archived) fail('TASK_ARCHIVED', 'Archived tasks are immutable.');
    if (task.revision === Number.MAX_SAFE_INTEGER) fail('REVISION_LIMIT', 'Task revision exhausted.');
    return task;
  }
  function mutationInput(input, hasPatch) {
    object(input, hasPatch ? ['id', 'expectedRevision', 'patch'] : ['id', 'expectedRevision'], hasPatch ? ['id', 'expectedRevision', 'patch'] : ['id', 'expectedRevision']);
    const result = { id: id(input.id), expectedRevision: revision(input.expectedRevision) };
    if (hasPatch) {
      object(input.patch, ['title', 'priority', 'dueDate', 'status', 'link', 'owner']);
      if (!Object.keys(input.patch).length) fail('INVALID_INPUT', 'patch must contain at least one field.');
      result.patch = fields(input.patch);
    }
    return result;
  }
  return Object.freeze({
    list(input = {}) {
      return enqueue(() => {
        object(input, ['view']);
        return choice(Object.hasOwn(input, 'view') ? input.view : 'all', ['all', 'today', 'waiting', 'archived'], 'view');
      }, async view => {
        const value = await load();
        const today = day(timestamp(now()));
        const items = value.tasks.filter(task => view === 'archived' ? task.archived : !task.archived && (view === 'all'
          || (view === 'waiting' ? task.status === 'waiting'
            : task.status === 'done' ? day(task.updatedAt) === today : task.dueDate !== null && task.dueDate <= today)));
        return { items, today, scope: 'profile', writeBlocked: gate.blocked };
      });
    },
    create(input) {
      return enqueue(() => {
        object(input, ['title', 'priority', 'dueDate', 'link', 'owner'], ['title', 'priority']);
        // Create uses optional omission; null clearing is exclusive to update.
        if (input.dueDate === null || input.link === null) fail('INVALID_INPUT', 'Omit absent create dueDate/link.');
        return fields(input);
      }, async input => {
        writable();
        const value = await load();
        if (value.tasks.length >= 500) fail('TASK_LIMIT', 'Maximum 500 tasks, including archives; no records were removed.');
        const time = timestamp(now());
        const task = { id: randomUUID(), title: input.title, status: 'todo', priority: input.priority,
          owner: input.owner ?? 'human',
          dueDate: input.dueDate ?? null, link: input.link ?? null, createdAt: time, updatedAt: time, revision: 1, archived: false };
        value.tasks.push(task);
        return commit(value, task);
      });
    },
    update(input) {
      return enqueue(() => mutationInput(input, true), async input => {
        writable();
        const value = await load();
        const task = target(value, input);
        Object.assign(task, input.patch, { revision: task.revision + 1, updatedAt: Math.max(task.updatedAt, timestamp(now())) });
        return commit(value, task);
      });
    },
    archive(input) {
      return enqueue(() => mutationInput(input, false), async input => {
        writable();
        const value = await load();
        const task = target(value, input);
        Object.assign(task, { archived: true, revision: task.revision + 1, updatedAt: Math.max(task.updatedAt, timestamp(now())) });
        return commit(value, task);
      });
    },
  });
}
