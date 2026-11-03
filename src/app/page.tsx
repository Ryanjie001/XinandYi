"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarHeart,
  Check,
  Heart,
  PencilLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetail, MemoryForm, SettingsDialog } from "@/components/forms";
import { useStore, type Memory } from "@/lib/store";
import { nextOccurrence, readableDate, today, togetherDays } from "@/lib/dates";

export default function HomePage() {
  const { data, ready } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<Memory | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const days = togetherDays(data.settings.startDate);
  const memories = [...data.memories].sort((a, b) => b.date.localeCompare(a.date));
  const completed = data.wishes.filter((wish) => wish.completedAt).length;
  const upcoming = [
    { name: "我们的纪念日", date: data.settings.startDate, icon: Heart },
    { name: "新的生日", date: data.settings.xinBirthday, icon: Sparkles },
    { name: "怡的生日", date: data.settings.yiBirthday, icon: Sparkles },
  ]
    .filter((item) => item.date)
    .map((item) => ({ ...item, remaining: nextOccurrence(item.date) ?? 0 }))
    .sort((a, b) => a.remaining - b.remaining);
  const detail = data.memories.find((memory) => memory.id === detailId);
  return (
    <AppShell>
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow">
            <span className="short-line" />A LITTLE WORLD, JUST FOR TWO
          </div>
          <h1>
            {days ? (
              <>
                我们在一起的
                <br />第 <strong className="day-number">{days.toLocaleString("zh-CN")}</strong> 天
                <span className="title-dot">。</span>
              </>
            ) : (
              <>
                把日子，
                <br />
                慢慢写成<span className="rose-text">我们。</span>
              </>
            )}
          </h1>
          <p className="hero-description">
            {days ? (
              <>
                从 {readableDate(data.settings.startDate, true)} 开始，
                <br />
                每一个平凡的瞬间，都有了特别的意义。
              </>
            ) : (
              <>
                一屋，两人，三餐，四季。
                <br />
                还有很多很多，想和你一起。
              </>
            )}
          </p>
          <div className="hero-buttons">
            <button
              className="button button-primary"
              onClick={() => setEditor("new")}
              disabled={!ready}
            >
              <PencilLine size={17} />
              记下这一刻
            </button>
            <Link href="/wishes" className="button button-link">
              看看我们的愿望
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <button
            className="first-day-note"
            onClick={() => setSettingsOpen(true)}
            disabled={!ready}
          >
            <Heart size={14} />
            {days ? "故事从这一天开始 · 修改日期" : "我们的第一天，等你来写下"}
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="hero-art">
          <div className="hero-orbit" />
          <div className="hero-date">
            BE HERE. BE TOGETHER.<span>{today().replaceAll("-", " / ")}</span>
          </div>
          <figure className="polaroid polaroid-main">
            <div className="tape" />
            <img
              src={data.settings.coverImage || "/images/sea.jpg"}
              alt={data.settings.coverImage ? "我们的首页合照" : "示例封面：阳光下的海岸"}
            />
            <figcaption>
              和你一起，慢一点也没关系。
              <Heart size={16} strokeWidth={1.5} />
            </figcaption>
            {!data.settings.coverImage && (
              <button onClick={() => setSettingsOpen(true)} className="cover-replace">
                <Plus size={13} />
                换成我们的合照
              </button>
            )}
          </figure>
          <figure className="polaroid polaroid-small">
            <img src="/images/cafe.jpg" alt="示例照片：一家温暖的咖啡馆" />
            <figcaption>little things, big love.</figcaption>
          </figure>
          <div className="hero-heart">
            <Heart size={36} strokeWidth={1.25} />
          </div>
          <span className="hero-handwritten">to be continued...</span>
        </div>
      </section>
      <section className="story-strip" aria-label="我们的小小积累">
        <div className="strip-intro">
          <span className="icon-circle">
            <Heart size={21} strokeWidth={1.4} />
          </span>
          <div>
            <strong>我们的小小积累</strong>
            <span>把喜欢，留在每一天。</span>
          </div>
        </div>
        <div className="strip-stat">
          <strong>{data.memories.length.toString().padStart(2, "0")}</strong>
          <span>篇恋爱手记</span>
        </div>
        <div className="strip-stat">
          <strong>
            {completed.toString().padStart(2, "0")}
            <small> / {data.wishes.length.toString().padStart(2, "0")}</small>
          </strong>
          <span>个愿望已实现</span>
        </div>
        <div className="strip-next">
          <CalendarHeart size={21} strokeWidth={1.4} />
          <div>
            <span>{upcoming[0] ? upcoming[0].name : "下一个特别的日子"}</span>
            <strong>
              {upcoming[0]
                ? upcoming[0].remaining === 0
                  ? "就是今天 ♡"
                  : "还有 " + upcoming[0].remaining + " 天"
                : "等我们一起记下"}
            </strong>
          </div>
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="设置纪念日"
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>
      <section className="home-memories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MOMENTS TO REMEMBER</p>
            <h2>
              最近的我们<span className="tiny-heart">♡</span>
            </h2>
            <p className="section-description">值得记住的，从来不只是大日子。</p>
          </div>
          <Link href="/journal" className="text-button">
            翻开全部手记
            <ArrowRight size={17} />
          </Link>
        </div>
        {memories.length ? (
          <div className="memory-grid">
            {memories.slice(0, 3).map((memory) => (
              <MemoryCard key={memory.id} memory={memory} onClick={() => setDetailId(memory.id)} />
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <PencilLine size={22} />
            <p>第一页，留给我们的第一个故事。</p>
            <button className="text-button" onClick={() => setEditor("new")}>
              写第一篇手记
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <section className="home-bottom">
        <div className="wish-preview">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">SOMEDAY, TOGETHER</p>
              <h2>留给未来的小期待</h2>
            </div>
            <Sparkles size={25} strokeWidth={1.2} />
          </div>
          <div className="preview-wishes">
            {data.wishes
              .filter((wish) => !wish.completedAt)
              .slice(0, 3)
              .map((wish) => (
                <Link href="/wishes" key={wish.id}>
                  <span className="empty-check" />
                  <span>{wish.title}</span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            {!data.wishes.some((wish) => !wish.completedAt) && (
              <p className="muted">所有期待都实现啦，再许一个吧。</p>
            )}
          </div>
          <Link className="text-button" href="/wishes">
            去我们的愿望清单
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="anniversary-card">
          <div className="anniversary-top">
            <CalendarHeart size={24} strokeWidth={1.3} />
            <span>那些特别的日子</span>
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
                    {item.remaining === 0 ? "今天" : item.remaining + " 天"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <h3>
                每一年，
                <br />
                都有值得期待的那一天。
              </h3>
              <p>
                生日、周年，还有属于我们的纪念日。
                <br />
                填好日期，让期待有一个名字。
              </p>
            </>
          )}
          <button className="text-button" onClick={() => setSettingsOpen(true)}>
            {upcoming.length ? "管理纪念日" : "记下我们的纪念日"}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
      <div className="closing-note">
        <span />
        愿我们，把小日子过成喜欢的样子。
        <Heart size={14} />
        <span />
      </div>
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
