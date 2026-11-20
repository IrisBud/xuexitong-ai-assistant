# 使用手册维护

网站通过当前仓库的 GitHub Pages `gh-pages` 分支根目录发布，源文件在 `site/`。不依赖外部前端库，也不需要网站服务器、数据库或账号。

## 修改与预览

- 首页：`site/index.html`。
- 样式与交互：`site/assets/site.css`、`site/assets/site.js`。
- 教程正文：`site/content/guides.mjs`。按读者任务组织；站内链接写 `./start.html`，图片写 `../assets/…`。
- 生成文章、搜索索引与封面：`npm run build:guide`。文章输出到 `site/guides/`，直接改生成的 HTML 会在下次构建时被覆盖。
- 本地预览：`npm run preview:guide`。服务仅监听本机地址，按 GitHub Pages 的仓库子路径提供页面。
- 浏览器验证：预览运行时执行 `npm run test:guide`。本机已有 Playwright 时可用 `XXT_PLAYWRIGHT_PATH` 指定依赖、`XXT_BROWSER_CHANNEL` 指定浏览器。

发布新脚本时重新核对教程事实，再构建网站。版本提示从 `package.json` 读取；正文中的历史版本与适配范围不能只靠批量替换版本号更新。

## 发布

先提交修改并正常推送 `main`，确认工作区与远端状态；网站文件须通过链接、交互和公开文件检查。然后：

```powershell
$pagesCommit = git subtree split --prefix=site
git push origin "${pagesCommit}:refs/heads/gh-pages"
```

推送必须正常快进。有分叉先读双方提交，不强推、不重写旧分支。首次需要在仓库 Pages 设置里选择 `gh-pages` 根目录；此仓库已配置后不用重复创建站点。

发布结束检查 Pages 的构建状态、公开首页、至少一篇教程、图片和搜索索引。GitHub Pages 更新与脚本 Release 是两件事；不能因为修改教程而重发脚本或重打版本标签。

素材使用项目现有截图及本网站的几何图形。参考视频和参考仓库只用于观察编排、写作结构，没有复制其图片、角色、商标或正文。
