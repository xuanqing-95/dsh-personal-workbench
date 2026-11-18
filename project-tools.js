export function projectShortcutTool({owner,track=async rows=>rows}){
  const fields={chromeStore:{type:['object','null'],description:'用户自己的 Chrome 商店条目，提供 publisherId 和 32 位 a-p itemId；传 null 可以解除。',properties:{publisherId:{type:'string'},itemId:{type:'string'}},required:['publisherId','itemId'],additionalProperties:false},title:{type:'string',maxLength:50},version:{type:'string',maxLength:40},progress:{type:'string',maxLength:120},source:{type:'string',enum:['codex','harness']},threadId:{type:'string',description:'Exact existing conversation ID. Harness IDs may start with session-; preserve the prefix. Codex uses the UUID.'},icon:{type:'string',enum:['app','code','design','writing']},repository:{type:'string',description:'Known GitHub owner/repo or repository URL. Obtain from the current project, not a guessed name.'},projectPath:{type:'string',description:'Absolute directory of this specific project, supplied by the AI from its workspace. Used to discover its Git remote automatically, including after a repo is created.'}};
  return {name:'personal_project_shortcuts',
    description:'管理首页「项目进展」。用户要求收录项目时先 list，读取当前项目的 Git remote，已知仓库或项目绝对目录时随 create 一起传入 repository/projectPath，不要求用户打开设置页填写。Codex 对话可自动读取该对话的工作目录。仓库尚未创建时保留 projectPath，首页会继续自动识别。repositoryState=ambiguous 时用聊天确认一次，不猜仓库。已有关联仓库的项目换开发对话时 update 原入口的 threadId/source，保留 id 和需求；先读取 revision。提交、合并、发布由工作台只读同步，不能将聊天结束或提交视为发布成功。移除入口不删除仓库或对话。',
    parameters:{type:'object',properties:{action:{type:'string',enum:['list','create','update','remove']},input:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer'},...fields,patch:{type:'object',properties:fields,additionalProperties:false}},additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute(args){
      const store=await owner();
      if(args.action==='list'){const data=await store.list();return {...data,items:await track(data.items)};}
      const value=await store.run(args.action,args.input);
      return args.action==='remove'?value:(await track([value]))[0];
    },isConcurrencySafe:()=>false};
}
