"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, CheckCheck, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WishForm, WishRecord } from "@/components/forms";
import { EmptyState } from "@/components/ui";
import { useStore, type Wish } from "@/lib/store";
import { readableDate } from "@/lib/dates";

export default function WishesPage() {
  const { data, toggleWish, notify, ready, saving } = useStore();
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [editor, setEditor] = useState<Wish | "new" | null>(null);
  const [record, setRecord] = useState<Wish | null>(null);
  const completed = data.wishes.filter((wish) => wish.completedAt).length;
  const percentage = data.wishes.length ? Math.round((completed / data.wishes.length) * 100) : 0;
  const wishes = data.wishes.filter(
    (wish) => filter === "all" || (filter === "done" ? !!wish.completedAt : !wish.completedAt),
  );
  return (
    <AppShell>
      <section className="page-intro">
        <div>
          <h1>愿望清单</h1>
          <p>记下想一起做的事，一件件慢慢实现。</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor("new")}
          disabled={!ready || saving}
        >
          <Plus size={18} />
          添加愿望
        </button>
      </section>
      <section className="wish-progress">
        <div className="wish-progress-copy">
          <p>共同完成</p>
          <span>每一件期待，都有属于它的时间。</span>
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
      </div>
      <div className="wish-grid">
        {wishes.map((wish) => (
          <article key={wish.id} className={"wish-card " + (wish.completedAt ? "wish-done" : "")}>
            <div className="wish-card-top">
              <span className="category-tag">{wish.category}</span>
              <button
                className="icon-button"
                aria-label={"编辑愿望：" + wish.title}
                onClick={() => setEditor(wish)}
              >
                <MoreHorizontal size={21} />
              </button>
            </div>
            <h2>{wish.title}</h2>
            <p>{wish.note || "还没有补充说明。"}</p>
            <div className="wish-card-bottom">
              <span className="wish-author">
                <span
                  className={"avatar avatar-small " + (wish.author === "怡" ? "avatar-yi" : "")}
                >
                  {wish.author}
                </span>
                {wish.author} 添加{wish.demo && <span className="demo-tag">示例</span>}
              </span>
              <button
                className={"wish-check " + (wish.completedAt ? "checked" : "")}
                aria-label={(wish.completedAt ? "恢复为期待中：" : "标记完成：") + wish.title}
                aria-pressed={!!wish.completedAt}
                disabled={!ready || saving}
                onClick={async () => {
                  if (await toggleWish(wish.id))
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
        <button
          className="wish-add-card"
          onClick={() => setEditor("new")}
          disabled={!ready || saving}
        >
          <span>
            <Plus size={26} strokeWidth={1.3} />
          </span>
          <strong>添加一个愿望</strong>
          <p>一起期待下一件事。</p>
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
      {editor && (
        <WishForm wish={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />
      )}
      {record && <WishRecord wish={record} onClose={() => setRecord(null)} />}
    </AppShell>
  );
}
