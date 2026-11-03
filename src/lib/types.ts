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
};
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
  storageReady: boolean;
};
export const PEOPLE = {
  新: { id: "xin", email: "xin@xinandyi.local" },
  怡: { id: "yi", email: "yi@xinandyi.local" },
} as const;
