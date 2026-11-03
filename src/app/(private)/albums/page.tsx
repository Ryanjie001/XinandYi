"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ImagePlus, Images, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MemoryDetail, MemoryForm } from "@/components/forms";
import { Modal } from "@/components/ui";
import { preparePhoto } from "@/lib/photos";
import { useStore, type Memory } from "@/lib/store";

type PhotoEntry = { image: string; memory?: Memory; month: string };
type DeletionImpact = {
  image: string;
  memories: { id: string; title: string }[];
  albums: { id: string; name: string }[];
  cover: boolean;
  draftCount: number;
  fingerprint: string;
};
export default function AlbumsPage() {
  const {
    data,
    ready,
    saving,
    notify,
    createAlbum,
    renameAlbum,
    deleteAlbum,
    setAlbumImage,
    addGalleryPhoto,
    deleteSharedPhoto,
  } = useStore();
  const [uploading, setUploading] = useState(false);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact | null>(null);
  async function checkDelete(image: string) {
    setCheckingDelete(true);
    try {
      const response = await fetch(`/api/photo-deletion?image=${encodeURIComponent(image)}`, {
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "暂时无法检查照片关联。");
      setDeleteImpact(value);
    } catch (error) {
      notify(error instanceof Error ? error.message : "暂时无法检查照片关联。");
    } finally {
      setCheckingDelete(false);
    }
  }
  const [selected, setSelected] = useState("all");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState<PhotoEntry | null>(null);
  const [editor, setEditor] = useState<Memory | null>(null);
  const album = data.albums.find((item) => item.id === selected);
  const chosenTarget = data.albums.some((item) => item.id === target)
    ? target
    : data.albums[0]?.id || "";
  const photos = useMemo(() => {
    const items = new Map<string, PhotoEntry>();
    for (const memory of [...data.memories].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const image of memory.images)
        if (!items.has(image)) items.set(image, { image, memory, month: memory.date.slice(0, 7) });
    }
    if (data.settings.coverImage && !items.has(data.settings.coverImage))
      items.set(data.settings.coverImage, { image: data.settings.coverImage, month: "其他照片" });
    for (const photo of data.gallery) {
      if (!items.has(photo.image)) {
        const month = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
        })
          .format(new Date(photo.createdAt))
          .slice(0, 7);
        items.set(photo.image, { image: photo.image, month });
      }
    }
    for (const group of data.albums)
      for (const image of group.images)
        if (!items.has(image)) items.set(image, { image, month: "其他照片" });
    return [...items.values()];
  }, [data.memories, data.settings.coverImage, data.albums, data.gallery]);
  const visible = album ? photos.filter((photo) => album.images.includes(photo.image)) : photos;
  const groups = visible.reduce<Record<string, PhotoEntry[]>>((result, photo) => {
    (result[photo.month] ||= []).push(photo);
    return result;
  }, {});
  const detail = view?.memory
    ? data.memories.find((item) => item.id === view.memory?.id)
    : undefined;
  return (
    <AppShell>
      <div className="feature-page-heading">
        <div>
          <p className="eyebrow">照片</p>
          <h1>我们的相册</h1>
          <p className="muted">记录每一张照片。</p>
        </div>
        <label className={"button button-primary album-upload" + (uploading ? " is-busy" : "")}>
          <ImagePlus size={16} /> {uploading ? "上传中…" : "添加照片"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={!ready || saving || uploading}
            onChange={async (event) => {
              const input = event.currentTarget;
              const files = Array.from(input.files || []);
              const albumId = album?.id;
              if (!files.length) return;
              setUploading(true);
              let added = 0;
              try {
                for (const file of files) {
                  const image = await preparePhoto(file);
                  if (!(await addGalleryPhoto(image, albumId)))
                    throw new Error("照片保存失败，请重试。");
                  added++;
                }
                notify(`已添加 ${added} 张照片。`);
              } catch (error) {
                notify(
                  `${added ? `已添加 ${added} 张。` : ""}${error instanceof Error ? error.message : "上传失败，请重试。"}`,
                );
              } finally {
                setUploading(false);
                input.value = "";
              }
            }}
          />
        </label>
      </div>
      <div className="album-toolbar">
        <div className="album-tabs" aria-label="选择相册">
          <button
            type="button"
            className={selected === "all" ? "active" : ""}
            onClick={() => {
              setSelected("all");
              setEditing(false);
              setConfirmDelete(false);
            }}
          >
            全部照片
          </button>
          {data.albums.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected === item.id ? "active" : ""}
              onClick={() => {
                setSelected(item.id);
                setEditing(false);
                setConfirmDelete(false);
              }}
            >
              {item.name} <span>{item.images.length}</span>
            </button>
          ))}
        </div>
        <form
          className="album-create"
          onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim() && (await createAlbum(name.trim()))) {
              setName("");
              notify("相册已创建。");
            }
          }}
        >
          <label className="sr-only" htmlFor="album-name">
            新相册名称
          </label>
          <input
            id="album-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="新相册名称"
          />
          <button className="button button-secondary" disabled={!ready || saving || !name.trim()}>
            <Plus size={15} />
            新建
          </button>
        </form>
      </div>
      {album && (
        <div className="album-manage">
          {editing ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (name.trim() && (await renameAlbum(album.id, name.trim()))) {
                  setEditing(false);
                  setName("");
                }
              }}
            >
              <input
                aria-label="相册新名称"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="text-button" disabled={saving || !name.trim()}>
                保存
              </button>
              <button
                type="button"
                className="text-button muted"
                onClick={() => {
                  setEditing(false);
                  setName("");
                }}
              >
                取消
              </button>
            </form>
          ) : (
            <button
              className="text-button"
              onClick={() => {
                setEditing(true);
                setName(album.name);
              }}
            >
              重命名
            </button>
          )}
          <button
            className="text-button danger"
            disabled={saving}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              if (await deleteAlbum(album.id)) {
                setSelected("all");
                setConfirmDelete(false);
                notify("相册已删除，照片仍保留。");
              }
            }}
          >
            {confirmDelete ? "确认删除相册" : "删除相册"}
          </button>
        </div>
      )}
      {!!data.albums.length && !album && (
        <label className="album-target">
          <span>添加到相册</span>
          <span className="album-select-wrap">
            <select value={chosenTarget} onChange={(e) => setTarget(e.target.value)}>
              {data.albums.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
      )}
      {!visible.length && (
        <div className="empty-state">
          <Images size={30} strokeWidth={1.2} />
          <h3>{ready ? "还没有照片" : "正在读取…"}</h3>
          <p>上传照片，或从手记和首页整理照片。</p>
        </div>
      )}
      {Object.entries(groups)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => (
          <section className="album-month" key={month}>
            <div className="section-heading">
              <h2>
                {month === "其他照片"
                  ? month
                  : `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`}
              </h2>
              <span className="muted small">{items.length} 张</span>
            </div>
            <div className="album-grid">
              {items.map((photo) => (
                <div className="album-photo" key={photo.image}>
                  <button
                    className="album-image-button"
                    type="button"
                    onClick={() => setView(photo)}
                    aria-label={photo.memory ? `查看手记：${photo.memory.title}` : "查看照片"}
                  >
                    <img src={photo.image} alt={photo.memory?.title || "相册照片"} loading="lazy" />
                  </button>
                  <div className="album-photo-meta">
                    <span>
                      {photo.memory?.title ||
                        (photo.image === data.settings.coverImage ? "首页照片" : "相册照片")}
                    </span>
                    {album ? (
                      <button
                        type="button"
                        className="text-button muted"
                        disabled={saving}
                        onClick={() => void setAlbumImage(album.id, photo.image, false)}
                      >
                        移出
                      </button>
                    ) : (
                      <div className="album-photo-actions">
                        {chosenTarget && (
                          <button
                            type="button"
                            className="text-button"
                            disabled={
                              saving ||
                              data.albums
                                .find((a) => a.id === chosenTarget)
                                ?.images.includes(photo.image)
                            }
                            onClick={() => void setAlbumImage(chosenTarget, photo.image, true)}
                          >
                            {data.albums
                              .find((a) => a.id === chosenTarget)
                              ?.images.includes(photo.image)
                              ? "已添加"
                              : "添加"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-button danger"
                          disabled={saving || checkingDelete || uploading}
                          onClick={() => void checkDelete(photo.image)}
                          aria-label={`删除照片${photo.memory ? `：${photo.memory.title}` : ""}`}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      {deleteImpact && (
        <Modal open title="删除照片" onClose={() => setDeleteImpact(null)}>
          <div className="photo-delete-confirm">
            <p>删除后将无法恢复，并从以下位置移除：</p>
            <ul>
              <li>全部照片</li>
              {deleteImpact.cover && <li>首页封面</li>}
              {deleteImpact.memories.map((memory) => (
                <li key={memory.id}>手记：{memory.title}</li>
              ))}
              {deleteImpact.albums.map((item) => (
                <li key={item.id}>相册：{item.name}</li>
              ))}
            </ul>
            {deleteImpact.draftCount > 0 && (
              <p className="danger">
                这张照片正在 {deleteImpact.draftCount} 份手记草稿中使用。请先在草稿中移除后再删除。
              </p>
            )}
            <p className="muted small">手记和相册本身会保留。</p>
            <div className="form-actions">
              <button
                type="button"
                className="button button-quiet"
                disabled={saving}
                onClick={() => setDeleteImpact(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="button photo-delete-button"
                disabled={saving || deleteImpact.draftCount > 0}
                onClick={async () => {
                  const image = deleteImpact.image;
                  if (await deleteSharedPhoto(image, deleteImpact.fingerprint)) {
                    setDeleteImpact(null);
                    setView(null);
                  } else await checkDelete(image);
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </Modal>
      )}
      {view && detail && (
        <MemoryDetail
          memory={detail}
          initialImage={view.image}
          onClose={() => setView(null)}
          onEdit={() => {
            setEditor(detail);
            setView(null);
          }}
        />
      )}
      {view && !detail && (
        <Modal open title="照片" wide onClose={() => setView(null)}>
          <img className="detail-photo" src={view.image} alt="相册照片" />
        </Modal>
      )}
      {editor && <MemoryForm memory={editor} onClose={() => setEditor(null)} />}
    </AppShell>
  );
}
