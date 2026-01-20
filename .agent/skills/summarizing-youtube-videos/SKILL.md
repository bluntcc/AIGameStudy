---
name: summarizing-youtube-videos
description: 总结 YouTube 视频内容，提取关键信息、时间线和核心观点。当用户提供 YouTube 链接、视频 URL 或要求总结视频内容、提取视频要点时使用。支持结构化摘要、时间戳笔记等多种输出格式。
---

# YouTube 视频总结

## 快速开始

运行脚本获取转录，然后分析生成总结：

```bash
python scripts/get_transcript.py "VIDEO_URL" --format text
```

## 实用脚本

### get_transcript.py - 获取视频转录

```bash
# 安装依赖
pip install youtube-transcript-api

# 获取转录（JSON 格式，包含时间戳）
python scripts/get_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"

# 获取纯文本（推荐用于总结）
python scripts/get_transcript.py VIDEO_ID --format text

# 获取 SRT 字幕格式
python scripts/get_transcript.py VIDEO_ID --format srt > subtitles.srt

# 指定语言优先级
python scripts/get_transcript.py VIDEO_ID --lang en,zh
```

**输出格式**：
- `json`：包含时间戳，便于定位
- `text`：纯文本，适合分析
- `srt`：字幕格式

## 备选方案

如果脚本不可用：

```bash
yt-dlp --write-auto-sub --sub-lang zh,en --skip-download "VIDEO_URL"
```

## 工作流

```
YouTube 视频总结进度：
- [ ] 步骤 1：获取转录（运行 get_transcript.py）
- [ ] 步骤 2：分析内容生成总结
- [ ] 步骤 3：验证完整性
```

### 步骤 1：获取转录

使用脚本或备选方案获取视频转录文本。

### 步骤 2：生成总结

使用以下模板格式化输出：

```markdown
# [视频标题]

## 📌 核心要点
- 要点 1
- 要点 2
- 要点 3

## 📖 内容概述
[1-2 段简短描述视频的主要内容和目的]

## 🎯 详细总结

### [章节标题]
[内容总结]

## ⏰ 时间线
- `00:00` - 开场介绍
- `02:30` - [关键节点描述]

## 💡 关键洞察
1. [洞察 1]
2. [洞察 2]
```

### 步骤 3：验证完整性

确认总结包含主要论点、关键数据和时间线。

## 输出格式选项

根据用户需求调整：

| 格式 | 适用场景 |
|------|----------|
| **结构化摘要** | 快速了解内容 |
| **时间戳笔记** | 回看定位 |
| **思维导图大纲** | 知识梳理 |
| **要点列表** | 快速记忆 |

## 特殊情况处理

- **无字幕视频**：提示用户该视频没有可用字幕
- **超长视频（>1小时）**：先整体概览，再逐章节总结
- **非中英文视频**：尝试获取自动翻译字幕
