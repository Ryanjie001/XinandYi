"use client";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ImagePlus, Trash2 } from "lucide-react";
import { Modal, PhotoPicker } from "@/components/ui";
import { useStore, type Memory, type Settings, type Wish } from "@/lib/store";
import { readableDate, today } from "@/lib/dates";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, saveSettings, notify, ready } = useStore();
  const [settings, setSettings] = useState<Settings>({ ...data.settings });
  const [photoBusy, setPhotoBusy] = useState(false);
  function update(key: keyof Settings, value: string) {
    setSettings({ ...settings, [key]: value });
  }
  return (
    <Modal open onClose={onClose} title="关于我们的设置" subtitle="把这些特别的日子，慢慢填进来。">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const values = new FormData(e.currentTarget);
          const updated = {
            ...settings,
            startDate: String(values.get("startDate") || ""),
            xinBirthday: String(values.get("xinBirthday") || ""),
            yiBirthday: String(values.get("yiBirthday") || ""),
          };
          if (saveSettings(updated)) {
            notify("属于我们的日子，已经记好了。");
            onClose();
          }
        }}
      >
        <label className="field">
          我们在一起的第一天
          <span className="input-wrap">
            <CalendarDays size={17} />
            <input
              type="date"
              aria-label="恋爱开始日期"
              name="startDate"
              defaultValue={settings.startDate}
              min="1900-01-01"
              max={today()}
            />
          </span>
        </label>
        <p className="field-hint">第一天按第 1 天计算，日期以北京时间为准。</p>
        <div className="form-row">
          <label className="field">
            新的生日
            <input
              type="date"
              name="xinBirthday"
              defaultValue={settings.xinBirthday}
              min="1900-01-01"
              max={today()}
            />
          </label>
          <label className="field">
            怡的生日
            <input
              type="date"
              name="yiBirthday"
              defaultValue={settings.yiBirthday}
              min="1900-01-01"
              max={today()}
            />
          </label>
        </div>
        <div className="field">
          <span>我们的首页合照</span>
          <PhotoPicker
            images={settings.coverImage ? [settings.coverImage] : []}
            onChange={(images) => update("coverImage", images[0] || "")}
            onBusyChange={setPhotoBusy}
            max={1}
          />
        </div>
        <p className="form-note">本地预览：设置和照片仅保存在当前浏览器，请保留原始照片。</p>
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            稍后再填
          </button>
          <button className="button button-primary" disabled={!ready || photoBusy}>
            <Check size={16} />
            {photoBusy ? "照片处理中…" : "保存设置"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MemoryForm({ memory, onClose }: { memory?: Memory; onClose: () => void }) {
  const { data, saveMemory, notify, ready } = useStore();
  const [title, setTitle] = useState(memory?.title || "");
  const [body, setBody] = useState(memory?.body || "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [images, setImages] = useState<string[]>(memory?.images || []);
  return (
    <Modal
      open
      onClose={onClose}
      title={memory ? "再写一点，那天的我们" : "记下这一刻"}
      subtitle="小事也值得被认真收藏。"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const item: Memory = {
            id: memory?.id || crypto.randomUUID(),
            title: title.trim(),
            body: body.trim(),
            date: String(new FormData(e.currentTarget).get("date") || today()),
            author: memory?.author || data.person,
            images,
            wishId: memory?.wishId,
          };
          if (saveMemory(item)) {
            notify(memory ? "手记已更新。" : "又收藏了一个属于我们的瞬间。");
            onClose();
          }
        }}
      >
        <label className="field">
          给这一天起个名字
          <input
            autoFocus
            required
            maxLength={60}
            placeholder="比如：今天的晚霞，有点像你"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          发生在哪一天
          <input
            type="date"
            required
            min="1900-01-01"
            max={today()}
            name="date"
            defaultValue={memory?.date || today()}
          />
        </label>
        <label className="field">
          想记住的话
          <textarea
            rows={4}
            maxLength={5000}
            placeholder="发生了什么？当时的心情是什么样的？"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="field">
          <span>让照片也替我们记住</span>
          <PhotoPicker images={images} onChange={setImages} onBusyChange={setPhotoBusy} />
        </div>
        <div className="form-actions">
          <span className="small muted">记录人 · {data.person}</span>
          <button className="button button-primary" disabled={!ready || photoBusy}>
            <ImagePlus size={16} />
            {memory ? "保存修改" : "收藏这一刻"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MemoryDetail({
  memory,
  onClose,
  onEdit,
}: {
  memory: Memory;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data, deleteMemory, notify } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selected, setSelected] = useState(0);
  return (
    <Modal open onClose={onClose} title={memory.title} wide>
      <div className="detail-meta">
        <span className="avatar avatar-small">{memory.author}</span>
        <span>
          {memory.author} 记录于 {readableDate(memory.date, true)}
        </span>
        {memory.demo && <span className="demo-tag">示例</span>}
      </div>
      {memory.images.length > 0 && (
        <div className="detail-gallery">
          <img
            className="detail-photo"
            src={memory.images[selected]}
            alt={memory.title + "，照片 " + (selected + 1)}
          />
          {memory.images.length > 1 && (
            <div className="gallery-dots">
              {memory.images.map((_, index) => (
                <button
                  key={index}
                  className={index === selected ? "active" : ""}
                  aria-label={"查看第 " + (index + 1) + " 张照片"}
                  aria-pressed={index === selected}
                  onClick={() => setSelected(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="detail-body">{memory.body || "照片已经替我们记下了这一天。"}</p>
      {data.person === memory.author && (
        <div className="detail-actions">
          {confirmDelete ? (
            <div className="delete-confirm">
              <span>确定删除这篇手记？</span>
              <button className="text-button" onClick={() => setConfirmDelete(false)}>
                保留
              </button>
              <button
                className="text-button danger"
                onClick={() => {
                  if (deleteMemory(memory.id)) {
                    notify("这篇手记已删除。");
                    onClose();
                  }
                }}
              >
                确定删除
              </button>
            </div>
          ) : (
            <>
              <button className="text-button muted" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
                删除
              </button>
              <button className="text-button" onClick={onEdit}>
                编辑手记
                <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

export function WishForm({ wish, onClose }: { wish?: Wish; onClose: () => void }) {
  const { data, saveWish, deleteWish, notify, ready } = useStore();
  const [title, setTitle] = useState(wish?.title || "");
  const [note, setNote] = useState(wish?.note || "");
  const [category, setCategory] = useState(wish?.category || "小日常");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={wish ? "把期待再写具体一点" : "许一个小小的愿望"}
      subtitle="远方很远，有你就很近。"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          if (
            saveWish({
              id: wish?.id || crypto.randomUUID(),
              title: title.trim(),
              note: note.trim(),
              category,
              author: wish?.author || data.person,
              completedAt: wish?.completedAt || null,
              memoryId: wish?.memoryId,
            })
          ) {
            notify("这份期待，我们一起记着。");
            onClose();
          }
        }}
      >
        <label className="field">
          想一起做的事
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="一起去……"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          属于哪一种期待
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>小日常</option>
            <option>去远方</option>
            <option>小浪漫</option>
            <option>慢慢来</option>
          </select>
        </label>
        <label className="field">
          补充一点小想法
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="想在哪里、什么时候、怎样一起完成？"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="form-actions">
          {wish ? (
            <button
              type="button"
              className="text-button danger"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                if (deleteWish(wish.id)) {
                  notify("愿望已删除，关联手记会保留。");
                  onClose();
                }
              }}
            >
              {confirmDelete ? "再点一次确认删除" : "删除愿望"}
            </button>
          ) : (
            <span />
          )}
          <button className="button button-primary" disabled={!ready}>
            保存愿望
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function WishRecord({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const { recordWish, notify } = useStore();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  return (
    <Modal open onClose={onClose} title="让期待，成为回忆" subtitle={wish.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (recordWish(wish.id, note.trim(), images)) {
            notify("愿望已完成，也已收藏进恋爱手记。");
            onClose();
          }
        }}
      >
        <label className="field">
          这一刻，想说些什么
          <textarea
            autoFocus
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={5000}
            placeholder="原来和你一起实现的感觉，是这样的……"
          />
        </label>
        <PhotoPicker images={images} onChange={setImages} onBusyChange={setPhotoBusy} />
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            稍后再写
          </button>
          <button className="button button-primary" disabled={photoBusy}>
            <Check size={16} />
            完成并留下手记
          </button>
        </div>
      </form>
    </Modal>
  );
}
