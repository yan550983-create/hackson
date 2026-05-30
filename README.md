# event-networking-assistant

中文名：**活动情报与低能耗社交助理**。

这是一个本地优先的 Codex Skill + Markdown 模板 + Python 脚本 + 静态网页 demo 项目。它帮助用户参加线下活动前后进行信息判断和关系沉淀：活动前判断这是什么局、谁值得聊、聊什么、现场观察什么；活动后从笔记或转写中整理有效信息、跟进对象和话术草稿。

它不是普通社交软件，也不是泛泛的人脉 CRM，而是：

- 活动情报系统
- 低能耗社交决策系统
- 会后复盘系统

## 适用场景

适合经常参加以下活动的用户：

- AI、出海、TikTok Shop、跨境电商活动
- 创业、投资、行业分享、黑客松
- 青年科创、产品社区、线下闭门交流

目标不是“多认识人”，而是提前判断：

- 这个活动本质上是什么局
- 主办方想聚集什么人
- 哪些角色值得优先关注
- 可以聊什么、问什么
- 精力有限时最小有效行动是什么
- 活动后该跟进谁、怎么跟进

## 不适用场景

v0 不适合：

- 需要自动爬虫或实时联网搜索的活动分析
- 需要自动同步联系人或自动发送消息的 CRM
- 需要真实音频上传、语音识别、声纹识别的场景
- 需要登录、云端数据库、多人协作后台的复杂应用
- 需要处理未经授权私人信息的场景

## 目录结构

```text
event-networking-assistant/
  README.md
  AGENTS.md
  requirements.txt
  .gitignore
  skills/event-networking-assistant/SKILL.md
  templates/
  examples/
  outputs/
  scripts/
  web/
  docs/
  .github/workflows/deploy-pages.yml
```

## 如何填写活动信息

复制或编辑：

```text
templates/event_profile.yaml
```

建议另存为自己的活动文件，例如：

```text
examples/my_event_profile.yaml
```

字段包括活动名称、链接、时间、城市、场地、主办方、协办方、赞助方、主题、简介、议程、嘉宾、报名页信息、海报文字、过往活动、用户目标、用户背景、关注方向、想认识的人、关心话题、回避话题、精力状态等。

如果信息不足，可以留空。脚本会在报告中标注“待补充”，不会编造。

## 生成会前简报

安装依赖：

```bash
pip install -r requirements.txt
python scripts/generate_brief.py
```

或指定活动信息文件：

```bash
python scripts/generate_brief.py examples/sample_event_profile.yaml
```

输出位置：

```text
outputs/briefs/
```

文件名格式：

```text
YYYY-MM-DD-event-name-pre-brief.md
```

## 使用录音/转写复盘

v0 不做真实录音上传，也不做真实音频转写。请只粘贴用户主动提供且有权处理的 Markdown 或 TXT 文本。

生成会后复盘：

```bash
python scripts/generate_review_from_transcript.py
```

或指定转写文件：

```bash
python scripts/generate_review_from_transcript.py examples/sample_transcript.md
```

输出位置：

```text
outputs/reviews/
```

文件名格式：

```text
YYYY-MM-DD-event-name-post-review.md
```

## 在线 Demo

部署后地址格式：

```text
https://<your-github-username>.github.io/event-networking-assistant/
```

如果使用 GitHub 账号 `yan550983-create`，可以替换成：

```text
https://yan550983-create.github.io/event-networking-assistant/
```

但项目不会强制写死任何 GitHub 用户名。

## 本地运行网页 Demo

```bash
cd web
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

网页 demo 支持：

- 加载虚构示例活动
- 生成会前简报 Markdown 预览
- 粘贴活动后转写并生成复盘草稿
- 复制 Markdown
- 下载 Markdown

所有功能在浏览器本地运行，不接 API，不依赖后端。

## GitHub Pages 部署步骤

1. 把项目 push 到 GitHub。
2. 打开仓库 Settings。
3. 进入 Pages。
4. Source 选择 GitHub Actions。
5. push 到 `main` 后等待部署。
6. 部署完成后访问 Pages URL。

仓库已包含 `.github/workflows/deploy-pages.yml`，只部署 `web/` 目录，不部署 `outputs/` 中的私人报告。

## 输出文件位置

- 会前简报：`outputs/briefs/`
- 会后复盘：`outputs/reviews/`
- 转写草稿：`outputs/transcripts/`
- 人物记忆：`outputs/people/`
- 跟进任务：`outputs/tasks/`

`.gitignore` 默认忽略 `outputs/` 中的 Markdown、TXT、JSON 私人输出，只保留 `.gitkeep`。

## 隐私边界

- 只使用公开信息和用户明确提供的材料。
- 不推断私人隐私。
- 不做人脸识别，不做声纹识别。
- 不偷拍、偷录、监听。
- 不做违反网站规则的爬虫。
- 不从录音或转写中推断敏感个人信息。
- 不把普通寒暄过度解读成人脉价值。
- 所有“可能到场人员”都标注为推测，并写出依据。
- 事实、推测、待确认信息必须分开。
- 不自动发送邮件、微信或任何跟进消息。
- 不默认上传任何用户数据。

## 后续路线图

### v1

- 支持粘贴活动链接后手动整理信息。
- 支持从用户提供的网页文本中提取活动信息。
- 支持更完整的人物卡片。
- 支持多活动管理。
- 支持把会前简报和会后复盘关联起来。

### v2

- 支持联网搜索公开资料。
- 支持嘉宾公开资料整理。
- 支持活动主办方历史活动分析。
- 支持导出跟进提醒。
- 支持本地 Whisper 或 API 转写。
- 支持基于用户上传海报 OCR 后整理活动信息。

### v3

- 做轻量 Web UI。
- 支持 SQLite 本地数据库。
- 支持联系人关系沉淀。
- 支持日历集成。
- 支持邮件/微信跟进草稿。
- 支持多活动复盘库。

### v4

- 做真正 App 或插件。
- 接入 Google Calendar、Gmail、Notion/飞书。
- 支持定期活动准备提醒。
- 支持多活动关系网络视图。
- 支持个人长期关系资产沉淀。
