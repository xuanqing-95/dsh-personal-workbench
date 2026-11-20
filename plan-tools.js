const views = ['all','today','waiting','archived'];
const actions = ['list','create','update','archive'];
const link = {type:'object',properties:{kind:{enum:['redflow-run','redflow-original','redflow-rewrite']},id:{type:'string',format:'uuid'}},
  required:['kind','id'],additionalProperties:false};
const fields = {
  title:{type:'string',maxLength:200},priority:{enum:['high','normal','low']},
  dueDate:{type:'string',description:'YYYY-MM-DD，使用用户本地日期'},owner:{enum:['human','ai']},link
};
const patch = {type:'object',properties:{...fields,status:{enum:['todo','doing','waiting','done']},
  dueDate:{type:['string','null']},link:{...link,type:['object','null']}},additionalProperties:false};

export function planTool(tasks,name='personal_plan'){
  return {
    name,
    description:'管理当前用户工作台的待办。personal_plan 和 dsh_personal_tasks 操作同一份记录，同一变更只调用一次。先 list 核对已有任务和 revision。create 提供 title、priority，可关联已知的内容任务或成果 UUID。update 使用 id、expectedRevision 和 patch，archive 归档指定事项。任务状态只记录进展，不证明自动化已执行或内容已发布。',
    parameters:{type:'object',properties:{action:{enum:actions},view:{enum:views},input:{type:'object',properties:{
      ...fields,view:{enum:views},id:{type:'string'},expectedRevision:{type:'integer',minimum:1},patch
    },additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute:args=>{
      if(!actions.includes(args.action))throw new Error('未知计划操作。');
      if(args.action==='list')return tasks.list(args.view?{view:args.view}:args.input||{});
      return tasks[args.action](args.input||{});
    },isConcurrencySafe:()=>false
  };
}
