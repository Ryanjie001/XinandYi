"use client";
import { Camera, Image as ImageIcon } from "lucide-react";
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
          <ImageIcon size={28} strokeWidth={1} />
        )}
        {memory.demo && <span className="image-demo">示例</span>}
        {memory.images.length > 1 && (
          <span className="photo-count">
            <Camera size={13} />
            {memory.images.length}
          </span>
        )}
      </div>
      <div className="memory-card-body">
        <div className="memory-date">
          <span>{readableDate(memory.date)}</span>
          <span>
            {memory.author} 记录
            {(memory.unreadComments || 0) > 0 && (
              <span className="unread-label"> · {memory.unreadComments} 条新留言</span>
            )}
          </span>
        </div>
        <h3>{memory.title}</h3>
        <p>{memory.body || "暂无正文。"}</p>
      </div>
    </button>
  );
}
