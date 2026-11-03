"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetail, MemoryForm, SettingsDialog } from "@/components/forms";
import { useStore, type Memory } from "@/lib/store";
import { nextOccurrence, readableDate, togetherDays } from "@/lib/dates";

export default function HomePage() {
  const { data, ready } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<Memory | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const days = togetherDays(data.settings.startDate);
  const memories = [...data.memories].sort((a, b) => b.date.localeCompare(a.date));
  const completed = data.wishes.filter((w) => w.completedAt).length;
  const upcoming = [
    { name: "我们的纪念日", date: data.settings.startDate },
    { name: "新的生日", date: data.settings.xinBirthday },
    { name: "怡的生日", date: data.settings.yiBirthday },
  ]
    .filter((item) => item.date)
    .map((item) => ({ ...item, remaining: nextOccurrence(item.date) ?? 0 }))
    .sort((a, b) => a.remaining - b.remaining);
  const detail = data.memories.find((m) => m.id === detailId);
  return (
    <AppShell>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">属于我们的记录</p>
          <h1>
            {days ? (
              <>
                在一起的
                <br />第 <strong className="day-number">{days.toLocaleString("zh-CN")}</strong> 天
              </>
            ) : (
              <>
                我们的日常，
                <br />
                值得记住。
              </>
            )}
          </h1>
          <p className="hero-description">
            {days
              ? "从 " + readableDate(data.settings.startDate, true) + " 开始。"
              : "照片、片刻，和下一次期待。"}
          </p>
          <div className="hero-buttons">
            <button
              className="button button-primary"
              onClick={() => setEditor("new")}
              disabled={!ready}
            >
              <Plus size={16} />
              写一篇手记
            </button>
            <Link href="/wishes" className="text-button">
              愿望清单
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <button
            className="first-day-note"
            onClick={() => setSettingsOpen(true)}
            disabled={!ready}
          >
            {days ? "修改恋爱开始日期" : "设置恋爱开始日期"}
            <ArrowRight size={14} />
          </button>
        </div>
        <figure className="hero-cover">
          {data.settings.coverImage ? (
            <img src={data.settings.coverImage} alt="我们的首页合照" />
          ) : (
            <div className="cover-placeholder">
              <span>{ready ? "添加我们的合照" : "正在读取照片…"}</span>
            </div>
          )}
          <figcaption>
            <span>我们的相册</span>
            <button className="text-button" disabled={!ready} onClick={() => setSettingsOpen(true)}>
              更换照片
              <ArrowUpRight size={14} />
            </button>
          </figcaption>
        </figure>
      </section>
      <section className="story-strip" aria-label="我们的记录摘要">
        <div className="strip-stat">
          <span>恋爱手记</span>
          <strong>
            {ready ? data.memories.length.toString().padStart(2, "0") : "—"}
            <small> 篇</small>
          </strong>
        </div>
        <div className="strip-stat">
          <span>一起实现的愿望</span>
          <strong>
            {ready ? completed.toString().padStart(2, "0") : "—"}
            <small> / {data.wishes.length.toString().padStart(2, "0")}</small>
          </strong>
        </div>
        <button
          className="strip-next"
          onClick={() => setSettingsOpen(true)}
          disabled={!ready}
          aria-label="设置纪念日"
        >
          <span>{upcoming[0]?.name || "下一个纪念日"}</span>
          <strong>
            {upcoming[0]
              ? upcoming[0].remaining === 0
                ? "就是今天"
                : upcoming[0].remaining + " 天后"
              : "待设置"}
            <ArrowUpRight size={16} />
          </strong>
        </button>
      </section>
      <section className="home-memories">
        <div className="section-heading">
          <h2>最近的手记</h2>
          <Link href="/journal" className="text-button">
            全部手记
            <ArrowRight size={16} />
          </Link>
        </div>
        {memories.length ? (
          <div className="memory-grid">
            {memories.slice(0, 3).map((m) => (
              <MemoryCard key={m.id} memory={m} onClick={() => setDetailId(m.id)} />
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <p>{ready ? "从第一篇手记开始。" : "正在读取手记…"}</p>
            <button className="text-button" disabled={!ready} onClick={() => setEditor("new")}>
              写一篇手记
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <section className="home-bottom">
        <div className="wish-preview">
          <div className="section-heading">
            <h2>想一起做的事</h2>
            <Link className="text-button" href="/wishes">
              全部愿望
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="preview-wishes">
            {data.wishes
              .filter((w) => !w.completedAt)
              .slice(0, 3)
              .map((w) => (
                <Link href="/wishes" key={w.id}>
                  <span className="empty-check" />
                  <span>{w.title}</span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            {ready && !data.wishes.some((w) => !w.completedAt) && (
              <p className="muted">愿望都已实现，写下新的期待吧。</p>
            )}
          </div>
        </div>
        <div className="anniversary-card">
          <div className="section-heading">
            <h2>特别的日子</h2>
            <button className="text-button" disabled={!ready} onClick={() => setSettingsOpen(true)}>
              管理
              <ArrowUpRight size={16} />
            </button>
          </div>
          {upcoming.length ? (
            <div className="anniversary-list">
              {upcoming.map((item) => (
                <div key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{readableDate(item.date)}</span>
                  </div>
                  <span className="anniversary-count">
                    {item.remaining === 0 ? "今天" : item.remaining + " 天后"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="anniversary-empty">
              <p>记下生日和纪念日。</p>
              <button
                className="text-button"
                disabled={!ready}
                onClick={() => setSettingsOpen(true)}
              >
                添加日期
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </section>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {editor && (
        <MemoryForm
          memory={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {detail && (
        <MemoryDetail
          memory={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditor(detail);
            setDetailId(null);
          }}
        />
      )}
    </AppShell>
  );
}
