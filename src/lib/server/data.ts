import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "./database";
import { HttpError } from "./http";
import { today } from "@/lib/dates";
type Tx = Prisma.TransactionClient;
type Actor = { id: string; person: "新" | "怡" };
export async function state(user: Actor) {
  const [settings, memories, wishes] = await database().$transaction([
    database().coupleSettings.findUniqueOrThrow({ where: { id: "us" } }),
    database().memory.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    database().wish.findMany({
      include: { memory: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    version: 1,
    person: user.person,
    storageReady: true,
    settings: {
      startDate: settings.startDate,
      xinBirthday: settings.xinBirthday,
      yiBirthday: settings.yiBirthday,
      xinLunarBirthday: settings.xinLunarBirthday,
      yiLunarBirthday: settings.yiLunarBirthday,
      xinLunarLeap: settings.xinLunarLeap,
      yiLunarLeap: settings.yiLunarLeap,
      xinBirthdayCalendar: settings.xinBirthdayCalendar as "solar" | "lunar",
      yiBirthdayCalendar: settings.yiBirthdayCalendar as "solar" | "lunar",
      coverImage: settings.coverImage,
      version: settings.version,
    },
    memories: memories.map((m) => ({
      id: m.id,
      title: m.title,
      body: m.body,
      date: m.date,
      images: m.images,
      author: m.authorId === "xin" ? "新" : "怡",
      demo: m.demo,
      wishId: m.wishId || undefined,
      version: m.version,
    })),
    wishes: wishes.map((w) => ({
      id: w.id,
      title: w.title,
      note: w.note,
      category: w.category,
      author: w.authorId === "xin" ? "新" : "怡",
      completedAt: w.completedAt,
      memoryId: w.memory?.id,
      demo: w.demo,
      version: w.version,
    })),
  };
}
function ids(images: string[]) {
  return [...new Set(images.filter((x) => x.startsWith("/api/photos/")).map((x) => x.slice(12)))];
}
export async function validPhotos(tx: Tx, images: string[], user: Actor) {
  const photoIds = ids(images);
  for (const id of photoIds) {
    await tx.$queryRaw`SELECT id FROM photo WHERE id = ${id} FOR UPDATE`;
    const p = await tx.photo.findUnique({
      where: { id },
      include: { _count: { select: { memories: true, covers: true } } },
    });
    if (
      !p ||
      p.status !== "ready" ||
      (p.ownerId !== user.id && !p._count.memories && !p._count.covers)
    )
      throw new HttpError(400, "照片不可用，请重新上传。");
  }
  return photoIds;
}
export async function links(tx: Tx, memoryId: string, photoIds: string[]) {
  await tx.memoryPhoto.deleteMany({ where: { memoryId } });
  if (photoIds.length)
    await tx.memoryPhoto.createMany({ data: photoIds.map((photoId) => ({ memoryId, photoId })) });
}
const conflict = () =>
  new HttpError(409, "这条记录已被更新。列表已刷新，请核对后重新打开编辑；当前填写内容仍保留。");
export async function changeSettings(
  input: {
    startDate: string;
    xinBirthday: string;
    yiBirthday: string;
    xinLunarBirthday: string;
    yiLunarBirthday: string;
    xinLunarLeap: boolean;
    yiLunarLeap: boolean;
    xinBirthdayCalendar: "solar" | "lunar";
    yiBirthdayCalendar: "solar" | "lunar";
    coverImage: string;
    version: number;
  },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    const photoIds = await validPhotos(tx, input.coverImage ? [input.coverImage] : [], user);
    const { version, ...fields } = input;
    const result = await tx.coupleSettings.updateMany({
      where: { id: "us", version },
      data: { ...fields, coverPhotoId: photoIds[0] || null, version: { increment: 1 } },
    });
    if (!result.count) throw conflict();
  });
}
export async function createMemory(
  input: { title: string; body: string; date: string; images: string[] },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    const photoIds = await validPhotos(tx, input.images, user);
    const m = await tx.memory.create({ data: { ...input, authorId: user.id } });
    await links(tx, m.id, photoIds);
  });
}
export async function changeMemory(
  id: string,
  input: { version: number; title?: string; body?: string; date?: string; images?: string[] },
  user: Actor,
  remove = false,
) {
  await database().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM memory WHERE id = ${id} FOR UPDATE`;
    const old = await tx.memory.findUnique({ where: { id } });
    if (!old) throw new HttpError(404, "手记不存在。");
    if (old.authorId !== user.id) throw new HttpError(403, "只能编辑或删除自己发布的手记。");
    if (old.version !== input.version) throw conflict();
    if (remove) {
      await tx.memory.delete({ where: { id } });
      return;
    }
    const photoIds = await validPhotos(tx, input.images!, user);
    const { version, ...fields } = input;
    await tx.memory.update({
      where: { id },
      data: { ...fields, demo: false, version: { increment: 1 } },
    });
    await links(tx, id, photoIds);
  });
}
export async function createWish(
  input: { title: string; note: string; category: string },
  user: Actor,
) {
  await database().wish.create({ data: { ...input, authorId: user.id } });
}
export async function changeWish(
  id: string,
  input: { version: number; action?: "toggle"; title?: string; note?: string; category?: string },
  remove = false,
) {
  await database().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM wish WHERE id = ${id} FOR UPDATE`;
    const old = await tx.wish.findUnique({ where: { id } });
    if (!old) throw new HttpError(404, "愿望不存在。");
    if (old.version !== input.version) throw conflict();
    if (remove) {
      await tx.wish.delete({ where: { id } });
      return;
    }
    const { version, action, ...fields } = input;
    await tx.wish.update({
      where: { id },
      data: action
        ? { completedAt: old.completedAt ? null : today(), version: { increment: 1 } }
        : { ...fields, demo: false, version: { increment: 1 } },
    });
  });
}
export async function recordWish(
  id: string,
  input: { note: string; images: string[] },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM wish WHERE id = ${id} FOR UPDATE`;
    const wish = await tx.wish.findUnique({
      where: { id },
      include: { memory: { select: { id: true } } },
    });
    if (!wish) throw new HttpError(404, "愿望不存在。");
    if (wish.memory) return;
    const photoIds = await validPhotos(tx, input.images, user);
    const date = wish.completedAt || today();
    const m = await tx.memory.create({
      data: {
        title: wish.title,
        body: input.note || wish.note,
        date,
        images: input.images,
        authorId: user.id,
        wishId: id,
      },
    });
    await links(tx, m.id, photoIds);
    await tx.wish.update({ where: { id }, data: { completedAt: date, version: { increment: 1 } } });
  });
}
