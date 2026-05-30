#!/usr/bin/env python3
"""Generate a local-only post-event review scaffold from transcript markdown."""
from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "examples" / "sample_transcript.md"
OUTPUT_DIR = ROOT / "outputs" / "reviews"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_event_name(text: str) -> str:
    match = re.search(r"活动名称[:：]\s*(.+)", text)
    if match:
        return match.group(1).strip()
    heading = re.search(r"^#\s+(.+?)(?:转写示例|复盘|记录)?\s*$", text, flags=re.MULTILINE)
    return heading.group(1).strip() if heading else "待补充活动名称"


def extract_event_date(text: str) -> str:
    match = re.search(r"日期[:：]\s*(\d{4}-\d{2}-\d{2})", text)
    return match.group(1) if match else date.today().isoformat()


def slugify(text: str) -> str:
    text = re.sub(r"\s+", "-", text.strip().lower()) or "event"
    text = re.sub(r"[^\w\-\u4e00-\u9fff]", "", text)
    return text[:80] or "event"


def split_segments(text: str) -> list[str]:
    parts = re.split(r"\n(?=##\s+片段)", text)
    return [part.strip() for part in parts if part.strip().startswith("## 片段")]


def segment_summary_rows(segments: list[str]) -> str:
    if not segments:
        return "| 待补充 | 待补充 | 未识别到清晰片段，请按段落补充转写 | 待补充 |"
    rows = []
    for index, segment in enumerate(segments, start=1):
        compact = " ".join(line.strip("# ") for line in segment.splitlines() if line.strip())
        excerpt = compact[:90] + ("……" if len(compact) > 90 else "")
        rows.append(f"| 片段 {index} | 待人工确认 | {excerpt} | 片段 {index} |")
    return "\n".join(rows)


def build_review(text: str) -> tuple[str, str, str]:
    event_name = extract_event_name(text)
    event_date = extract_event_date(text)
    segments = split_segments(text)
    rows = segment_summary_rows(segments)
    review = f"""# 基于转写的活动复盘：{event_name}

## 1. 总体判断

这是一份本地生成的结构化复盘草稿。第一版不做复杂 NLP，不推断私人敏感信息，只把用户主动提供的转写内容整理成可人工复核的框架。

## 2. 从转写中识别到的人物

| 人物/称呼 | 机构/身份 | 证据片段 | 确定性 |
|---|---|---|---|
| 待人工确认 | 待补充 | 请从下方原始转写中核对人物、机构和角色 | 待确认 |

## 3. 重要对话摘要

| 主题 | 相关人物 | 摘要 | 原文位置 |
|---|---|---|---|
{rows}

## 4. 有价值的信息

| 信息 | 来源片段 | 可信度 | 为什么重要 |
|---|---|---|---|
| 待人工筛选 | 原始转写 | 待确认 | 只保留与活动目标相关、可验证、可行动的信息 |

## 5. 对方可能的需求或兴趣

| 人物 | 可能需求/兴趣 | 依据 | 置信度 |
|---|---|---|---|
| 待人工确认 | 不从寒暄中强行推断 | 需要明确对话证据 | 低 |

## 6. 我说得好的地方

- TODO：根据用户补充的自我记录或后续 LLM 分析填写。

## 7. 我可以改进的地方

- TODO：标注可以更清晰提问、确认后续动作或减少低价值闲聊的地方。

## 8. 值得跟进的人

| 人物 | 原因 | 优先级 | 建议动作 |
|---|---|---|---|
| 待人工选择 | 需要有明确价值、具体话题或对方许可 | 待定 | 不自动发送消息，只生成草稿 |

## 9. 跟进话术草稿

> 你好，今天在「{event_name}」听到你提到的一个具体问题对我很有启发。我想后续请教一个很小的问题：……如果方便，我可以发一版问题清单给你看。谢谢。

## 10. 待确认事项

- 人物姓名、机构和角色是否准确。
- 哪些片段只是寒暄，不应进入关系沉淀。
- 哪些信息有来源，哪些只是用户主观印象。
- TODO：后续可接入 LLM 分析或本地转写，但默认不联网、不上传。

## 11. 不应过度解读的内容

- 普通寒暄、交换名片、礼貌回应不等于高价值关系。
- 未经确认的身份、资源和合作意愿不能当作事实。
- 不从转写中推断敏感个人信息。

## 附录：原始转写

```markdown
{text.strip()}
```
"""
    return event_name, event_date, review


def main() -> None:
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not input_path.is_absolute():
        input_path = ROOT / input_path
    text = read_text(input_path)
    event_name, event_date, review = build_review(text)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{event_date}-{slugify(event_name)}-post-review.md"
    output_path.write_text(review, encoding="utf-8")
    print(f"已生成会后复盘：{output_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
