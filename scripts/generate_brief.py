#!/usr/bin/env python3
"""Generate a local-only pre-event brief from a YAML event profile."""
from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

import importlib.util

YAML_AVAILABLE = importlib.util.find_spec("yaml") is not None
if YAML_AVAILABLE:
    yaml = importlib.util.module_from_spec(importlib.util.find_spec("yaml"))
    importlib.util.find_spec("yaml").loader.exec_module(yaml)
else:
    yaml = None

LIST_KEYS = {"co_organizers", "sponsors", "agenda", "speakers", "guests", "past_events", "related_links", "people_i_already_know", "people_i_want_to_meet", "topics_i_care_about", "topics_to_avoid", "public_sources", "user_provided_materials", "missing_information"}

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "examples" / "sample_event_profile.yaml"
OUTPUT_DIR = ROOT / "outputs" / "briefs"


def parse_scalar(raw: str) -> Any:
    value = raw.strip()
    if value in {"[]", ""}:
        return [] if value == "[]" else ""
    if value in {"true", "false"}:
        return value == "true"
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    return value


def set_nested(root: dict[str, Any], path: list[tuple[int, Any]], indent: int, key: str, value: Any) -> None:
    while path and path[-1][0] >= indent:
        path.pop()
    parent = path[-1][1] if path else root
    parent[key] = value
    if isinstance(value, (dict, list)):
        path.append((indent, value))


def fallback_yaml_load(text: str) -> dict[str, Any]:
    """Small YAML subset parser for this repository's examples when PyYAML is unavailable."""
    root: dict[str, Any] = {}
    path: list[tuple[int, Any]] = []
    last_key_by_indent: dict[int, str] = {}
    for raw_line in text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        content = raw_line.split(" #", 1)[0].rstrip()
        indent = len(content) - len(content.lstrip(" "))
        stripped = content.strip()
        while path and path[-1][0] >= indent:
            path.pop()
        parent = path[-1][1] if path else root
        if stripped.startswith("- "):
            item_text = stripped[2:].strip()
            if not isinstance(parent, list):
                continue
            if ":" in item_text and not item_text.startswith('"'):
                key, value = item_text.split(":", 1)
                item = {key.strip(): parse_scalar(value)}
                parent.append(item)
                path.append((indent + 2, item))
            else:
                parent.append(parse_scalar(item_text))
            continue
        if ":" not in stripped:
            continue
        key, value_text = stripped.split(":", 1)
        key = key.strip()
        value_text = value_text.strip()
        if value_text == "":
            value: Any = [] if key in LIST_KEYS else {}
        elif value_text == "[]":
            value = []
        else:
            value = parse_scalar(value_text)
        if isinstance(parent, dict):
            parent[key] = value
            last_key_by_indent[indent] = key
            if isinstance(value, (dict, list)):
                path.append((indent, value))
        elif isinstance(parent, list):
            item = {key: value}
            parent.append(item)
            if isinstance(value, (dict, list)):
                path.append((indent, value))
    return root


def normalize_lists(data: Any) -> Any:
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if value == {} and key in LIST_KEYS:
                data[key] = []
            else:
                data[key] = normalize_lists(value)
    elif isinstance(data, list):
        return [normalize_lists(item) for item in data]
    return data


def load_yaml(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if yaml is not None:
        data = yaml.safe_load(text) or {}
    else:
        data = fallback_yaml_load(text)
    data = normalize_lists(data)
    return data if isinstance(data, dict) else {}


def value_or_pending(value: Any) -> str:
    if value is None or value == "" or value == [] or value == {}:
        return "待补充"
    if isinstance(value, list):
        return "、".join(format_item(item) for item in value) or "待补充"
    if isinstance(value, dict):
        return format_item(value)
    return str(value)


def format_item(item: Any) -> str:
    if isinstance(item, dict):
        parts = [str(item.get(key)) for key in ("name", "role", "organization", "topic") if item.get(key)]
        return " / ".join(parts) if parts else str(item)
    return str(item)


def slugify(text: str) -> str:
    text = text.strip().lower() or "event"
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^\w\-\u4e00-\u9fff]", "", text)
    return text[:80] or "event"


def energy_action(level: str) -> str:
    mapping = {
        "low": "只完成三个动作：听清主办方真实目的、找一个高质量信息源聊 5 分钟、活动后记录 3 条有效信息。",
        "medium": "优先完成 2 到 3 次有效交流，并保留跟进线索。",
        "high": "可以主动交换联系方式，但仍要避免低价值闲聊过载。",
    }
    return mapping.get(level, mapping["medium"])


def build_speaker_rows(speakers: list[Any]) -> str:
    if not speakers:
        return "| 暂无确定嘉宾 | 待补充 | 需要补充活动页面、海报或报名页公开信息 | 待补充 | 不要编造嘉宾信息 |"
    rows = []
    for speaker in speakers:
        if isinstance(speaker, dict):
            name = value_or_pending(speaker.get("name"))
            org_role = " / ".join(part for part in [speaker.get("organization"), speaker.get("role")] if part) or "待补充"
            topic = value_or_pending(speaker.get("topic"))
        else:
            name = str(speaker)
            org_role = "待补充"
            topic = "围绕活动主题补充问题"
        rows.append(f"| {name} | {org_role} | 可提供一线经验或判断框架 | {topic} | 不要把公开身份等同于真实可合作意愿 |")
    return "\n".join(rows)


def build_brief(data: dict[str, Any]) -> str:
    event = data.get("event", {}) or {}
    user = data.get("user_context", {}) or {}
    sources = data.get("source_notes", {}) or {}
    name = value_or_pending(event.get("name"))
    topic = value_or_pending(event.get("topic"))
    organizer = value_or_pending(event.get("organizer"))
    venue = value_or_pending(event.get("venue"))
    goal = value_or_pending(user.get("my_goal"))
    focus = value_or_pending(user.get("my_current_focus"))
    energy = user.get("energy_level") or "medium"
    speakers = event.get("speakers") or []
    guests = event.get("guests") or []
    missing = list(sources.get("missing_information") or [])

    if goal == "待补充":
        missing.append("用户参加目标")
    if not speakers:
        missing.append("确定嘉宾/演讲者")

    possible_groups = guests or ["活动主题相关从业者", "主办方社群成员", "对合作或项目机会感兴趣的人"]
    possible_rows = "\n".join(
        f"| 推测：{group} | 依据：活动主题、主办方定位或用户已知信息 | 可作为信息源筛选，不默认值得深聊 | 中 |"
        for group in possible_groups
    )

    source_text = value_or_pending((sources.get("public_sources") or []) + (sources.get("user_provided_materials") or []))
    missing_text = "\n".join(f"- {item}" for item in dict.fromkeys(missing)) or "- 暂无，仍建议核对事实来源。"
    speaker_rows = build_speaker_rows(speakers)

    return f"""# 会前简报：{name}

## 1. 一句话判断

这是一个围绕「{topic}」的信息场与关系场，优先目标不是多认识人，而是验证哪些人能提供真实场景、真实需求和可跟进线索。

## 2. 这个活动本质上是什么局

- 活动主题：{topic}
- 主办方：{organizer}
- 初步判断：主办方可能希望聚集对主题有需求、资源或案例的人，但该判断仅基于用户提供材料，未联网核验。

## 3. 确定信息

| 项目 | 内容 | 来源 |
|---|---|---|
| 活动名称 | {name} | 用户提供/来源待补充 |
| 活动链接 | {value_or_pending(event.get('url'))} | 用户提供/来源待补充 |
| 时间 | {value_or_pending(event.get('date'))} {value_or_pending(event.get('time'))} | 用户提供/来源待补充 |
| 城市与场地 | {value_or_pending(event.get('city'))} / {venue} | 用户提供/来源待补充 |
| 主办方 | {organizer} | 用户提供/来源待补充 |
| 活动简介 | {value_or_pending(event.get('description'))} | {source_text} |

## 4. 推测判断

| 判断 | 依据 | 置信度 | 需要验证 |
|---|---|---|---|
| 该活动可能更适合寻找高质量信息源，而不是大量交换联系方式 | 议程、主题与用户目标 | 中 | 现场参会者构成 |
| 主办方可能希望形成跨领域项目交流 | 主办方/协办方/赞助方信息 | 中 | 主办方真实招募对象 |
| 可能出现垂直从业者与早期项目方 | 活动主题和报名页关键词 | 中 | 报名名单或现场观察 |

## 5. 主办方与活动动机分析

关注主办方是否在聚集项目、案例、投资线索、社区影响力或潜在客户。不要把宣传语直接当事实，现场应验证主办方反复强调的人群和问题。

## 6. 场地与圈层信号

场地：{venue}。观察签到方式、座位安排、自由交流时间长度、主办方介绍重点和参会者自我介绍关键词。

## 7. 可能到场人群画像

| 人群 | 为什么会来 | 价值 | 交流优先级 |
|---|---|---|---|
{possible_rows}

## 8. 确定嘉宾与重点人物

| 人物 | 机构/身份 | 可能价值 | 可聊话题 | 风险点 |
|---|---|---|---|---|
{speaker_rows}

## 9. 高概率值得关注的角色

| 角色 | 判断依据 | 为什么值得聊 | 适合问的问题 |
|---|---|---|---|
| 一线运营者 | 推测：活动主题涉及实操 | 能提供真实问题和反例 | 你最近反复遇到的具体问题是什么？ |
| 产品负责人 | 推测：议程包含产品验证 | 能判断需求是否可产品化 | 哪类用户最愿意付费或持续使用？ |
| 主办方工作人员 | 确定/待确认：活动组织者在场 | 能说明活动真实人群构成 | 这次报名最多的是哪几类人？ |

## 10. 我的活动目标

{goal}

当前关注方向：{focus}

## 11. 现场交流策略

先听主办方和嘉宾如何定义问题，再选择 1-3 个高质量对象深聊。避免把普通寒暄当作关系资产。

## 12. 开场白备选

- 我现在关注「{focus}」，想听一个真实场景：你最近遇到的最大阻力是什么？
- 我不是想泛泛交换资源，更想验证一个具体问题：这个方向是否有真实重复需求？

## 13. 可问问题清单

- 你最近最确定的一个用户需求是什么？
- 这个需求是从数据、访谈还是客户付费里看到的？
- 哪类人看起来热闹但其实不是有效目标？
- 如果我会后只跟进一个问题，你建议我先验证什么？

## 14. 要观察的现场信号

- 主办方反复强调的关键词。
- 嘉宾回答中是否有具体案例、数据或反例。
- 参会者是否有明确问题，还是只在交换名片。
- 自由交流时哪些人被反复询问。

## 15. 要避免的话题和行为

{value_or_pending(user.get('topics_to_avoid'))}

不要追问私人隐私，不要偷拍偷录，不要把未确认身份当作事实传播。

## 16. 最小有效行动

{energy_action(energy)}

## 17. 活动后跟进预案

- 当天记录 3 条有效信息、2 个待确认问题、1 个值得跟进对象。
- 跟进时只发送具体问题或感谢，不自动发送任何消息。
- 对推测信息标注依据和置信度。

## 18. 待补充信息

{missing_text}
"""


def main() -> None:
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not input_path.is_absolute():
        input_path = ROOT / input_path
    data = load_yaml(input_path)
    event_name = value_or_pending((data.get("event") or {}).get("name"))
    event_date = (data.get("event") or {}).get("date") or date.today().isoformat()
    markdown = build_brief(data)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{event_date}-{slugify(event_name)}-pre-brief.md"
    output_path.write_text(markdown, encoding="utf-8")
    print(f"已生成会前简报：{output_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
