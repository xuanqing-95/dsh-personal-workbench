# 个人 AI 工作台

把 AI 任务、项目进度和今天的计划放进 DeepSeek Harness 的同一页。要同时跟几个项目时，你可以先看哪些事等你处理，点开助手刚交付的成果，再把下一步排到今天。

[免费安装到 DeepSeek Harness](https://xuanqing-95.github.io/dsh-personal-workbench/#install) · [第一次使用](./START-HERE.md)

[![工作台实际界面：左侧是每日精选、助手任务和项目进展，右侧是 Data、用量与今日计划。](https://xuanqing-95.github.io/dsh-personal-workbench/preview.png)](https://xuanqing-95.github.io/dsh-personal-workbench/preview.png)

*图中使用示例数据。首次打开即可添加自己的待办，接入的项目、日报和用量记录会显示在相应卡片。*

## 什么时候值得打开它

| 你想知道什么 | 在工作台怎么做 |
| --- | --- |
| 今天哪件事卡住了？ | 打开「需要你处理」，查看等你回复的会话或已报告的执行异常。点有入口的事项，回到对应对话或日报。 |
| 助手交付的内容在哪里？ | 在「AI 助手任务进展」查看最新进展和上次成果。连接兼容的内容工作台后，可以分清文案已生成、配图尚未完成，也可以点进对应稿件。 |
| 几个项目之间，下一步该跟哪一个？ | 在「项目进展」查看最新进展和下一步，点箭头回到关联对话。转到「今日计划」加入待办，按日、周或月查看安排。 |

「AI每日精选」保留自己的日报刊期和原文入口。点击「今日用量」可看本机支持的模型用量记录，「剩余额度」显示 Codex 最近返回的套餐剩余百分比。在支持账户余额的 Harness 中，也可以连接当前账号查看充值余额和赠金。你还可以通过「编辑布局」调整这些卡片的位置和大小。

## 安装并记下第一条待办

适用于已经安装 **DeepSeek Harness 0.2.2（从 rc.1 起）** 的用户。

1. 在 Harness 左侧打开 **插件 → 添加插件**。
2. 把下面整行地址粘贴到安装框，点击「安装」并按提示启用。
3. 从侧栏打开「个人 AI 工作台」，在「今日计划」选一个日期，写下要跟进的事，点击「添加」。

```text
https://github.com/xuanqing-95/dsh-personal-workbench/releases/latest/download/dsh-personal-workbench.tgz
```

也可以先下载同一安装包，将文件的完整路径粘贴到「添加插件」。[下载安装包](https://github.com/xuanqing-95/dsh-personal-workbench/releases/latest/download/dsh-personal-workbench.tgz)

## 接上你正在用的工具

- **添加自己的计划**。在聊天中告诉 AI 个人助手“把我的飞书计划接到今日计划”，再按提示提供链接。Notion、Obsidian 或计划文件也可以这样接入。
- **连接自己的日报**。在「AI每日精选」点「连接我的日报」，将提示词交给已有的日报助手。也可以手动连接兼容的归档文件夹。
- **和 Data 聊天**。在 Harness 配好自己的模型后，点击「聊聊」，试试“把明天准备演示加入计划”。回到工作台就能核对保存结果。
- **查看已有项目和自动化**。关联自己的项目后可回到原对话，连接 GitHub 后可查看提交、PR 和版本。已有的 Notion 计划、Hermes 日报任务，以及兼容内容工作台的任务与成果也可按需接入。[连接指南](./START-HERE.md#按需连接自己的工具)
- **了解数据如何使用**。待办保存在当前 Harness 配置中。模型和第三方服务沿用你自己的账号、权限和额度。[隐私与权限](./PRIVACY.md)

## 分享与反馈

可免费安装、使用并原样分享官方安装包，分享时请保留署名、许可、隐私说明和官方来源。修改后再发布须另获授权。[使用许可](./LICENSE) · [第三方声明](./THIRD_PARTY_NOTICES.md)

如需升级，建议等当前聊天完成后再操作。反馈时请注明 Harness 版本、插件版本和操作系统，并遮挡截图中的私人信息。[版本记录](./CHANGELOG.md) · [反馈问题](https://github.com/xuanqing-95/dsh-personal-workbench/issues)

Designed by 玄清 · © 2026
