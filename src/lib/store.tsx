"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { today } from "@/lib/dates";

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
};
export type Settings = {
  startDate: string;
  xinBirthday: string;
  yiBirthday: string;
  coverImage: string;
};
type Data = { version: 1; person: Person; settings: Settings; memories: Memory[]; wishes: Wish[] };

const initialData: Data = {
  version: 1,
  person: "新",
  settings: { startDate: "", xinBirthday: "", yiBirthday: "", coverImage: "" },
  memories: [
    {
      id: "demo-sea",
      title: "把日落，装进口袋",
      body: "海风刚刚好，你也刚刚好。\n想把这样慢慢走路的傍晚，多收藏一些。",
      date: "2026-10-18",
      author: "怡",
      images: ["/images/sea.jpg"],
      demo: true,
    },
    {
      id: "demo-coffee",
      title: "周末的正确打开方式",
      body: "找到一家喜欢的小店，点两杯咖啡，聊一些没那么重要的事。普通的一天，因为有你变得特别。",
      date: "2026-10-11",
      author: "新",
      images: ["/images/cafe.jpg"],
      demo: true,
    },
    {
      id: "demo-walk",
      title: "走进秋天里",
      body: "今天没有安排目的地。沿着树影走，走到哪里，哪里就是我们的风景。",
      date: "2026-10-05",
      author: "怡",
      images: ["/images/forest.jpg"],
      demo: true,
    },
  ],
  wishes: [
    {
      id: "wish-sea",
      title: "一起去海边，看一次日落",
      note: "带上相机，也可以什么都不带。",
      category: "去远方",
      author: "怡",
      completedAt: null,
      demo: true,
    },
    {
      id: "wish-dinner",
      title: "做一顿只属于我们的晚餐",
      note: "你洗菜，我掌勺。",
      category: "小日常",
      author: "新",
      completedAt: null,
      demo: true,
    },
    {
      id: "wish-photo",
      title: "拍一组属于我们的合照",
      note: "不用很正式，自然地笑就好。",
      category: "小浪漫",
      author: "怡",
      completedAt: null,
      demo: true,
    },
    {
      id: "wish-walk",
      title: "在陌生城市，散步到天黑",
      note: "一起走过的路，都会记得。",
      category: "去远方",
      author: "新",
      completedAt: "2026-10-05",
      demo: true,
    },
  ],
};
type Store = {
  data: Data;
  ready: boolean;
  toast: string;
  notify: (text: string) => void;
  setPerson: (person: Person) => boolean;
  saveSettings: (settings: Settings) => boolean;
  saveMemory: (memory: Memory) => boolean;
  deleteMemory: (id: string) => boolean;
  saveWish: (wish: Wish) => boolean;
  deleteWish: (id: string) => boolean;
  toggleWish: (id: string) => boolean;
  recordWish: (id: string, note: string, images: string[]) => boolean;
};
const Context = createContext<Store | null>(null);
const STORAGE_KEY = "xin-and-yi:preview:v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(initialData);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3800);
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Data = JSON.parse(saved);
        if (
          parsed.version !== 1 ||
          !parsed.settings ||
          !Array.isArray(parsed.memories) ||
          !Array.isArray(parsed.wishes)
        )
          throw new Error("Invalid data");
        setData(parsed);
      }
    } catch {
      notify("本地数据无法读取，已载入示例内容。");
    }
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notify]);
  function commit(next: Data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      notify("浏览器存储空间不足或不可用，请减少照片后重试。此次内容尚未保存。");
      return false;
    }
  }
  const store: Store = {
    data,
    ready,
    toast,
    notify,
    setPerson: (person) => commit({ ...data, person }),
    saveSettings: (settings) => commit({ ...data, settings }),
    saveMemory: (memory) => {
      const old = data.memories.find((item) => item.id === memory.id);
      if (old && old.author !== data.person) {
        notify("切换到记录人的预览身份后，即可修改这篇手记。");
        return false;
      }
      return commit({
        ...data,
        memories: [memory, ...data.memories.filter((item) => item.id !== memory.id)],
      });
    },
    deleteMemory: (id) => {
      const memory = data.memories.find((item) => item.id === id);
      if (!memory || memory.author !== data.person) {
        notify("只能删除当前预览身份发布的手记。");
        return false;
      }
      return commit({
        ...data,
        memories: data.memories.filter((item) => item.id !== id),
        wishes: data.wishes.map((wish) =>
          wish.memoryId === id ? { ...wish, memoryId: undefined } : wish,
        ),
      });
    },
    saveWish: (wish) =>
      commit({ ...data, wishes: [wish, ...data.wishes.filter((item) => item.id !== wish.id)] }),
    deleteWish: (id) => commit({ ...data, wishes: data.wishes.filter((item) => item.id !== id) }),
    toggleWish: (id) =>
      commit({
        ...data,
        wishes: data.wishes.map((wish) =>
          wish.id === id ? { ...wish, completedAt: wish.completedAt ? null : today() } : wish,
        ),
      }),
    recordWish: (id, note, images) => {
      const wish = data.wishes.find((item) => item.id === id);
      if (!wish || wish.memoryId) {
        notify("这个愿望已经留下手记了。");
        return false;
      }
      const memoryId = crypto.randomUUID();
      const date = wish.completedAt || today();
      return commit({
        ...data,
        memories: [
          {
            id: memoryId,
            title: wish.title,
            body: note || wish.note,
            date,
            author: data.person,
            images,
            wishId: id,
          },
          ...data.memories,
        ],
        wishes: data.wishes.map((item) =>
          item.id === id ? { ...item, completedAt: date, memoryId } : item,
        ),
      });
    },
  };
  return (
    <Context.Provider value={store}>
      {children}
      <div role="status" aria-live="polite" className={"toast " + (toast ? "is-visible" : "")}>
        {toast}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("StoreProvider is missing");
  return context;
}
