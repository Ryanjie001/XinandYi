"use client";
import { useState } from "react";
import { BookHeart, Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetail, MemoryForm } from "@/components/forms";
import { EmptyState } from "@/components/ui";
import { useStore, type Memory, type Person } from "@/lib/store";

export default function JournalPage() {
  const { data, ready } = useStore();
  const [author, setAuthor] = useState<Person | "all">("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Memory | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const filtered = [...data.memories]
    .filter(
      (memory) =>
        (author === "all" || memory.author === author) &&
        (memory.title + " " + memory.body).toLowerCase().includes(query.toLowerCase().trim()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const groups = filtered.reduce<Record<string, Memory[]>>((result, memory) => {
    const month = memory.date.slice(0, 7);
    (result[month] ||= []).push(memory);
    return result;
  }, {});
  const detail = data.memories.find((memory) => memory.id === detailId);
  return (
    <AppShell>
      <section className="page-intro">
        <div>
          <h1>恋爱手记</h1>
          <p>把值得记住的片刻，留在这里。</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor("new")}
          disabled={!ready}
        >
          <Plus size={18} />
          写一篇手记
        </button>
      </section>
      <div className="filter-bar">
        <div className="filter-tabs" aria-label="按记录人筛选">
          {(["all", "新", "怡"] as const).map((person) => (
            <button
              key={person}
              className={author === person ? "active" : ""}
              aria-pressed={author === person}
              onClick={() => setAuthor(person)}
            >
              {person === "all" ? "全部手记" : person + "的记录"}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={17} />
          <span className="sr-only">搜索手记</span>
          <input
            aria-label="搜索手记"
            placeholder="搜索标题或内容"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="清空搜索" onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </label>
      </div>
      <div className="journal-content">
        {Object.entries(groups).map(([month, memories]) => (
          <section key={month} className="journal-month">
            <div className="month-heading">
              <span className="month-number">{month.slice(5)}</span>
              <div>
                <strong>
                  {month.slice(0, 4)} 年 · {Number(month.slice(5))} 月
                </strong>
                <span>{memories.length} 篇手记</span>
              </div>
              <span className="month-line" />
            </div>
            <div className="memory-grid">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onClick={() => setDetailId(memory.id)}
                />
              ))}
            </div>
          </section>
        ))}
        {!filtered.length && (
          <EmptyState
            icon={<BookHeart size={30} strokeWidth={1.2} />}
            title={query || author !== "all" ? "这个瞬间，还没找到" : "第一页，留给我们"}
            description={
              query || author !== "all"
                ? "换个关键词，或看看全部手记。"
                : "一句话、一张照片，都可以是故事的开始。"
            }
            action={
              query || author !== "all" ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setAuthor("all");
                    setQuery("");
                  }}
                >
                  查看全部手记
                </button>
              ) : (
                <button className="button button-primary" onClick={() => setEditor("new")}>
                  写第一篇手记
                </button>
              )
            }
          />
        )}
      </div>
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
