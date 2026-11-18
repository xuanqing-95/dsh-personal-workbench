import { randomUUID } from 'node:crypto';

// This domain stores organization only. Source paths and execution references are
// inert labels: this module never reads files, dispatches work, or changes tasks.
// All instances sharing an adapter share a queue. Cross-process locking/CAS must
// be supplied by that adapter. A write must acknowledge after durable commit.
const gates = new WeakMap();
const areas = ['software', 'longterm', 'routine'];
const statuses = ['active', 'waiting', 'paused', 'done', 'review'];
const intents = ['build', 'update', 'review', 'other'];
const sourceKinds = ['task', 'plan', 'automation'];
const executionSources = ['harness', 'hermes'];
const projectFields = ['title', 'area', 'status', 'goal', 'nextAction', 'sourceLabel', 'sourcePath'];
const metaFields = ['projectId', 'focusDate', 'intent', 'note', 'executionRef'];
const projectKeys = ['id', ...projectFields, 'createdAt', 'updatedAt', 'revision', 'archived'];
const metaKeys = ['sourceRef', ...metaFields, 'updatedAt', 'revision'];
const limits = { projects: 200, itemMeta: 2000 };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TIME = 8640000000000000;

function fail(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  throw error;
}
function object(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('INVALID_INPUT', 'Expected a plain object.');
  if (Reflect.ownKeys(value).some(key => !allowed.includes(key)
    || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
    || !('value' in Object.getOwnPropertyDescriptor(value, key)))) fail('INVALID_INPUT', 'Unknown field or unsupported property.');
  for (const key of required) if (!Object.hasOwn(value, key)) fail('INVALID_INPUT', `Missing ${key}.`);
}
function text(value, maximum, name, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !value.trim() || [...value].length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail('INVALID_INPUT', `${name} must be nonblank text of at most ${maximum} characters.`);
  }
  return value.trim();
}
function choice(value, values, name) {
  if (!values.includes(value)) fail('INVALID_INPUT', `Invalid ${name}.`);
  return value;
}
function id(value) {
  if (typeof value !== 'string' || !uuid.test(value)) fail('INVALID_INPUT', 'Expected UUID.');
  return value;
}
function reference(value, execution = false) {
  if (execution && value === null) return null;
  const key = execution ? 'source' : 'kind';
  object(value, [key, 'id'], [key, 'id']);
  const refId = text(value.id, 300, 'reference id');
  if (refId !== value.id || /[\r\n\t]/.test(refId)) fail('INVALID_INPUT', 'Reference id must be a trimmed single line.');
  return { [key]: choice(value[key], execution ? executionSources : sourceKinds, key), id: refId };
}
function date(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') fail('INVALID_INPUT', 'focusDate must be a real YYYY-MM-DD date.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('INVALID_INPUT', 'focusDate must be a real YYYY-MM-DD date.');
  return value;
}
function revision(value, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) fail('INVALID_INPUT', 'Invalid revision.');
  return value;
}
function timestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIME) fail('INVALID_INPUT', 'Expected valid epoch milliseconds.');
  return value;
}
function projectValues(input) {
  const out = {};
  for (const key of Object.keys(input)) {
    if (key === 'title') out.title = text(input.title, 200, 'title');
    if (key === 'area') out.area = choice(input.area, areas, 'area');
    if (key === 'status') out.status = choice(input.status, statuses, 'status');
    if (key === 'goal' || key === 'nextAction') out[key] = text(input[key], 1000, key, true);
    if (key === 'sourceLabel') out.sourceLabel = text(input.sourceLabel, 200, key, true);
    if (key === 'sourcePath') out.sourcePath = text(input.sourcePath, 2000, key, true);
  }
  return out;
}
function metaValues(input) {
  const out = {};
  for (const key of Object.keys(input)) {
    if (key === 'projectId') out.projectId = input.projectId === null ? null : id(input.projectId);
    if (key === 'focusDate') out.focusDate = date(input.focusDate);
    if (key === 'intent') out.intent = input.intent === null ? null : choice(input.intent, intents, 'intent');
    if (key === 'note') out.note = text(input.note, 2000, 'note', true);
    if (key === 'executionRef') out.executionRef = reference(input.executionRef, true);
  }
  return out;
}
const sourceKey = ref => JSON.stringify([ref.kind, ref.id]);
export const initialOrganization = () => ({ version: 1, projects: [], itemMeta: [] });

function validateRoot(value) {
  object(value, ['version', 'projects', 'itemMeta'], ['version', 'projects', 'itemMeta']);
  if (value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > limits.projects
    || !Array.isArray(value.itemMeta) || value.itemMeta.length > limits.itemMeta) fail('INVALID_INPUT', 'Invalid organization root.');
  const projects = new Set(), sources = new Set();
  for (const project of value.projects) {
    object(project, projectKeys, projectKeys);
    id(project.id); projectValues(project); revision(project.revision);
    timestamp(project.createdAt); timestamp(project.updatedAt);
    const key = project.id.toLowerCase();
    if (typeof project.archived !== 'boolean' || project.updatedAt < project.createdAt || projects.has(key)) fail('INVALID_INPUT', 'Invalid project record.');
    projects.add(key);
  }
  for (const meta of value.itemMeta) {
    object(meta, metaKeys, metaKeys);
    const key = sourceKey(reference(meta.sourceRef));
    metaValues(meta); timestamp(meta.updatedAt); revision(meta.revision);
    if (sources.has(key) || (meta.projectId !== null && !projects.has(meta.projectId.toLowerCase()))) fail('INVALID_INPUT', 'Invalid item metadata.');
    // Archived associations remain valid history. Only new associations are refused.
    sources.add(key);
  }
  return value;
}
function root(value) {
  if (value === null || value === undefined) return initialOrganization();
  try { return structuredClone(validateRoot(value)); }
  catch { fail('STORE_CORRUPT', 'Stored organization is invalid; refusing to overwrite it.'); }
}

export function organizationSchema(z) {
  const string = maximum => z.string().refine(value => {
    try { text(value, maximum, 'text'); return true; } catch { return false; }
  }, { message: 'Invalid text.' });
  const uuidString = z.string().regex(uuid);
  const epoch = z.number().int().min(0).max(MAX_TIME);
  const rev = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
  const nullableDate = z.string().refine(value => { try { date(value); return true; } catch { return false; } }).nullable();
  const ref = z.object({ kind: z.enum(sourceKinds), id: string(300) }).strict();
  const execution = z.object({ source: z.enum(executionSources), id: string(300) }).strict().nullable();
  return z.object({
    version: z.literal(1),
    projects: z.array(z.object({
      id: uuidString, title: string(200), area: z.enum(areas), status: z.enum(statuses),
      goal: string(1000).nullable(), nextAction: string(1000).nullable(), sourceLabel: string(200).nullable(), sourcePath: string(2000).nullable(),
      createdAt: epoch, updatedAt: epoch, revision: rev, archived: z.boolean(),
    }).strict()).max(limits.projects),
    itemMeta: z.array(z.object({
      sourceRef: ref, projectId: uuidString.nullable(), focusDate: nullableDate, intent: z.enum(intents).nullable(),
      note: string(2000).nullable(), executionRef: execution, updatedAt: epoch, revision: rev,
    }).strict()).max(limits.itemMeta),
  }).strict().superRefine((value, ctx) => {
    try { validateRoot(value); }
    catch { ctx.addIssue({ code: 'custom', message: 'Invalid organization relationships or records.' }); }
  });
}

export function createOrganization({ store, now = () => Date.now() }) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function' || typeof now !== 'function') fail('INVALID_INPUT', 'Expected store.read, store.write and now functions.');
  if (!gates.has(store)) gates.set(store, { tail: Promise.resolve(), blocked: false });
  const gate = gates.get(store);
  function enqueue(prepare, operation) {
    let input;
    try { input = prepare(); } catch (error) { return Promise.reject(error); }
    const result = gate.tail.then(() => operation(input));
    gate.tail = result.catch(() => {});
    return result;
  }
  async function load() {
    let value;
    try { value = await store.read(); }
    catch { fail('STORE_READ_FAILED', 'Could not read durable organization; no write attempted.'); }
    return root(value);
  }
  function writable() {
    if (gate.blocked) fail('STORE_WRITE_BLOCKED', 'Writes blocked after unknown durable outcome; reconcile storage first.');
  }
  async function commit(value, result) {
    try {
      const acknowledgement = await store.write(structuredClone(value));
      if (!acknowledgement || acknowledgement.ok !== true) throw new Error('Unacknowledged write');
    } catch {
      gate.blocked = true;
      fail('STORE_WRITE_UNKNOWN', 'Durable write outcome is unknown. Reconcile storage before using a new adapter; do not blindly retry.');
    }
    return structuredClone(result);
  }
  function compare(actual, expected, details) {
    if (actual !== expected) fail('REVISION_CONFLICT', 'Record changed; list again before deciding whether to retry.', { ...details, expectedRevision: expected, actualRevision: actual });
    if (actual === Number.MAX_SAFE_INTEGER) fail('REVISION_LIMIT', 'Record revision exhausted.');
  }
  function mutation(input, withPatch) {
    const keys = withPatch ? ['id', 'expectedRevision', 'patch'] : ['id', 'expectedRevision'];
    object(input, keys, keys);
    const out = { id: id(input.id), expectedRevision: revision(input.expectedRevision) };
    if (withPatch) {
      object(input.patch, projectFields);
      if (!Object.keys(input.patch).length) fail('INVALID_INPUT', 'patch must contain at least one field.');
      out.patch = projectValues(input.patch);
    }
    return out;
  }
  function target(value, input) {
    const project = value.projects.find(p => p.id.toLowerCase() === input.id.toLowerCase());
    if (!project) fail('NOT_FOUND', 'Project does not exist.');
    compare(project.revision, input.expectedRevision, { id: project.id });
    if (project.archived) fail('PROJECT_ARCHIVED', 'Archived projects are immutable.');
    return project;
  }
  return Object.freeze({
    list(input = {}) {
      return enqueue(() => object(input, []), async () => {
        const { projects, itemMeta } = await load();
        // A successful refresh confirms data only; it cannot reconcile a lost
        // write acknowledgement. Keep this adapter state visible to the UI.
        return { projects, itemMeta, writeBlocked: gate.blocked };
      });
    },
    createProject(input) {
      return enqueue(() => {
        object(input, projectFields, ['title', 'area', 'status']);
        return projectValues(input);
      }, async input => {
        writable();
        const value = await load();
        if (value.projects.length >= limits.projects) fail('PROJECT_LIMIT', 'Maximum 200 projects, including archives; no records were removed.');
        const time = timestamp(now());
        const project = { id: randomUUID(), title: input.title, area: input.area, status: input.status,
          goal: input.goal ?? null, nextAction: input.nextAction ?? null, sourceLabel: input.sourceLabel ?? null, sourcePath: input.sourcePath ?? null,
          createdAt: time, updatedAt: time, revision: 1, archived: false };
        value.projects.push(project);
        return commit(value, project);
      });
    },
    updateProject(input) {
      return enqueue(() => mutation(input, true), async input => {
        writable();
        const value = await load(), project = target(value, input);
        Object.assign(project, input.patch, { revision: project.revision + 1, updatedAt: Math.max(project.updatedAt, timestamp(now())) });
        return commit(value, project);
      });
    },
    archiveProject(input) {
      return enqueue(() => mutation(input, false), async input => {
        writable();
        const value = await load(), project = target(value, input);
        Object.assign(project, { archived: true, revision: project.revision + 1, updatedAt: Math.max(project.updatedAt, timestamp(now())) });
        return commit(value, project);
      });
    },
    setItemMeta(input) {
      return enqueue(() => {
        object(input, ['sourceRef', 'expectedRevision', 'patch'], ['sourceRef', 'expectedRevision', 'patch']);
        object(input.patch, metaFields);
        if (!Object.keys(input.patch).length) fail('INVALID_INPUT', 'patch must contain at least one field.');
        return { sourceRef: reference(input.sourceRef), expectedRevision: revision(input.expectedRevision, true), patch: metaValues(input.patch) };
      }, async input => {
        writable();
        const value = await load();
        let meta = value.itemMeta.find(m => sourceKey(m.sourceRef) === sourceKey(input.sourceRef));
        compare(meta?.revision ?? 0, input.expectedRevision, { sourceRef: input.sourceRef });
        if (input.patch.projectId !== undefined && input.patch.projectId !== null) {
          const project = value.projects.find(p => p.id.toLowerCase() === input.patch.projectId.toLowerCase());
          if (!project) fail('NOT_FOUND', 'Associated project does not exist.');
          if (project.archived) fail('PROJECT_ARCHIVED', 'Cannot associate an archived project.');
          input.patch.projectId = project.id;
        }
        const time = timestamp(now());
        if (!meta) {
          if (value.itemMeta.length >= limits.itemMeta) fail('ITEM_META_LIMIT', 'Maximum 2000 item metadata records; no records were removed.');
          meta = { sourceRef: input.sourceRef, projectId: null, focusDate: null, intent: null, note: null, executionRef: null, updatedAt: time, revision: 0 };
          value.itemMeta.push(meta);
        }
        Object.assign(meta, input.patch, { revision: meta.revision + 1, updatedAt: Math.max(meta.updatedAt, time) });
        return commit(value, meta);
      });
    },
  });
}
