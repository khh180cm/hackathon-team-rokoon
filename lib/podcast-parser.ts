import type { Panelist, PodcastTurn, SessionEntry } from "./types";

export const PANELISTS: Panelist[] = [
  {
    id: "yoo-jaesuk",
    name: "유재석",
    emoji: "🎙️",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Yoo_Jae_Suk_going_to_work_at_Happy_Together_on_August_19%2C_2017_%281%29.jpg/400px-Yoo_Jae_Suk_going_to_work_at_Happy_Together_on_August_19%2C_2017_%281%29.jpg",
    color: "#F59E0B",
    role: "moderator",
    shortBio: "국민MC, 고민뭐하니 진행자",
  },
  {
    id: "chimchakman",
    name: "침착맨",
    emoji: "😎",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/%EB%B0%B0%EC%84%B1%EC%9E%AC%EC%9D%98_%ED%85%90_%EC%B6%9C%EC%97%B0_%EC%B9%A8%EC%B0%A9%EB%A7%A8.jpg/400px-%EB%B0%B0%EC%84%B1%EC%9E%AC%EC%9D%98_%ED%85%90_%EC%B6%9C%EC%97%B0_%EC%B9%A8%EC%B0%A9%EB%A7%A8.jpg",
    color: "#22C55E",
    role: "panelist",
    shortBio: "만화가·유튜버, 침착한 논리왕",
  },
  {
    id: "son-heungmin",
    name: "손흥민",
    emoji: "⚽",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/BFA_2023_-2_Heung-Min_Son_%28cropped%29.jpg/400px-BFA_2023_-2_Heung-Min_Son_%28cropped%29.jpg",
    color: "#3B82F6",
    role: "panelist",
    shortBio: "토트넘 주장, 아시아 최고의 축구선수",
  },
  {
    id: "elon-musk",
    name: "일론 머스크",
    emoji: "🚀",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Elon_Musk_-_54820081119_%28cropped%29.jpg/400px-Elon_Musk_-_54820081119_%28cropped%29.jpg",
    color: "#06B6D4",
    role: "panelist",
    shortBio: "Tesla·SpaceX CEO, 제1원리 사고",
  },
  {
    id: "lee-youngji",
    name: "이영지",
    emoji: "🎤",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Lee_Young-ji_in_April_2025.png/400px-Lee_Young-ji_in_April_2025.png",
    color: "#EC4899",
    role: "panelist",
    shortBio: "래퍼·예능인, MZ세대 아이콘",
  },
];

/** TTS voice config per panelist */
export const VOICE_CONFIG: Record<
  string,
  { rate: number; pitch: number; voiceId: string }
> = {
  "yoo-jaesuk": { rate: 1.1, pitch: 1.1, voiceId: "zwGt6D9wSkOlAC9EfLUN" },      // Christian (Italian mid-aged, sim=0.9999)
  "chimchakman": { rate: 0.95, pitch: 0.85, voiceId: "g14YnDYCsy3k7XLlcKlO" },    // Todd - Clear, Engaging (American young, sim=0.9998)
  "son-heungmin": { rate: 1.0, pitch: 1.0, voiceId: "y0s2ExEMuum3muUnA6Zd" },      // Marcus - Bright, Upbeat (American young, sim=0.9992)
  "elon-musk": { rate: 1.1, pitch: 0.9, voiceId: "NIS6mYGxVFNZaeq5OSC1" },        // Friendly András (Budapest mid-aged, sim=0.9998)
  "lee-youngji": { rate: 1.2, pitch: 1.3, voiceId: "iwP1PxYYSTdHA1qXlwFe" },      // Sandra Squirrel - Quirky (young, sim=0.9989)
};

/** Random reaction emojis per panelist */
export const REACTIONS: Record<string, string[]> = {
  "yoo-jaesuk": ["😄", "👏", "🎉"],
  "chimchakman": ["🧐", "😂", "🎮"],
  "son-heungmin": ["💪", "⚡", "👍"],
  "elon-musk": ["🚀", "🤯", "💥"],
  "lee-youngji": ["🔊", "💯", "🤣"],
};

// Build regex to match speaker lines
const speakerPattern = new RegExp(
  `(${PANELISTS.map(
    (p) =>
      p.emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\s*" +
      p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|")})\\s*[:：]\\s*`,
  "g"
);

export function parsePodcastText(text: string): PodcastTurn[] {
  const turns: PodcastTurn[] = [];
  const matches = [...text.matchAll(speakerPattern)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const speakerLabel = match[1];
    const textStart = match.index! + match[0].length;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const turnText = text.slice(textStart, textEnd).trim();

    const panelist = PANELISTS.find((p) => speakerLabel.includes(p.name));
    if (panelist && turnText) {
      turns.push({ speakerId: panelist.id, text: turnText });
    }
  }

  return turns;
}

export function extractPodcastTurns(messages: SessionEntry[]): PodcastTurn[] {
  const allText: string[] = [];

  for (const msg of messages) {
    if (msg.type === "assistant") {
      const content = msg.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text" && "text" in block) {
            allText.push(block.text);
          }
        }
      }
    }
  }

  if (allText.length === 0) return [];
  return parsePodcastText(allText.join("\n"));
}

export function getPanelist(speakerId: string): Panelist | undefined {
  return PANELISTS.find((p) => p.id === speakerId);
}
