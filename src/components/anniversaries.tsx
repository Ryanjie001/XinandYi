"use client";
import { useState } from "react";
import { Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { anniversaryRemaining, readableDate, today } from "@/lib/dates";
import type { Anniversary } from "@/lib/types";

export function AnniversaryDialog({ onClose }: { onClose: () => void }) {
  const { data, saving, saveAnniversary, deleteAnniversary, notify } = useStore();
  const [edit, setEdit] = useState<Anniversary | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [yearly, setYearly] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null);
  const reset = () => {
    setEdit(null);
    setName("");
    setDate(today());
    setYearly(true);
  };
  return (
    <Modal open title="纪念日" subtitle="添加阳历日期，可选择每年重复。" wide onClose={onClose}>
      <form
        className="anniversary-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await saveAnniversary({
              ...(edit ? { id: edit.id, version: edit.version } : {}),
              name: name.trim(),
              date,
              yearly,
            })
          ) {
            notify(edit ? "纪念日已更新。" : "纪念日已添加。");
            reset();
          }
        }}
      >
        <div className="form-row">
          <label className="field">
            名称
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：第一次见面"
            />
          </label>
          <label className="field">
            日期（阳历）
            <input
              type="date"
              required
              min="1900-01-01"
              max="2100-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <label className="anniversary-repeat">
          <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />{" "}
          每年重复
        </label>
        <p className="field-hint">临近 7 天会在首页提示。2 月 29 日在平年按 2 月 28 日计算。</p>
        <div className="form-actions">
          {edit && (
            <button type="button" className="button button-quiet" onClick={reset}>
              取消编辑
            </button>
          )}
          <button className="button button-primary" disabled={saving || !name.trim()}>
            {edit ? "保存修改" : "添加纪念日"}
          </button>
        </div>
      </form>
      <div className="anniversary-manage-list">
        {!data.anniversaries.length && <p className="muted">还没有自定义纪念日。</p>}
        {data.anniversaries.map((item) => {
          const remaining = anniversaryRemaining(item.date, item.yearly);
          return (
            <div key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p className="small muted">
                  {readableDate(item.date, true)} · {item.yearly ? "每年" : "仅一次"} ·{" "}
                  {remaining === 0
                    ? "今天"
                    : remaining !== null && remaining > 0
                      ? `${remaining} 天后`
                      : "已过"}
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEdit(item);
                  setName(item.name);
                  setDate(item.date);
                  setYearly(item.yearly);
                  setConfirm(null);
                }}
              >
                编辑
              </button>
              <button
                type="button"
                className="text-button danger"
                disabled={saving}
                onClick={async () => {
                  if (confirm !== item.id) {
                    setConfirm(item.id);
                    return;
                  }
                  if (await deleteAnniversary(item.id, item.version)) {
                    if (edit?.id === item.id) reset();
                    setConfirm(null);
                    notify("纪念日已删除。");
                  }
                }}
              >
                {confirm === item.id ? "确认删除" : "删除"}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
