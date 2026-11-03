"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { preparePhoto } from "@/lib/photos";
import { useStore } from "@/lib/store";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { toast, saving } = useStore();
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "modal-wide" : "")}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(e) => {
        if (!saving && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            disabled={saving}
            onClick={onClose}
            aria-label="关闭弹窗"
          >
            <X size={20} />
          </button>
        </div>
        {children}
        {toast && (
          <p className="modal-feedback" role="status">
            {toast}
          </p>
        )}
      </div>
    </dialog>
  );
}

export function PhotoPicker({
  images,
  onChange,
  max = 3,
  onBusyChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { notify, saving } = useStore();
  const id = useId();
  return (
    <div className="photo-picker">
      <div className="photo-thumbs">
        {images.map((src, i) => (
          <div key={i} className="photo-thumb">
            <img src={src} alt={"待保存的照片 " + (i + 1)} />
            <button
              type="button"
              aria-label={"移除照片 " + (i + 1)}
              disabled={busy || saving}
              onClick={() => onChange(images.filter((_, index) => index !== i))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <label className={"photo-add " + (busy ? "is-busy" : "")} htmlFor={id}>
            {busy ? <LoaderCircle size={24} className="spin" /> : <ImagePlus size={24} />}
            <span>{busy ? "处理中" : "添加照片"}</span>
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple={max > 1}
              disabled={busy || saving}
              className="sr-only"
              onChange={async (e) => {
                const input = e.currentTarget;
                const selected = Array.from(input.files || []).slice(0, max - images.length);
                if (!selected.length) return;
                setBusy(true);
                onBusyChange?.(true);
                try {
                  onChange([...images, ...(await Promise.all(selected.map(preparePhoto)))]);
                } catch (error) {
                  notify(error instanceof Error ? error.message : "照片处理失败，请重试。");
                } finally {
                  setBusy(false);
                  onBusyChange?.(false);
                  input.value = "";
                }
              }}
            />
          </label>
        )}
      </div>
      <p className="field-hint">
        最多 {max} 张 · JPG / PNG / WebP / GIF · 单张小于 12 MB，保存为压缩静态照片
      </p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
