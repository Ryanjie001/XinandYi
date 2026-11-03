"use client";
import { useState } from "react";
import { MOODS, type MoodEntry } from "@/lib/types";
import { today, readableDate } from "@/lib/dates";
import { useStore } from "@/lib/store";

function MoodEditor({ date, existing }: { date: string; existing?: MoodEntry }) {
  const { data, saveMood, saving, ready, notify } = useStore();
  const [mood, setMood] = useState(existing?.mood || "");
  const [note, setNote] = useState(existing?.note || "");
  return (
    <form
      className="mood-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          mood &&
          (await saveMood({
            date,
            mood,
            note: note.trim(),
            ...(existing ? { version: existing.version } : {}),
          }))
        )
          notify("心情已保存。");
      }}
    >
      <div className="mood-choices" role="group" aria-label="选择心情">
        {MOODS.map((item, index) => (
          <button
            type="button"
            key={item}
            className={mood === item ? "selected" : ""}
            aria-pressed={mood === item}
            onClick={() => setMood(item)}
          >
            <span
              className="mood-character"
              aria-hidden="true"
              style={{
                backgroundImage: `url(/moods/${data.person === "怡" ? "lumei" : "lulu"}.webp)`,
                backgroundPosition: `${(index % 5) * 25}% ${Math.floor(index / 5) * 100}%`,
              }}
            />
            <span>{item}</span>
          </button>
        ))}
      </div>
      <label className="field mood-note">
        简单记一记（选填）
        <textarea
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今天发生了什么？"
        />
      </label>
      <button className="button button-primary" disabled={!ready || saving || !mood}>
        {existing ? "更新心情" : "保存心情"}
      </button>
    </form>
  );
}

export function MoodBoard() {
  const { data, ready, saving, deleteMood, notify } = useStore();
  const [date, setDate] = useState(today());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const existing = data.moods.find((item) => item.date === date && item.author === data.person);
  return (
    <section className="mood-board" aria-labelledby="mood-heading">
      <div className="section-heading">
        <div>
          <h2 id="mood-heading">每日心情</h2>
          <p className="muted small">每天记录一次心情</p>
        </div>
        <label className="mood-date">
          <span className="sr-only">心情日期</span>
          <input
            type="date"
            min="1900-01-01"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <MoodEditor
        key={`${data.person}-${date}-${existing?.id || "new"}-${existing?.version || 0}`}
        date={date}
        existing={existing}
      />
      <div className="mood-history">
        <h3>最近的心情</h3>
        {!data.moods.length && (
          <p className="muted small">{ready ? "还没有心情记录。" : "正在读取…"}</p>
        )}
        {(showAll ? data.moods : data.moods.slice(0, 14)).map((item) => (
          <div className="mood-entry" key={item.id}>
            <span className="avatar avatar-small">{item.author}</span>
            <div>
              <strong>{item.mood}</strong>
              <span className="muted small">
                {" "}
                · {readableDate(item.date, true)} · {item.author}
              </span>
              {item.note && <p>{item.note}</p>}
            </div>
            {item.author === data.person && (
              <button
                className="text-button muted"
                disabled={saving}
                onClick={async () => {
                  if (confirmId !== item.id) {
                    setConfirmId(item.id);
                    return;
                  }
                  if (await deleteMood(item.id)) {
                    setConfirmId(null);
                    notify("心情已删除。");
                  }
                }}
              >
                {confirmId === item.id ? "确认删除" : "删除"}
              </button>
            )}
          </div>
        ))}
        {data.moods.length > 14 && (
          <button className="text-button" type="button" onClick={() => setShowAll(!showAll)}>
            {showAll ? "收起" : "查看全部"}
          </button>
        )}
      </div>
    </section>
  );
}
