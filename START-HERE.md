# 开始使用个人 AI 工作台

本指南适用于已经安装 DeepSeek Harness 0.2.2（从 rc.1 起）的用户。

## 安装

1. 在 DeepSeek Harness 左侧点击「插件」，打开「添加插件」。
2. 将下面的地址整行复制到安装框。
3. 点击「安装」，按提示启用。再点左侧「个人 AI 工作台」。

```text
https://github.com/xuanqing-95/dsh-personal-workbench/releases/download/v0.8.0-beta.9/dsh-personal-workbench-0.8.0-beta.9.tgz
```

如果安装框无法从 GitHub 下载，请先下载官方安装包，再把下载文件的完整路径粘贴到同一个安装框。macOS 访达中按住 Option 右键点击文件，可选「拷贝为路径名称」。使用扩展名为 `.tgz` 的文件即可，直接保留压缩状态。[下载 0.8.0-beta.9](https://github.com/xuanqing-95/dsh-personal-workbench/releases/download/v0.8.0-beta.9/dsh-personal-workbench-0.8.0-beta.9.tgz)

## 先加一条待办

在「今日计划」底部写「明天准备演示」，点「添加」。这条记录属于卡片上当前选中的日期。想排到明天，可以先在周视图点明天，再添加。点击整条待办或复选框可以完成或取消完成，点任务里的链接会打开链接。

## 和你的 Data 聊天

在 Data 旁点「聊聊」，或点顶部「AI个人助手」。如果 Harness 请你选择工作区，就选平时使用的那个。首次使用 AI 须先在 Harness 配好自己的模型。

可以试着说「把明天准备演示加入计划」，或「把这份已完成的日报放到工作台，第一条是头条」。回到工作台即可核对保存结果。自己的日报出现在「AI每日精选」，助手的任务进度出现在「AI 助手任务进展」。

## 调整布局和外观

「编辑布局」可移动和缩放各张卡片。用量和额度可以分开调。右上角头像打开「工作台设置」，切换背景或头像时可先预览，点「保存」应用，点「取消」回到上次的设置。页底的「使用帮助」可以重新打开入门提示。

## 按需连接自己的工具

下表适用于已经在用这些工具的人。普通待办可以直接用。表格里的大写名称是 **Harness 宿主进程的环境变量**，需要通过你启动 Harness 的环境设置；工作台聊天框、角色提示词和反馈截图都不适合填写凭据。

| 想查看什么 | 准备什么 |
| --- | --- |
| 本机用量和 Codex 额度 | 使用支持的 Harness、Codex、Hermes 客户端后，工作台会读取它们在本机已有的用量记录。自定义数据目录可用 `DSH_HOME`、`CODEX_HOME`、`HERMES_HOME` 指定。今日和七日用量按运行 Harness 的电脑所在时区计算；Hermes 只有累计账本，显示在累计明细中。剩余额度取自 Codex 最近返回的限额窗口。 |
| 自己归档的日报 | 可用助手工具直接保存。已有兼容的日报生成流程可用 `DSH_WORKBENCH_BRIEF_DIR` 指定自己的归档目录完整路径。工作台按刊期读取 `YYYY-MM-DD.json` 与 `YYYY-MM-DD.status.json`，分别用于内容和发布结果。归档中的头图也可随刊期保存在同一归档根目录的 `assets/YYYY-MM-DD/` 中，并由该期头图的 `local_image` 或 `local_path` 引用。 |
| Hermes 日报任务 | 读取自己 Hermes 中已有的定时任务。多个配置可用 `DSH_WORKBENCH_HERMES_PROFILE` 指定，多个日报任务可用 `DSH_WORKBENCH_HERMES_JOB_ID` 指定。macOS 的对话跳转需要本机 Hermes 应用及对应会话。 |
| 独立「今日计划」应用 | 将 `DSH_WORKBENCH_LOCAL_PLAN_FILE` 指向自己的 `local-plans.json`（今日计划 v1）。工作台读取待办、分组、备注及完成状态。编辑这些记录请回到原应用，工作台新建的待办仍可在本页勾选。 |
| Notion 日计划 | 在 Notion 将自己的数据源共享给自己的集成。设置 `DSH_WORKBENCH_NOTION_TOKEN` 与 `DSH_WORKBENCH_NOTION_DAILY_SOURCE_ID`。每个日期对应一页，工作台读取「今日计划」标题下的待办。如果有多个日期字段，设置 `DSH_WORKBENCH_NOTION_DAILY_DATE_PROPERTY`；标题不同可设 `DSH_WORKBENCH_NOTION_DAILY_SECTION`。 |
| 从工作台勾选 Notion 待办 | 日计划默认只读。需要写回时，为该集成授予更新内容的权限，并显式设置 `DSH_WORKBENCH_NOTION_CHECKBOX_WRITE=1`。点击时先核对当天的原始待办，再保存勾选。 |
| Notion 周计划和未来事项 | 使用同一个 Notion 集成令牌，用 `DSH_WORKBENCH_NOTION_DATA_SOURCE_ID` 指定自己的任务数据源。每件任务占一行，包含标题和日期，可选状态。多个日期字段时指定 `DSH_WORKBENCH_NOTION_DATE_PROPERTY`。日期范围内的任务会出现在对应的各天，点有链接的任务可打开原记录。 |
| 项目仓库和商店审核 | 在自己的电脑安装并登录 GitHub CLI（`gh`），关联项目仓库。Chrome Web Store 项目可在 macOS 用包内 `connect-chrome-store.mjs` 配合自己的 Google 桌面 OAuth 客户端授权只读访问，并将 publisherId、itemId 关联到自己的项目。 |
| Codex 会话提醒 | 如果某个本机会话的最新一轮在过去 24 小时内明确失败，可以从「需要你处理」直接打开对应会话。实时运行进度和待批准操作可在 Codex 中查看。 |
| 微信提醒 | 先在你自己的 Hermes 完成微信通道配置，再设置 `DSH_WORKBENCH_WEIXIN_ENABLED=1` 和 `DSH_WORKBENCH_WEIXIN_TARGET`（自己的 `weixin:…` 目标）。如系统找不到 Hermes，可用 `DSH_WORKBENCH_HERMES_BIN` 指定可执行文件。默认关闭。 |
| 会议提醒 | 开启微信提醒后，可用 `DSH_WORKBENCH_MEETINGS_FILE` 指定自己的 JSON 文件。每条会议包含标识 `id`、带时区的开始时间 `start` 和飞书或 Lark 的 HTTPS 入会地址 `url`。工作台运行时在开始前五分钟检查，同一场会议去重。 |

## 遇到问题

- **侧栏没有工作台**。去「插件」核对是否已启用、宿主是否在支持的版本范围。升级或重载整个插件请等当前聊天结束后再做。
- **卡片为空或显示暂无数据**。先确认自己是否已经保存过待办、日报或项目；额度需要 Codex 实际返回过限额信息。未连接服务时可以继续使用本机功能。
- **看得到计划却不能勾选**。工作台自己的待办可以直接勾选。Notion 需要写入授权，独立「今日计划」的数据请在原应用编辑。
- **需要报告问题**。提供系统、Harness 和插件版本，加一张遮挡私人信息的截图即可。[提交反馈](https://github.com/xuanqing-95/dsh-personal-workbench/issues)

DSH · Designed by XUANQING · © 2026
