export function planTool(tasks){
  const patch={type:'object',properties:{title:{type:'string',maxLength:200},dueDate:{type:'string',description:'YYYY-MM-DD in the user local date'},priority:{enum:['high','normal','low']},owner:{enum:['human','ai']},status:{enum:['todo','doing','waiting','done']}},additionalProperties:false};
  return {name:'personal_plan',description:'管理当前用户主控台里的待办。先 list 再决定创建或修改，避免重复；用户明确要求安排或改变状态才写入。create 用 title、dueDate、priority、owner；update 用 id、expectedRevision 和 patch；archive 只归档指定事项。不启动自动化、不设闹钟、不写 Notion；要定时执行需用 Harness 定时任务工具。',
    parameters:{type:'object',properties:{action:{enum:['list','create','update','archive']},input:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer'},title:{type:'string'},dueDate:{type:'string'},priority:{enum:['high','normal','low']},owner:{enum:['human','ai']},patch},additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute:args=>{if(!['list','create','update','archive'].includes(args.action))throw new Error('未知计划操作');return tasks[args.action](args.input||{});},isConcurrencySafe:()=>false};
}
