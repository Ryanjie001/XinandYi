"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WishForm, WishRecord } from "@/components/forms";
import { EmptyState } from "@/components/ui";
import { useStore, type Wish } from "@/lib/store";
import { readableDate } from "@/lib/dates";

export default function WishesPage() {
  const { data, toggleWish, notify, ready } = useStore();
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [editor, setEditor] = useState<Wish | "new" | null>(null);
  const [record, setRecord] = useState<Wish | null>(null);
  const completed = data.wishes.filter((wish) => wish.completedAt).length;
  const percentage = data.wishes.length ? Math.round((completed / data.wishes.length) * 100) : 0;
  const wishes = data.wishes.filter(
    (wish) => filter === "all" || (filter === "done" ? !!wish.completedAt : !wish.completedAt),
  );
  const categoryClasses: Record<string, string> = {
    去远方: "tag-travel",
    小日常: "tag-daily",
    小浪漫: "tag-romance",
    慢慢来: "tag-slow",
  };
  return (
    <AppShell>
      <section className="page-intro">
        <div>
          <p className="eyebrow">
            <span className="short-line" />
            SOMEDAY, TOGETHER
          </p>
          <h1>
            一起完成的事<span className="rose-text">。</span>
          </h1>
          <p>有些期待，一个人是愿望，两个人就成了计划。</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor("new")}
          disabled={!ready}
        >
          <Plus size={18} />
          许一个愿望
        </button>
      </section>
      <section className="wish-progress">
        <div className="wish-progress-icon">
          <Sparkles size={30} strokeWidth={1.2} />
        </div>
        <div className="wish-progress-copy">
          <p>我们的愿望，正在一点点实现。</p>
          <span>每完成一件，未来就多一段可以回忆的故事。</span>
        </div>
        <div className="progress-detail">
          <div>
            <span>
              已实现 <strong>{completed}</strong> / {data.wishes.length}
            </span>
            <span>{percentage}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="愿望完成进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <span style={{ width: percentage + "%" }} />
          </div>
        </div>
      </section>
      <div className="filter-bar wish-filter">
        <div className="filter-tabs" aria-label="按愿望状态筛选">
          {(
            [
              { key: "pending", title: "期待中", count: data.wishes.length - completed },
              { key: "done", title: "已实现", count: completed },
              { key: "all", title: "全部愿望", count: data.wishes.length },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              className={filter === item.key ? "active" : ""}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.title}
              <span className="tab-count">{item.count}</span>
            </button>
          ))}
        </div>
        <span className="small muted desktop-only">不着急，我们有很多个明天。</span>
      </div>
      <div className="wish-grid">
        {wishes.map((wish) => (
          <article key={wish.id} className={"wish-card " + (wish.completedAt ? "wish-done" : "")}>
            <div className="wish-card-top">
              <span className={"category-tag " + (categoryClasses[wish.category] || "tag-slow")}>
                {wish.category === "去远方" ? <ArrowUpRight size={12} /> : <Star size={12} />}
                {wish.category}
              </span>
              <button
                className="icon-button"
                aria-label={"编辑愿望：" + wish.title}
                onClick={() => setEditor(wish)}
              >
                <MoreHorizontal size={21} />
              </button>
            </div>
            <span className="wish-card-index">
              NO. {String(data.wishes.indexOf(wish) + 1).padStart(2, "0")}
            </span>
            <h2>{wish.title}</h2>
            <p>{wish.note || "想和你一起，认真完成这件小事。"}</p>
            <div className="wish-card-bottom">
              <span className="wish-author">
                <span
                  className={"avatar avatar-small " + (wish.author === "怡" ? "avatar-yi" : "")}
                >
                  {wish.author}
                </span>
                {wish.author} 的小期待{wish.demo && <span className="demo-tag">示例</span>}
              </span>
              <button
                className={"wish-check " + (wish.completedAt ? "checked" : "")}
                aria-label={(wish.completedAt ? "恢复为期待中：" : "标记完成：") + wish.title}
                aria-pressed={!!wish.completedAt}
                disabled={!ready}
                onClick={() => {
                  if (toggleWish(wish.id))
                    notify(wish.completedAt ? "已恢复为期待中。" : "又一起实现了一个愿望！");
                }}
              >
                <Check size={17} />
              </button>
            </div>
            {wish.completedAt && (
              <div className="wish-completed-row">
                <span>
                  <CheckCheck size={14} />
                  {readableDate(wish.completedAt)}已实现
                </span>
                {wish.memoryId ? (
                  <Link href="/journal" className="text-button">
                    已留下手记
                    <ArrowUpRight size={13} />
                  </Link>
                ) : (
                  <button className="text-button" onClick={() => setRecord(wish)}>
                    留下手记
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
        <button className="wish-add-card" onClick={() => setEditor("new")} disabled={!ready}>
          <span>
            <Plus size={26} strokeWidth={1.3} />
          </span>
          <strong>下一个期待，是什么？</strong>
          <p>把想和你一起做的事，都写下来。</p>
        </button>
      </div>
      {!wishes.length && (
        <EmptyState
          icon={<Sparkles size={30} strokeWidth={1.2} />}
          title={filter === "done" ? "美好，正在路上" : "新的期待，从这里开始"}
          description={
            filter === "done"
              ? "实现一个愿望，就会在这里留下一颗小星星。"
              : "一起想想，下一件让我们开心的小事。"
          }
        />
      )}
      <div className="wish-quote">
        <span>“</span>
        <p>
          人生有很多种可能，
          <br />
          我想和你，一种一种试。
        </p>
        <HeartDoodle />
      </div>
      {editor && (
        <WishForm wish={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />
      )}
      {record && <WishRecord wish={record} onClose={() => setRecord(null)} />}
    </AppShell>
  );
}
function HeartDoodle() {
  return (
    <svg width="55" height="38" viewBox="0 0 55 38" fill="none" aria-hidden="true">
      <path
        d="M28 32C19 25 9 19 12 11c3-9 14-6 16 0C32 2 44 6 43 14c-1 8-15 18-15 18Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="m47 4 4-2M49 12l4 1M7 26l-4 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
