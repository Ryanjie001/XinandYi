export type Person = "新" | "怡";
export type Memory = {
  id: string;
  title: string;
  body: string;
  date: string;
  author: Person;
  images: string[];
  demo?: boolean;
  wishId?: string;
  version?: number;
  draftKey?: string;
  comments?: { id: string; author: Person; body: string; createdAt: string }[];
  likes?: Person[];
  unreadComments?: number;
};
export type Album = { id: string; name: string; images: string[] };
export type MoodEntry = {
  id: string;
  date: string;
  author: Person;
  mood: string;
  note: string;
  version: number;
};
export const MOODS = [
  "开心",
  "平静",
  "期待",
  "感动",
  "想你",
  "疲惫",
  "难过",
  "焦虑",
  "生气",
  "低落",
] as const;
export type Wish = {
  id: string;
  title: string;
  note: string;
  category: string;
  author: Person;
  completedAt: string | null;
  memoryId?: string;
  demo?: boolean;
  version?: number;
};
export type Anniversary = {
  id: string;
  name: string;
  date: string;
  yearly: boolean;
  version: number;
};
export type LetterSummary = {
  id: string;
  author: Person;
  recipient: Person;
  title: string | null;
  unlockDate: string;
  createdAt: string;
  locked: boolean;
};
export type Settings = {
  startDate: string;
  xinBirthday: string;
  yiBirthday: string;
  xinLunarBirthday: string;
  yiLunarBirthday: string;
  xinLunarLeap: boolean;
  yiLunarLeap: boolean;
  xinBirthdayCalendar: "solar" | "lunar";
  yiBirthdayCalendar: "solar" | "lunar";
  coverImage: string;
  version?: number;
};
export type AppData = {
  version: 1;
  person: Person;
  settings: Settings;
  memories: Memory[];
  wishes: Wish[];
  albums: Album[];
  moods: MoodEntry[];
  anniversaries: Anniversary[];
  letters: LetterSummary[];
  storageReady: boolean;
};
export const PEOPLE = {
  新: { id: "xin", email: "xin@xinandyi.local" },
  怡: { id: "yi", email: "yi@xinandyi.local" },
} as const;
