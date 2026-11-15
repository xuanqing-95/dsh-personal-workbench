import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const fail = (code, message) => Object.assign(new Error(message), { code });

// The external destination is constructed here, never supplied as a URL. This
// first version only opens chats on the local Codex host; it does not resume or
// send messages to a chat. Each thread has its own in-flight click lock.
export function createCodexThreadOpener({ run = promisify(execFile), platform = process.platform } = {}) {
  const pending = new Map();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return async function openCodexThread(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
      || Reflect.ownKeys(input).some(key => !['id', 'hostId'].includes(key)
        || !Object.getOwnPropertyDescriptor(input, key)?.enumerable
        || !('value' in Object.getOwnPropertyDescriptor(input, key)))
      || !Object.hasOwn(input, 'id') || typeof input.id !== 'string' || !uuid.test(input.id)
      || (Object.hasOwn(input, 'hostId') && input.hostId !== 'local')) {
      throw fail('INVALID_INPUT', '请选择有效的本机 Codex 对话。');
    }
    if (platform !== 'darwin') throw fail('APP_UNAVAILABLE', '此入口仅支持本机 macOS Codex 应用。');
    const id = input.id.toLowerCase();
    if (!pending.has(id)) {
      const opening = (async () => {
        try {
          await run('/usr/bin/open', ['-b', 'com.openai.codex', `codex://threads/${id}?hostId=local`],
            { shell: false, timeout: 5000, maxBuffer: 4096 });
          return { opened: true, application: 'codex', id, hostId: 'local' };
        } catch {
          throw fail('APP_OPEN_FAILED', '无法打开 Codex 对话。请确认应用已安装后重试。');
        }
      })().finally(() => { pending.delete(id); });
      pending.set(id, opening);
    }
    return pending.get(id);
  };
}
