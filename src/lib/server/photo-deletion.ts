import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { database } from "./database";
import { HttpError } from "./http";
import { location, storage } from "./storage";

type Reader = Prisma.TransactionClient;
type User = { id: string; person: "新" | "怡" };

async function impact(db: Reader, image: string, user: User) {
  const id = image.startsWith("/api/photos/") ? image.slice(12) : null;
  const [settings, memories, albums, drafts, photo] = await Promise.all([
    db.coupleSettings.findUniqueOrThrow({ where: { id: "us" } }),
    db.memory.findMany({
      select: { id: true, title: true, version: true, images: true },
      orderBy: { id: "asc" },
    }),
    db.album.findMany({
      select: { id: true, name: true, items: { select: { image: true } } },
      orderBy: { id: "asc" },
    }),
    db.memoryDraft.findMany({
      select: { id: true, images: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    id
      ? db.photo.findUnique({
          where: { id },
          include: { gallery: true, _count: { select: { letterPhotos: true } } },
        })
      : null,
  ]);
  const hasImage = (images: Prisma.JsonValue) => Array.isArray(images) && images.includes(image);
  const affectedMemories = memories
    .filter((m) => hasImage(m.images))
    .map(({ id, title, version }) => ({ id, title, version }));
  const affectedAlbums = albums
    .filter((a) => a.items.some((item) => item.image === image))
    .map(({ id, name }) => ({ id, name }));
  const affectedDrafts = drafts
    .filter((d) => hasImage(d.images))
    .map((d) => ({ id: d.id, updatedAt: d.updatedAt.toISOString() }));
  const cover = settings.coverImage === image;
  const visible =
    cover || affectedMemories.length > 0 || affectedAlbums.length > 0 || !!photo?.gallery;
  if (!visible || (id && (!photo || photo.status !== "ready" || photo._count.letterPhotos)))
    throw new HttpError(404, "照片不存在或不可删除。");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        image,
        memories: affectedMemories,
        albums: affectedAlbums,
        drafts: affectedDrafts,
        cover,
        settingsVersion: cover ? settings.version : null,
        gallery: !!photo?.gallery,
      }),
    )
    .digest("hex");
  return {
    image,
    memories: affectedMemories,
    albums: affectedAlbums,
    cover,
    draftCount: affectedDrafts.length,
    fingerprint,
  };
}

export async function photoDeletionImpact(image: string, user: User) {
  return impact(database(), image, user);
}

export async function deleteSharedPhoto(image: string, fingerprint: string, user: User) {
  const photoId = image.startsWith("/api/photos/") ? image.slice(12) : null;
  const object = await database().$transaction(
    async (tx) => {
      // Lock the current references before checking the confirmation snapshot.
      await tx.$queryRaw`SELECT id FROM memory ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM album ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM couple_settings ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM memory_draft ORDER BY id FOR UPDATE`;
      if (photoId) await tx.$queryRaw`SELECT id FROM photo WHERE id = ${photoId} FOR UPDATE`;
      const current = await impact(tx, image, user);
      if (current.fingerprint !== fingerprint)
        throw new HttpError(409, "照片关联已变化，请重新查看并确认。");
      if (current.draftCount)
        throw new HttpError(409, "照片正在手记草稿中使用，请先在草稿中移除。 ");
      let object: { bucket: string; region: string; objectKey: string } | null = null;
      if (photoId) {
        const photo = await tx.photo.findUniqueOrThrow({ where: { id: photoId } });
        const expected = location();
        if (
          photo.bucket !== expected.Bucket ||
          photo.region !== expected.Region ||
          photo.objectKey !== `${expected.prefix}/photos/${photoId}.jpg`
        )
          throw new HttpError(400, "照片存储位置不匹配，无法删除。 ");
        object = { bucket: photo.bucket, region: photo.region, objectKey: photo.objectKey };
        await tx.photo.update({ where: { id: photoId }, data: { status: "deleting" } });
      }
      for (const memory of current.memories) {
        const row = await tx.memory.findUniqueOrThrow({ where: { id: memory.id } });
        const images = Array.isArray(row.images)
          ? row.images.filter((entry) => entry !== image)
          : [];
        await tx.memory.update({
          where: { id: memory.id },
          data: { images, version: { increment: 1 } },
        });
      }
      if (photoId) {
        await tx.memoryPhoto.deleteMany({ where: { photoId } });
        await tx.galleryPhoto.deleteMany({ where: { photoId } });
      }
      await tx.albumItem.deleteMany({ where: { image } });
      if (current.cover)
        await tx.coupleSettings.update({
          where: { id: "us" },
          data: { coverImage: "", coverPhotoId: null, version: { increment: 1 } },
        });
      return object;
    },
    { maxWait: 10000, timeout: 20000 },
  );
  if (!photoId || !object) return { storagePending: false };
  try {
    await storage().deleteObject({
      Bucket: object.bucket,
      Region: object.region,
      Key: object.objectKey,
    });
    await database().photo.delete({ where: { id: photoId } });
    return { storagePending: false };
  } catch {
    console.error("Photo storage deletion pending:", photoId);
    return { storagePending: true };
  }
}
