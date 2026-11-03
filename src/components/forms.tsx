"use client";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ImagePlus, Trash2 } from "lucide-react";
import { Modal, PhotoPicker } from "@/components/ui";
import { useStore, type Memory, type Settings, type Wish } from "@/lib/store";
import { readableDate, today } from "@/lib/dates";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, saveSettings, notify, ready, saving } = useStore();
  const [settings, setSettings] = useState<Settings>({ ...data.settings });
  const [photoBusy, setPhotoBusy] = useState(false);
  function update(key: keyof Settings, value: string) {
    setSettings({ ...settings, [key]: value });
  }
  return (
    <Modal open onClose={onClose} title="我们的设置" subtitle="纪念日、生日与首页照片。">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const values = new FormData(e.currentTarget);
          const lunarDate = (key: "xin" | "yi") => {
            const month = String(values.get(key + "LunarMonth") || "");
            const day = String(values.get(key + "LunarDay") || "");
            return month && day ? month + "-" + day : month || day ? null : "";
          };
          const xinLunarBirthday = lunarDate("xin"),
            yiLunarBirthday = lunarDate("yi");
          if (xinLunarBirthday === null || yiLunarBirthday === null) {
            notify("请同时选择农历月份和日期。");
            return;
          }
          const updated: Settings = {
            ...settings,
            startDate: String(values.get("startDate") || ""),
            xinBirthday: String(values.get("xinBirthday") || ""),
            yiBirthday: String(values.get("yiBirthday") || ""),
            xinLunarBirthday,
            yiLunarBirthday,
            xinLunarLeap: values.get("xinLunarLeap") === "yes",
            yiLunarLeap: values.get("yiLunarLeap") === "yes",
            xinBirthdayCalendar: values.get("xinBirthdayCalendar") === "lunar" ? "lunar" : "solar",
            yiBirthdayCalendar: values.get("yiBirthdayCalendar") === "lunar" ? "lunar" : "solar",
          };
          if (await saveSettings(updated)) {
            notify("设置已保存。");
            onClose();
          }
        }}
      >
        <label className="field">
          恋爱开始日期
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
        <div className="form-row birthday-row">
          {(["xin", "yi"] as const).map((key) => {
            const person = key === "xin" ? "新" : "怡";
            const solar = key === "xin" ? settings.xinBirthday : settings.yiBirthday;
            const lunar = key === "xin" ? settings.xinLunarBirthday : settings.yiLunarBirthday;
            const leap = key === "xin" ? settings.xinLunarLeap : settings.yiLunarLeap;
            const calendar =
              key === "xin" ? settings.xinBirthdayCalendar : settings.yiBirthdayCalendar;
            const [month = "", day = ""] = lunar.split("-");
            return (
              <fieldset className="birthday-fields" key={key}>
                <legend>{person}的生日</legend>
                <label className="field">
                  阳历
                  <input
                    type="date"
                    name={key + "Birthday"}
                    defaultValue={solar}
                    aria-label={person + "的阳历生日"}
                    min="1900-01-01"
                    max={today()}
                  />
                </label>
                <label className="field">
                  农历月份
                  <select
                    name={key + "LunarMonth"}
                    defaultValue={month}
                    aria-label={person + "的农历月份"}
                  >
                    <option value="">未设置</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={String(i + 1).padStart(2, "0")}>
                        {i + 1} 月
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  农历日期
                  <select
                    name={key + "LunarDay"}
                    defaultValue={day}
                    aria-label={person + "的农历日期"}
                  >
                    <option value="">未设置</option>
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i} value={String(i + 1).padStart(2, "0")}>
                        {i + 1} 日
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  是否闰月
                  <select
                    name={key + "LunarLeap"}
                    defaultValue={leap ? "yes" : "no"}
                    aria-label={person + "的农历闰月"}
                  >
                    <option value="no">普通月份</option>
                    <option value="yes">闰月</option>
                  </select>
                </label>
                <label className="field">
                  展示和倒计时
                  <select
                    name={key + "BirthdayCalendar"}
                    defaultValue={calendar}
                    aria-label={person + "展示的生日"}
                  >
                    <option value="solar">阳历生日</option>
                    <option value="lunar">农历生日</option>
                  </select>
                </label>
              </fieldset>
            );
          })}
        </div>
        <p className="field-hint birthday-hint">
          所选生日未填写时不会展示。闰月生日遇到无闰月的年份按普通月计算；农历三十遇小月按二十九计算。
        </p>
        <div className="field">
          <span>首页照片</span>
          <PhotoPicker
            images={settings.coverImage ? [settings.coverImage] : []}
            onChange={(images) => update("coverImage", images[0] || "")}
            onBusyChange={setPhotoBusy}
            max={1}
          />
        </div>
        <p className="form-note">更换照片后，保存设置即可更新首页。</p>
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            稍后再填
          </button>
          <button className="button button-primary" disabled={!ready || saving || photoBusy}>
            <Check size={16} />
            {photoBusy ? "照片处理中…" : "保存设置"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MemoryForm({ memory, onClose }: { memory?: Memory; onClose: () => void }) {
  const { data, saveMemory, notify, ready, saving } = useStore();
  const [title, setTitle] = useState(memory?.title || "");
  const [body, setBody] = useState(memory?.body || "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [images, setImages] = useState<string[]>(memory?.images || []);
  return (
    <Modal open onClose={onClose} title={memory ? "编辑手记" : "新建手记"} subtitle="记录这一天。">
      <form
        onSubmit={async (e) => {
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
            version: memory?.version,
          };
          if (await saveMemory(item)) {
            notify(memory ? "手记已更新。" : "手记已保存。");
            onClose();
          }
        }}
      >
        <label className="field">
          标题
          <input
            autoFocus
            required
            maxLength={60}
            placeholder="给这篇手记起个名字"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          日期
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
          正文
          <textarea
            rows={4}
            maxLength={5000}
            placeholder="写下想记住的事…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="field">
          <span>照片</span>
          <PhotoPicker images={images} onChange={setImages} onBusyChange={setPhotoBusy} />
        </div>
        <div className="form-actions">
          <span className="small muted">记录人 · {data.person}</span>
          <button className="button button-primary" disabled={!ready || saving || photoBusy}>
            <ImagePlus size={16} />
            {memory ? "保存修改" : "保存手记"}
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
  const { data, deleteMemory, notify, saving } = useStore();
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
      <p className="detail-body">{memory.body || "暂无正文。"}</p>
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
                disabled={saving}
                onClick={async () => {
                  if (await deleteMemory(memory.id)) {
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
  const { data, saveWish, deleteWish, notify, ready, saving } = useStore();
  const [title, setTitle] = useState(wish?.title || "");
  const [note, setNote] = useState(wish?.note || "");
  const [category, setCategory] = useState(wish?.category || "小日常");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Modal open onClose={onClose} title={wish ? "编辑愿望" : "添加愿望"} subtitle="记下一件愿望。">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          if (
            await saveWish({
              id: wish?.id || crypto.randomUUID(),
              title: title.trim(),
              note: note.trim(),
              category,
              author: wish?.author || data.person,
              completedAt: wish?.completedAt || null,
              memoryId: wish?.memoryId,
              version: wish?.version,
            })
          ) {
            notify("愿望已保存。");
            onClose();
          }
        }}
      >
        <label className="field">
          愿望
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
          分类
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>小日常</option>
            <option>去远方</option>
            <option>小浪漫</option>
            <option>慢慢来</option>
          </select>
        </label>
        <label className="field">
          备注
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
              disabled={saving}
              onClick={async () => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                if (await deleteWish(wish.id)) {
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
          <button className="button button-primary" disabled={!ready || saving}>
            保存愿望
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function WishRecord({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const { recordWish, notify, saving } = useStore();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  return (
    <Modal open onClose={onClose} title="完成愿望" subtitle={wish.title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await recordWish(wish.id, note.trim(), images)) {
            notify("愿望已完成，手记已保存。");
            onClose();
          }
        }}
      >
        <label className="field">
          完成记录
          <textarea
            autoFocus
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={5000}
            placeholder="写下实现愿望时的感受…"
          />
        </label>
        <PhotoPicker images={images} onChange={setImages} onBusyChange={setPhotoBusy} />
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            稍后再写
          </button>
          <button className="button button-primary" disabled={photoBusy || saving}>
            <Check size={16} />
            保存为手记
          </button>
        </div>
      </form>
    </Modal>
  );
}
