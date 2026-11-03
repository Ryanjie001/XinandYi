"use client";
import { ArrowUpRight, Camera, Heart } from "lucide-react";
import type { Memory } from "@/lib/store";
import { readableDate } from "@/lib/dates";

export function MemoryCard({
  memory,
  onClick,
  variant = "",
}: {
  memory: Memory;
  onClick: () => void;
  variant?: string;
}) {
  return (
    <button
      className={"memory-card " + variant}
      onClick={onClick}
      aria-label={"阅读手记：" + memory.title}
    >
      <div className={"memory-image " + (!memory.images.length ? "memory-no-photo" : "")}>
        {memory.images[0] ? (
          <img src={memory.images[0]} alt={memory.title} loading="lazy" />
        ) : (
          <Heart size={40} strokeWidth={1} />
        )}
        {memory.demo && <span className="image-demo">示例回忆</span>}
        {memory.images.length > 1 && (
          <span className="photo-count">
            <Camera size={13} />
            {memory.images.length}
          </span>
        )}
        <span className="card-open">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="memory-card-body">
        <div className="memory-date">
          {readableDate(memory.date, true)}
          <span>由 {memory.author} 记录</span>
        </div>
        <h3>{memory.title}</h3>
        <p>{memory.body || "照片替我们记住的瞬间。"}</p>
      </div>
    </button>
  );
}
