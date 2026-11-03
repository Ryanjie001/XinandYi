"use client";
import { useMemo, useState } from "react";
import { Images, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MemoryDetail, MemoryForm } from "@/components/forms";
import { Modal } from "@/components/ui";
import { useStore, type Memory } from "@/lib/store";

type PhotoEntry = { image: string; memory?: Memory; month: string };
export default function AlbumsPage() {
  const { data, ready, saving, notify, createAlbum, renameAlbum, deleteAlbum, setAlbumImage } =
    useStore();
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
    for (const group of data.albums)
      for (const image of group.images)
        if (!items.has(image)) items.set(image, { image, month: "其他照片" });
    return [...items.values()];
  }, [data.memories, data.settings.coverImage, data.albums]);
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
          <p className="muted">按手记日期浏览，也可以整理到相册。</p>
        </div>
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
      {!!data.albums.length && (
        <label className="album-target">
          添加到相册{" "}
          <select value={chosenTarget} onChange={(e) => setTarget(e.target.value)}>
            {data.albums.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!visible.length && (
        <div className="empty-state">
          <Images size={30} strokeWidth={1.2} />
          <h3>{ready ? "还没有照片" : "正在读取…"}</h3>
          <p>手记或首页中的照片会显示在这里。</p>
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
                    <span>{photo.memory?.title || "首页照片"}</span>
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
                      chosenTarget && (
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
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
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
