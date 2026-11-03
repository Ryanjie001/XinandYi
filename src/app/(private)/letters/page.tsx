"use client";
import { useEffect, useState } from "react";
import { MailPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Modal, PhotoPicker } from "@/components/ui";
import { useStore } from "@/lib/store";
import { readableDate, today } from "@/lib/dates";
import type { LetterSummary } from "@/lib/types";

function LetterForm({ onClose }: { onClose: () => void }) {
  const { data, sendLetter, saving, notify } = useStore();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const tomorrow = new Date(Date.parse(today() + "T00:00:00Z") + 86_400_000)
    .toISOString()
    .slice(0, 10);
  return (
    <Modal
      open
      title="写给未来的信"
      subtitle={`写给${data.person === "新" ? "怡" : "新"}，在约定的日期开启。`}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await sendLetter({ title, body: text, unlockDate, images })) {
            notify("信已保存。");
            onClose();
          }
        }}
      >
        <label className="field">
          标题
          <input required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          内容
          <textarea
            required
            rows={7}
            maxLength={10000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label className="field">
          开启日期
          <input
            type="date"
            required
            min={tomorrow}
            max="2100-12-31"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
          />
        </label>
        <p className="field-hint letter-hint">
          请选择明天或之后的日期；开启时间为当天北京时间 00:00。
        </p>
        <div className="field">
          <span>照片（选填）</span>
          <PhotoPicker images={images} onChange={setImages} onBusyChange={setPhotoBusy} />
        </div>
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            取消
          </button>
          <button
            className="button button-primary"
            disabled={
              saving ||
              photoBusy ||
              !title.trim() ||
              !text.trim() ||
              !unlockDate ||
              unlockDate <= today()
            }
          >
            保存信件
          </button>
        </div>
      </form>
    </Modal>
  );
}
function LetterDetail({ letter, onClose }: { letter: LetterSummary; onClose: () => void }) {
  const [data, setData] = useState<{ title: string; body: string; images: string[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/letters/${letter.id}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("暂时无法读取这封信。");
        return response.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [letter.id]);
  return (
    <Modal
      open
      title={data?.title || "信件"}
      subtitle={`${letter.author} 写给 ${letter.recipient} · ${readableDate(letter.unlockDate, true)} 开启`}
      wide
      onClose={onClose}
    >
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p className="muted">正在读取…</p>}
      {data && (
        <>
          <p className="letter-body">{data.body}</p>
          <div className="letter-photos">
            {data.images.map((image, index) => (
              <img key={image} src={image} alt={`信件照片 ${index + 1}`} />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
export default function LettersPage() {
  const { data, ready, saving, deleteLetter, notify } = useStore();
  const [writing, setWriting] = useState(false);
  const [view, setView] = useState<LetterSummary | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <AppShell>
      <div className="feature-page-heading letter-heading">
        <div>
          <p className="eyebrow">留给未来</p>
          <h1>未来的信</h1>
          <p className="muted">写给对方，在约定的日期打开。</p>
        </div>
        <button
          className="button button-primary"
          disabled={!ready}
          onClick={() => setWriting(true)}
        >
          <MailPlus size={16} />
          写一封信
        </button>
      </div>
      <div className="letter-list">
        {data.letters.map((letter) => (
          <article className="letter-card" key={letter.id}>
            <div>
              <span className="small muted">
                {letter.author} 写给 {letter.recipient}
              </span>
              <h2>{letter.title || "一封信"}</h2>
              <p className="muted">
                {readableDate(letter.unlockDate, true)} 开启 {letter.locked ? "· 未到开启日期" : ""}
              </p>
            </div>
            <div className="letter-actions">
              <button
                className="text-button"
                disabled={letter.locked}
                onClick={() => setView(letter)}
              >
                {letter.locked ? "尚未开启" : "查看信件"}
              </button>
              {letter.author === data.person && (
                <button
                  className="text-button danger"
                  disabled={saving}
                  onClick={async () => {
                    if (confirm !== letter.id) {
                      setConfirm(letter.id);
                      return;
                    }
                    if (await deleteLetter(letter.id)) {
                      setConfirm(null);
                      notify("信件已删除。");
                    }
                  }}
                >
                  {confirm === letter.id ? "确认删除" : "删除"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.letters.length && (
        <div className="empty-state">
          <h3>{ready ? "还没有信件" : "正在读取…"}</h3>
          <p>写一封信，留给未来。</p>
        </div>
      )}
      {writing && <LetterForm onClose={() => setWriting(false)} />}
      {view && <LetterDetail letter={view} onClose={() => setView(null)} />}
    </AppShell>
  );
}
