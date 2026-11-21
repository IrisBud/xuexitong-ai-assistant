# 超星学习通 · 学习助手

> **当前文件是本地候选 1.8.1。** 下方在线安装入口提供正式版。 从原仓库安装过的用户，请点「一键安装 / 更新脚本」覆盖原脚本并保留设置。覆盖后，后续更新会使用新仓库。

![最新版本](https://img.shields.io/badge/正式版-1.8.0-267356?style=flat-square)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-油猴脚本-267356?style=flat-square)](https://www.tampermonkey.net/)
[![Stars](https://img.shields.io/github/stars/IrisBud/xuexitong-ai-assistant?style=flat-square&color=267356)](https://github.com/IrisBud/xuexitong-ai-assistant/stargazers)

![学习助手：打开一节课，开始学习](docs/readme/guide-cover.svg)

自动播放音视频、阅读资料；接入自己的 AI 后，可以辅助处理章节测验、讨论和作业。

学习板块的「考试」为测试版。逐题答题页点击「开始考试辅助」，可打开整卷预览；可导入参考资料、导出逐题理由，并设置填写、交卷方式和最早交卷时间。考试功能原为俗称「水课」的课程练习和获准使用 AI 的测验开发。请遵守校方及任课教师的考试规则。违反规则使用时，因被检测、成绩处理或纪律处分产生的后果由使用者自行承担，作者不对此负责。

学习通弹出滑块、图片验证码或人脸验证时，面板会变色并提示手动处理。完成验证后，请手动继续。

[![一键安装 / 更新脚本](docs/readme/install.svg)](https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/xuexitong-ai-assistant.user.js)

**[打开使用手册](https://irisbud.github.io/xuexitong-ai-assistant/)** · [最新正式版](https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest)

<a id="三步跑起来"></a>
<a id="安装学习助手"></a>
<a id="第一次使用从哪里打开学习助手"></a>

<!-- maintenance-entry -->
[脚本猫与分发说明](docs/SCRIPTCAT.md) · [课程列表与接续](docs/COURSE_QUEUE_ENTRY.md) · [视频任务点说明](docs/ISSUE_7_TASKPOINT.md) · [只读结构采集](docs/ISSUE_10_COLLECTION.md) · 队列主题随主面板变化 · [学校域名设置](docs/SCHOOL_DOMAINS.md)
<!-- /maintenance-entry -->

## 先跑起来

1. **装油猴。** 在 Chrome、Edge 等电脑浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)，到扩展详情开启“允许用户脚本”。[看权限设置图](docs/getting-started/tampermonkey-permissions.png)
2. **装脚本。** 点上面的“一键安装 / 更新脚本”，在油猴确认页点安装或更新。装好后刷新学习通页面。
3. **打开具体小节。** 进入课程 → 章节 → 点击“1.1”“1.2”这样的小节名称，右下角出现“学习助手”。课程首页和目录页没有学习面板。

只看视频、读资料，选“不接入 AI”，直接点“开始自动”。需要辅助答题，先到“接口”区保存自己的模型配置，点“测试 AI”，通过后再开始。

<details>
<summary>安装按钮打不开，或只显示一整页代码？</summary>

下载 [源码 ZIP](https://github.com/IrisBud/xuexitong-ai-assistant/archive/refs/heads/main.zip) 并解压，用记事本打开 `dist/xuexitong-ai-assistant.user.js`，复制全部代码，粘到油猴编辑器后保存。更新时覆盖原脚本，保留已有设置。源码 ZIP 不能作为油猴备份包导入。

[完整安装步骤](https://irisbud.github.io/xuexitong-ai-assistant/guides/start.html)

</details>

<a id="能干什么"></a>

## 能做哪些事

- **课程学习：** 视频、音频、PDF / Word、专题阅读；支持静音、倍速，处理后核对平台任务点。
- **题目与作业：** 已适配的单选、多选、判断、填空、简答；可预览答案，按设置填写、暂存或提交。作业仍在持续完善，答案需要复核。
- **课程讨论：** 从课程侧栏打开「讨论」，在学习助手里读取至多 50 条话题、勾选并回复。「新建话题」支持按数量发布课程问题或发布学习收获。
- **课程安排：** 章节搜索、跳过记录、集中补做和多门课程队列。只学本课，不需要先建队列。
- **模型与外观：** 文字、图片接口分开配置；支持主流服务商、自定义接口、本地 Codex 和 WorkBuddy / CodeBuddy，也可以换面板主题。

<a id="配置-ai"></a>
<a id="模型配置"></a>

| 现在想做什么 | 看这里 |
| --- | --- |
| 不会填地址、模型或 Key | [配置 AI](https://irisbud.github.io/xuexitong-ai-assistant/guides/ai.html) |
| 用电脑上的 Codex | [本地 Codex 连接](https://irisbud.github.io/xuexitong-ai-assistant/guides/codex.html) |
| 用 WorkBuddy 对应账号连接 | [WorkBuddy / CodeBuddy](https://irisbud.github.io/xuexitong-ai-assistant/guides/workbuddy.html) |
| 不知道在哪里勾选课程 | [课程与队列](https://irisbud.github.io/xuexitong-ai-assistant/guides/courses.html) |
| 找不到面板、不能切章、提示报错 | [问题排查](https://irisbud.github.io/xuexitong-ai-assistant/guides/troubleshooting.html) |

<a id="开始前记住这几件事"></a>
<a id="建议将课程页保持在前台"></a>

## 使用时留意

- **课程页保持在前台，电脑不要休眠。** 后台不能保证稳定运行。[窗口怎么摆](https://irisbud.github.io/xuexitong-ai-assistant/guides/appearance.html#window)
- **只启用一份控制同一课程的脚本。** 旧测试版和同类脚本先停用。
- **脚本免费，AI 调用费用自理。** 测试也可能计费，题目会发给你配置的接口；Key 和本地连接码不要发给别人。
- **任务点变绿不等于满分。** 预览不会填写或提交；答案请复核，正式考试和未适配题型需要自己处理。

[全部教程](https://irisbud.github.io/xuexitong-ai-assistant/) · [数据与使用范围](https://irisbud.github.io/xuexitong-ai-assistant/guides/privacy.html) · [验证记录](docs/VALIDATION.md)

## 最近更新

| 版本 | 变化 |
| --- | --- |
| 1.8.1 · 2026-11-21（本地候选） | 开始考试辅助时打开整卷预览，修复部分选项无法填写，标明 AI 自评和考试使用范围。 |
| 1.8.0 · 2026-11-20 | 新增考试测试版，支持资料导入及强相关加权、逐题理由与待复查标记、可选自动作答及交卷时间。包含课程讨论辅助和三类人工验证提醒。 |
| 1.7.15 · 2026-11-20（本地候选） | 滑块、图片验证码和人脸验证共用整板变色和人工处理提示。验证结束后需手动继续。 |
| 1.7.14 · 2026-11-20（本地候选） | 增加课程讨论列表、已回复标记、共享字数设置，以及发布课程问题和学习收获。 |
| 1.7.13 · 2026-10-31 | 新增精确学校来源配置、HTTP 的 UUID/摘要能力后备和跨域阅读器握手；保留窗口、来源、任务和停止检查。学校域名批准与油猴用户匹配分别设置。 |
| 1.7.12 · 2026-10-31 | 课程队列跟随主面板 14 套主题，采用选课、队列、设置分区；保留勾选、顺序、设置与 Issue #8 接续修复。 |
| 1.7.11 · 2026-10-31 | 新增独立只读采集器、使用说明及回复草稿，便于反馈未知题型；不宣称 Issue #10 已修复，主助手不自动运行采集器。 |
| 1.7.10 · 2026-10-31 | 读取任务图标外层的明确完成状态；播放结束或子播放器消息不再代替当前必需视频的平台任务点确认。 |
| 1.7.9 · 2026-10-31 | 修复独立课程列表勾选、空列表入口和队列状态提示；原生下一节失效时至多通过同课目录接续一次。已上线的精简 README、使用手册和专业标题保持。 |
| 1.7.8 · 2026-10-31 | 收录脚本猫兼容边界、脚本站介绍和 GitHub 下载反馈入口；沿用默认油猴安装，不宣称脚本猫已实装验收。 |
| 1.7.7 · 2026-10-29 | 新增 WorkBuddy / CodeBuddy 本地连接与教程入口 |
| 1.7.6 · 2026-10-29 | 修复部分作业多选题的选项结构识别 |
| 1.7.5 · 2026-10-28 | 等待慢加载播放器，切章时清理旧播放器状态 |

[完整更新记录](CHANGELOG.md) · [历史版本](docs/HISTORY.md) · [安装后怎么更新](https://irisbud.github.io/xuexitong-ai-assistant/guides/start.html#update)

## 反馈与贡献

[反馈问题或建议](https://github.com/IrisBud/xuexitong-ai-assistant/issues/new/choose)时，写清版本、卡在哪一步和面板提示；截图先遮掉账号、Key、连接码及完整课程地址。想提代码或补教程，欢迎看 [贡献说明](CONTRIBUTING.md)。

用着顺手，欢迎点个 [Star⭐](https://github.com/IrisBud/xuexitong-ai-assistant/stargazers)~ 也可以 [支持作者](docs/SUPPORT.md)。

字体解析、jQuery、html2canvas 的许可及角色素材来源见 [NOTICE.md](NOTICE.md)。角色原设计作者为 [ZipZipPipe](https://space.bilibili.com/4168597)，不代表模型服务商官方形象。
