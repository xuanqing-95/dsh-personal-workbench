const blockId = /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;
const normalize = id => id.replaceAll('-', '').toLowerCase();

export function planCheckError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function parsePlanCheck(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['date', 'id', 'checked', 'expectedChecked'].includes(key)) ||
      typeof input.date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(input.date) ||
      !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date ||
      typeof input.id !== 'string' || !blockId.test(input.id) ||
      typeof input.checked !== 'boolean' || typeof input.expectedChecked !== 'boolean') {
    throw planCheckError('PLAN_CHECK_INVALID', '待办信息无效，请刷新后再试。');
  }
  return { date: input.date, id: input.id, checked: input.checked, expectedChecked: input.expectedChecked };
}

// The caller must fetch the selected day's source plan immediately before calling.
// The write target comes from that plan, never directly from the browser.
export async function applyNotionCheck(plan, input, updateTodo) {
  const task = plan.date === input.date && plan.items.find(item => blockId.test(item.id) && normalize(item.id) === normalize(input.id));
  if (!task) throw planCheckError('PLAN_TASK_NOT_FOUND', '这条待办已移动或删除，请刷新计划。');
  if (task.checked === input.checked) return plan;
  if (task.checked !== input.expectedChecked) throw planCheckError('PLAN_CHECK_CONFLICT', '这条待办已在别处更新，请核对后重试。');

  const result = await updateTodo(task.id, input.checked);
  if (result?.type !== 'to_do' || result.archived || result.in_trash ||
      typeof result.id !== 'string' || normalize(result.id) !== normalize(task.id) || result.to_do?.checked !== input.checked) {
    throw planCheckError('PLAN_CHECK_UNKNOWN', 'Notion 暂未确认勾选结果，正在重新读取原待办。');
  }

  const update = item => item.id === task.id ? { ...item, checked: input.checked } : item;
  const updateNode = node => ({ ...node, ...(node.task ? { task: update(node.task) } : {}), children: (node.children || []).map(updateNode) });
  return {
    ...plan,
    items: plan.items.map(update),
    groups: plan.groups.map(group => ({ ...group, tasks: group.tasks.map(update), items: group.items.map(updateNode) })),
  };
}
