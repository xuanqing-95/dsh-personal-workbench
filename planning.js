// Plans use calendar dates. Defaults follow the timezone of the local Harness host.
const local = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit'});
export const todayLabel = (now = new Date()) => local.format(now);
export const dates = {
  day(value) {
    if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(value)) return false;
    const instant = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(+instant) && instant.toISOString().slice(0,10) === value;
  },
  month(value) { return typeof value === 'string' && /^20\d\d-(0[1-9]|1[0-2])$/.test(value); },
};
export function planDay(records, day = todayLabel()) {
  if (!dates.day(day)) throw new RangeError('Invalid plan date');
  const items = records.filter(task => !task.archived && task.dueDate === day)
    .map(task => ({id:task.id,title:task.title,checked:task.status==='done',revision:task.revision}));
  return {date:day,source:'profile',title:'今日计划',availability:items.length?'connected':'empty',items,groups:[]};
}
export function calendarMonth(records, month) {
  if (!dates.month(month)) throw new RangeError('Invalid calendar month');
  const days = {};
  for (const task of records) {
    if (task.archived || !dates.day(task.dueDate) || task.dueDate.slice(0,7) !== month) continue;
    const checked=task.status==='done';
    const summary=days[task.dueDate] ||= {status:'available',count:0,done:0,first:{title:task.title,checked},items:[]};
    if(summary.items.length<5)summary.items.push({id:task.id,title:task.title,checked});
    summary.count++;
    if(checked)summary.done++;
  }
  return {month,source:'profile',availability:'connected',days};
}
