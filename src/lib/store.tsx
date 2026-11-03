"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppData, Memory, Person, Settings, Wish } from "./types";
export type { Memory, Person, Settings, Wish } from "./types";
const empty: AppData = {
  version: 1,
  person: "新",
  settings: {
    startDate: "",
    xinBirthday: "",
    yiBirthday: "",
    coverImage: "",
    xinLunarBirthday: "",
    yiLunarBirthday: "",
    xinLunarLeap: false,
    yiLunarLeap: false,
    xinBirthdayCalendar: "solar",
    yiBirthdayCalendar: "solar",
  },
  memories: [],
  wishes: [],
  storageReady: false,
};
const STORAGE_KEY = "xin-and-yi:preview:v1";
const IMPORTED_KEY = "xin-and-yi:imported-preview-hash";
async function fingerprint(raw: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
type Store = {
  data: AppData;
  ready: boolean;
  saving: boolean;
  error: string;
  toast: string;
  legacy: boolean;
  notify: (text: string) => void;
  refresh: () => Promise<boolean>;
  signOut: () => Promise<void>;
  saveSettings: (v: Settings) => Promise<boolean>;
  saveMemory: (v: Memory) => Promise<boolean>;
  deleteMemory: (id: string) => Promise<boolean>;
  saveWish: (v: Wish) => Promise<boolean>;
  deleteWish: (id: string) => Promise<boolean>;
  toggleWish: (id: string) => Promise<boolean>;
  recordWish: (id: string, note: string, images: string[]) => Promise<boolean>;
  importLegacy: () => Promise<boolean>;
  exportLegacy: () => void;
  dismissLegacy: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState(empty),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [legacy, setLegacy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    busy = useRef(false),
    sequence = useRef(0),
    importing = useRef(false),
    legacyDismissed = useRef(false);
  const notify = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return false;
    const token = ++sequence.current;
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (r.status === 401) {
        setReady(false);
        setData(empty);
        if (pathname !== "/login") window.location.replace("/login");
        return false;
      }
      const value = await r.json();
      if (!r.ok) throw new Error(value.error || "暂时无法读取记录，请重试。");
      if (sequence.current !== token) return true;
      setData(value);
      setReady(true);
      setError("");
      return true;
    } catch (e) {
      if (sequence.current === token)
        setError(e instanceof Error ? e.message : "读取失败，请重试。");
      return false;
    }
  }, [pathname]);
  useEffect(() => {
    if (pathname === "/login") {
      sequence.current++;
      setData(empty);
      setReady(false);
      return;
    }
    void refresh();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && !legacyDismissed.current) {
        const old = JSON.parse(raw);
        const hasOld = !!(
          old.settings &&
          (Object.values(old.settings).some(Boolean) ||
            old.memories?.some((m: Memory) => !m.demo) ||
            old.wishes?.some((w: Wish) => !w.demo))
        );
        if (hasOld)
          void fingerprint(raw)
            .then((hash) => {
              if (!legacyDismissed.current) setLegacy(localStorage.getItem(IMPORTED_KEY) !== hash);
            })
            .catch(() => setLegacy(true));
      }
    } catch {}
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const interval = setInterval(focus, 30000);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      clearInterval(interval);
    };
  }, [pathname, refresh]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function mutate(path: string, method: string, payload: unknown) {
    if (busy.current || (importing.current && path !== "/api/import")) return false;
    busy.current = true;
    setSaving(true);
    sequence.current++;
    let conflict = false;
    try {
      const r = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const value = await r.json();
      if (r.status === 401) {
        window.location.replace("/login");
        return false;
      }
      if (!r.ok) {
        conflict = r.status === 409;
        throw new Error(value.error || "保存失败，请重试。");
      }
      setData(value);
      setReady(true);
      setError("");
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "连接中断，请检查列表后重试。");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
      if (conflict) void refresh();
    }
  }
  const version = (items: (Memory | Wish)[], id: string) => items.find((x) => x.id === id)?.version;
  const store: Store = {
    data,
    ready,
    saving,
    error,
    toast,
    legacy,
    notify,
    refresh,
    signOut: async () => {
      const { authClient } = await import("./auth-client");
      const r = await authClient.signOut();
      if (r.error) {
        notify("退出失败，请重试。");
        return;
      }
      sequence.current++;
      setData(empty);
      setReady(false);
      window.location.replace("/login");
    },
    saveSettings: (v) => mutate("/api/data/settings", "PATCH", v),
    saveMemory: (v) => {
      const old = v.version !== undefined;
      return mutate("/api/data/memories" + (old ? "/" + v.id : ""), old ? "PATCH" : "POST", {
        title: v.title,
        body: v.body,
        date: v.date,
        images: v.images,
        ...(old ? { version: v.version } : {}),
      });
    },
    deleteMemory: (id) =>
      mutate("/api/data/memories/" + id, "DELETE", { version: version(data.memories, id) }),
    saveWish: (v) => {
      const old = v.version !== undefined;
      return mutate("/api/data/wishes" + (old ? "/" + v.id : ""), old ? "PATCH" : "POST", {
        title: v.title,
        note: v.note,
        category: v.category,
        ...(old ? { version: v.version } : {}),
      });
    },
    deleteWish: (id) =>
      mutate("/api/data/wishes/" + id, "DELETE", { version: version(data.wishes, id) }),
    toggleWish: (id) =>
      mutate("/api/data/wishes/" + id, "PATCH", {
        action: "toggle",
        version: version(data.wishes, id),
      }),
    recordWish: (id, note, images) =>
      mutate("/api/data/wishes/" + id + "/record", "POST", { note, images }),
    dismissLegacy: () => {
      legacyDismissed.current = true;
      setLegacy(false);
    },
    exportLegacy: () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "新与怡-浏览器旧记录.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    importLegacy: async () => {
      if (busy.current || importing.current) return false;
      importing.current = true;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const old = JSON.parse(raw);
        const sourceHash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))),
        )
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        const uploaded = new Map<string, string>();
        async function convert(image: string): Promise<string> {
          if (!image.startsWith("data:")) return image;
          if (uploaded.has(image)) return uploaded.get(image)!;
          const blob = await (await fetch(image)).blob(),
            form = new FormData();
          form.set("photo", blob, "import.jpg");
          const r = await fetch("/api/photos", { method: "POST", body: form });
          const value = await r.json();
          if (!r.ok) throw new Error(value.error || "旧照片导入失败。");
          uploaded.set(image, value.image);
          return value.image;
        }
        setSaving(true);
        const memories = [];
        for (const m of (old.memories || []).filter((m: Memory) => !m.demo))
          memories.push({ ...m, images: await Promise.all(m.images.map(convert)) });
        const coverImage = old.settings.coverImage ? await convert(old.settings.coverImage) : "";
        const result = await mutate("/api/import", "POST", {
          sourceHash,
          settings: { ...old.settings, coverImage },
          memories,
          wishes: (old.wishes || []).filter((w: Wish) => !w.demo),
        });
        if (result) {
          legacyDismissed.current = true;
          try {
            localStorage.setItem(IMPORTED_KEY, sourceHash);
          } catch {}
          setLegacy(false);
          notify("旧记录已导入，本地原始记录仍保留。");
        }
        return result;
      } catch (e) {
        notify(e instanceof Error ? e.message : "导入失败，原始记录仍保留。");
        return false;
      } finally {
        importing.current = false;
        setSaving(false);
      }
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
