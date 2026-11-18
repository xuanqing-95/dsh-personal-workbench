# 维护与发布

GitHub 是版本记录的主仓。本机只保留开发副本和一次受控回退，不积累多份安装包。当前作者个人版是另一个包，不应将它的目录、凭据、日报或头像整体复制到本公开包。

工作台对外使用「个人 AI 工作台」。准备新版时先核对当前安装版的侧栏、首页和卡片标题，再核对功能和默认布局。安装页、插件索引和 Release 标题从插件语言文件生成。示例截图使用测试账号的数据。新版深浅主题切换暂不随公开版发布。

1. 修改源码与 DESIGN.md；公共样式只改 workbench-design.css，执行 npm run sync:design 嵌入客户端，npm run check:design 核对。在全新 Harness profile 试装，验证布局、聊天入口、计划、日报和项目。不要用个人的生产数据测试写入。
2. 更新 package.json 版本、README、CHANGELOG、RELEASE-NOTES 和分享页。安装包只允许 files 白名单。
3. 执行 `npm ci --ignore-scripts`、`npm test`、`node --check client.js`，再 `npm run release:seal`、`npm run release:verify`。提交 client.js 与 ui-release.json 同一批；禁止只复制 client.js 到已安装工作台。
4. 推送通过检查的提交，为该提交打精确版本标签，例如 `v0.8.0-beta.2`。Release 工作流测试、打包、生成 SHA256SUMS、发布预览版本，再更新 GitHub Pages 的安装页与索引。索引锁定完整 40 位提交，不跟随可变分支。
5. 匿名下载 Release 包并核对 SHA256；匿名请求 Pages 索引必须为 2xx 且无重定向；使用实际 Harness 的索引解析与安装路径再验证一次。CI 成功不等于新用户安装成功。

首次需要把仓库设为公开，并在 GitHub Pages 选择 GitHub Actions 来源。后续更新不需要用户重新填写索引地址；宿主是否自动安装由 Harness 控制，不能承诺无确认更新整个插件。

回退发布新的修复版本或让用户选择先前版本，保留旧 Release 和数据结构兼容；不要覆盖同名包或重写已有标签。隐私相关问题先撤下安装入口，再评估已公开文件，不能依赖删历史收回外部副本。

首次启用 GitHub Pages 时，在 `github-pages` 环境的部署规则中允许版本标签 `v*`；保留 `main` 原规则。
若打包成功而 Pages 因标签规则被拒绝，修正规则后只重跑失败的部署任务，不重发同名 Release。
仅更新介绍页时，在 main 上手动运行 Release 工作流。该入口只部署 Pages，索引继续指向当前已发布版本的标签提交。
