const fields = {
  name: document.querySelector("#eventName"),
  url: document.querySelector("#eventUrl"),
  time: document.querySelector("#eventTime"),
  city: document.querySelector("#eventCity"),
  venue: document.querySelector("#eventVenue"),
  organizer: document.querySelector("#eventOrganizer"),
  topic: document.querySelector("#eventTopic"),
  speakers: document.querySelector("#eventSpeakers"),
  description: document.querySelector("#eventDescription"),
  goal: document.querySelector("#userGoal"),
  focus: document.querySelector("#userFocus"),
  energy: document.querySelector("#energyLevel"),
};

const briefOutput = document.querySelector("#briefOutput");
const reviewOutput = document.querySelector("#reviewOutput");

function val(input) {
  return input.value.trim() || "待补充";
}

function lines(text) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeFilePart(text) {
  return (text || "event").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-\u4e00-\u9fa5]/g, "").slice(0, 60) || "event";
}

function minimumAction(energy) {
  if (energy === "低") return "只完成三个动作：听清主办方真实目的、找一个高质量信息源聊 5 分钟、活动后记录 3 条有效信息。";
  if (energy === "高") return "可以主动交换联系方式，但仍要避免低价值闲聊过载。";
  return "优先完成 2 到 3 次有效交流，并保留跟进线索。";
}

function speakerSection() {
  const speakerLines = lines(fields.speakers.value);
  if (speakerLines.length === 0) {
    return "暂无确定嘉宾，建议补充活动页面、海报、报名页或主办方公开信息。";
  }
  return speakerLines.map((speaker) => `- ${speaker}：优先判断其是否能提供真实场景、具体经验或可验证问题。`).join("\n");
}

function buildBrief() {
  const speakers = speakerSection();
  const goal = val(fields.goal);
  const goalAdvice = goal === "待补充"
    ? "建议先明确本次活动目标：找信息、找人、找机会、找项目、找工作、找合作，至少选择一个。"
    : goal;

  return `# 会前简报：${val(fields.name)}

## 一句话判断
这是一个需要被当作“信息场”和“关系场”来观察的活动。当前简报只基于你在浏览器中输入的信息生成，没有联网搜索。

## 这个活动本质上是什么局
- 活动主题：${val(fields.topic)}
- 主办方：${val(fields.organizer)}
- 初步判断：可能是围绕主题聚集一线经验、项目机会、资源连接或行业观察的场域。该判断为推测，依据是活动主题、主办方和简介。

## 确定信息
| 项目 | 内容 | 来源 |
|---|---|---|
| 活动名称 | ${val(fields.name)} | 用户输入 |
| 活动链接 | ${val(fields.url)} | 用户输入 |
| 活动时间 | ${val(fields.time)} | 用户输入 |
| 城市 | ${val(fields.city)} | 用户输入 |
| 场地 | ${val(fields.venue)} | 用户输入 |
| 活动简介 | ${val(fields.description)} | 用户输入 |

## 推测判断
| 判断 | 依据 | 置信度 | 需要验证 |
|---|---|---|---|
| 可能适合寻找高质量信息源，而不是泛泛社交 | 活动主题与用户目标 | 中 | 现场参会者构成 |
| 主办方可能希望聚集项目方、运营者或资源方 | 主办方和活动简介 | 中 | 主办方开场介绍 |
| 可能存在可跟进的一线问题 | 嘉宾与主题设置 | 中 | 自由交流中的具体案例 |

## 可能到场人群画像
| 人群 | 为什么会来 | 价值 | 交流优先级 |
|---|---|---|---|
| 推测：主题相关从业者 | 依据：活动主题 | 可提供一线问题 | 中 |
| 推测：项目方或创业者 | 依据：活动定位 | 可验证需求与合作可能 | 中 |
| 推测：投资或资源观察者 | 依据：行业分享类活动常见结构 | 可提供判断框架，但需避免空泛融资叙事 | 低到中 |

## 重点关注人物/角色
${speakers}

## 可聊话题
- ${val(fields.focus)}
- 对方最近遇到的真实重复问题。
- 哪些需求有数据、访谈或付费证据。

## 可问问题
- 你最近最确定的一个真实需求是什么？
- 这个需求来自数据、访谈、客户付费，还是现场观察？
- 哪些热闹话题其实不值得投入？
- 如果我会后只验证一个问题，你建议从哪里开始？

## 要观察的现场信号
- 主办方反复强调哪些人群和关键词。
- 嘉宾是否给出具体案例、数据、反例。
- 自由交流中哪些问题被反复问到。
- 哪些人只是礼貌寒暄，哪些人能给出可验证信息。

## 要避免的话题
- 未经确认的私人信息。
- 没有数据依据的风口判断。
- 把普通寒暄过度解读为高价值关系。

## 最小有效行动
${minimumAction(fields.energy.value)}

## 活动后跟进预案
- 当天记录 3 条有效信息、2 个待确认问题、1 个值得跟进对象。
- 跟进只生成草稿，不自动发送任何消息。
- 所有推测继续标注依据和置信度。

## 待补充信息
- ${goalAdvice === goal ? "真实报名人构成" : goalAdvice}
- 嘉宾或参会者公开资料来源。
- 主办方过往活动和现场实际人群。`;
}

function buildReview() {
  const eventName = document.querySelector("#reviewEventName").value.trim() || val(fields.name);
  const transcript = document.querySelector("#transcriptText").value.trim() || "待补充";
  const paragraphs = transcript === "待补充" ? [] : transcript.split(/\n\s*\n/).filter(Boolean);
  const summaryRows = paragraphs.length
    ? paragraphs.slice(0, 6).map((text, index) => `| 片段 ${index + 1} | 待人工确认 | ${text.replace(/\n/g, " ").slice(0, 80)}${text.length > 80 ? "……" : ""} | 第 ${index + 1} 段 |`).join("\n")
    : "| 待补充 | 待补充 | 请粘贴转写文本 | 待补充 |";

  return `# 基于转写的活动复盘：${eventName || "待补充"}

## 总体判断
这是一份本地生成的复盘草稿，只整理用户主动提供的文本，不做音频识别，不联网，不推断敏感个人信息。

## 识别到的人物/称呼
| 人物/称呼 | 机构/身份 | 证据片段 | 确定性 |
|---|---|---|---|
| 待人工确认 | 待补充 | 请根据原文核对姓名、机构和角色 | 待确认 |

## 重要对话摘要
| 主题 | 相关人物 | 摘要 | 原文位置 |
|---|---|---|---|
${summaryRows}

## 有价值的信息
| 信息 | 来源片段 | 可信度 | 为什么重要 |
|---|---|---|---|
| 待人工筛选 | 原始转写 | 待确认 | 只保留与活动目标相关、可验证、可行动的信息 |

## 值得跟进的人
| 人物 | 原因 | 优先级 | 建议动作 |
|---|---|---|---|
| 待人工选择 | 需要明确问题、价值或对方许可 | 待定 | 只生成草稿，不自动联系 |

## 跟进话术草稿
你好，今天在「${eventName || "这场活动"}」听到你提到的具体问题很有启发。我想后续请教一个小问题：……如果方便，我可以发一版问题清单给你看。谢谢。

## 待确认事项
- 人物姓名、机构、角色是否准确。
- 哪些内容只是普通寒暄。
- 哪些信息来自明确表达，哪些只是用户主观印象。

## 不应过度解读的内容
- 普通寒暄、交换名片、礼貌回应不等于高价值关系。
- 未确认的资源、身份和合作意愿不能当作事实。
- 不从转写中推断私人敏感信息。

## 原始转写
${transcript}`;
}

function copyMarkdown(type) {
  const text = type === "review" ? reviewOutput.textContent : briefOutput.textContent;
  navigator.clipboard.writeText(text).then(() => alert("已复制 Markdown"));
}

function downloadMarkdown(type) {
  const text = type === "review" ? reviewOutput.textContent : briefOutput.textContent;
  const title = type === "review" ? "post-event-review" : "pre-event-brief";
  const eventName = type === "review" ? document.querySelector("#reviewEventName").value : fields.name.value;
  const filename = `${today()}-${safeFilePart(eventName)}-${title}.md`;
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#loadSample").addEventListener("click", () => {
  Object.entries(window.sampleEvent).forEach(([key, value]) => {
    if (fields[key]) fields[key].value = value;
  });
  document.querySelector("#reviewEventName").value = window.sampleEvent.name;
  document.querySelector("#transcriptText").value = window.sampleEvent.transcript;
});

document.querySelector("#generateBrief").addEventListener("click", () => {
  briefOutput.textContent = buildBrief();
});

document.querySelector("#generateReview").addEventListener("click", () => {
  reviewOutput.textContent = buildReview();
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyMarkdown(button.dataset.copy));
});

document.querySelectorAll("[data-download]").forEach((button) => {
  button.addEventListener("click", () => downloadMarkdown(button.dataset.download));
});
