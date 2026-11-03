import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "./database";
import { HttpError } from "./http";
import { today } from "@/lib/dates";
type Tx = Prisma.TransactionClient;
type Actor = { id: string; person: "新" | "怡" };
export async function state(user: Actor) {
  const [settings, memories, wishes, albums, moods, anniversaries, letters] =
    await database().$transaction([
      database().coupleSettings.findUniqueOrThrow({ where: { id: "us" } }),
      database().memory.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          comments: { orderBy: { createdAt: "asc" } },
          reactions: true,
          reads: { where: { userId: user.id } },
        },
      }),
      database().wish.findMany({
        include: { memory: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
      }),
      database().album.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: { orderBy: { createdAt: "desc" } } },
      }),
      database().moodEntry.findMany({ orderBy: [{ date: "desc" }, { updatedAt: "desc" }] }),
      database().anniversary.findMany({ orderBy: { createdAt: "desc" } }),
      database().futureLetter.findMany({
        where: { OR: [{ authorId: user.id }, { recipientId: user.id }] },
        select: {
          id: true,
          authorId: true,
          recipientId: true,
          title: true,
          unlockDate: true,
          createdAt: true,
        },
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
      comments: m.comments.map((c) => ({
        id: c.id,
        author: c.authorId === "xin" ? "新" : "怡",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
      likes: m.reactions.map((r) => (r.userId === "xin" ? "新" : "怡")),
      unreadComments: m.comments.filter(
        (c) => c.authorId !== user.id && (!m.reads[0] || c.createdAt > m.reads[0].readAt),
      ).length,
    })),
    anniversaries: anniversaries.map(({ id, name, date, yearly, version }) => ({
      id,
      name,
      date,
      yearly,
      version,
    })),
    letters: letters.map((letter) => {
      const locked = letter.authorId !== user.id && letter.unlockDate > today();
      return {
        id: letter.id,
        author: letter.authorId === "xin" ? "新" : "怡",
        recipient: letter.recipientId === "xin" ? "新" : "怡",
        title: locked ? null : letter.title,
        unlockDate: letter.unlockDate,
        createdAt: letter.createdAt.toISOString(),
        locked,
      };
    }),
    albums: albums.map((a) => ({ id: a.id, name: a.name, images: a.items.map((i) => i.image) })),
    moods: moods.map((m) => ({
      id: m.id,
      author: m.authorId === "xin" ? "新" : "怡",
      date: m.date,
      mood: m.mood,
      note: m.note,
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
      include: {
        _count: { select: { memories: true, covers: true, albumItems: true, draftPhotos: true } },
      },
    });
    if (
      !p ||
      p.status !== "ready" ||
      (p.ownerId !== user.id && !p._count.memories && !p._count.covers && !p._count.albumItems)
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
  input: { title: string; body: string; date: string; images: string[]; draftKey?: string },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    const photoIds = await validPhotos(tx, input.images, user);
    const { draftKey, ...fields } = input;
    const m = await tx.memory.create({ data: { ...fields, authorId: user.id } });
    await links(tx, m.id, photoIds);
    if (draftKey === "new")
      await tx.memoryDraft.deleteMany({ where: { authorId: user.id, draftKey } });
  });
}
export async function changeMemory(
  id: string,
  input: {
    version: number;
    title?: string;
    body?: string;
    date?: string;
    images?: string[];
    draftKey?: string;
  },
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
      await tx.memoryDraft.deleteMany({ where: { authorId: user.id, draftKey: id } });
      await tx.memory.delete({ where: { id } });
      return;
    }
    const photoIds = await validPhotos(tx, input.images!, user);
    const { version, draftKey, ...fields } = input;
    await tx.memory.update({
      where: { id },
      data: { ...fields, demo: false, version: { increment: 1 } },
    });
    await links(tx, id, photoIds);
    if (draftKey === id)
      await tx.memoryDraft.deleteMany({ where: { authorId: user.id, draftKey } });
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

export async function commentMemory(id: string, body: string, user: Actor) {
  if (!(await database().memory.findUnique({ where: { id }, select: { id: true } })))
    throw new HttpError(404, "手记不存在。");
  await database().memoryComment.create({ data: { memoryId: id, authorId: user.id, body } });
}
export async function deleteComment(id: string, commentId: string, user: Actor) {
  const comment = await database().memoryComment.findFirst({
    where: { id: commentId, memoryId: id },
  });
  if (!comment) throw new HttpError(404, "留言不存在。");
  if (comment.authorId !== user.id) throw new HttpError(403, "只能删除自己的留言。");
  await database().memoryComment.delete({ where: { id: commentId } });
}
export async function reactMemory(id: string, liked: boolean, user: Actor) {
  if (!(await database().memory.findUnique({ where: { id }, select: { id: true } })))
    throw new HttpError(404, "手记不存在。");
  if (liked)
    await database().memoryReaction.upsert({
      where: { memoryId_userId: { memoryId: id, userId: user.id } },
      create: { memoryId: id, userId: user.id },
      update: {},
    });
  else await database().memoryReaction.deleteMany({ where: { memoryId: id, userId: user.id } });
}
export async function readMemory(id: string, user: Actor) {
  if (!(await database().memory.findUnique({ where: { id }, select: { id: true } })))
    throw new HttpError(404, "手记不存在。");
  await database().memoryRead.upsert({
    where: { memoryId_userId: { memoryId: id, userId: user.id } },
    create: { memoryId: id, userId: user.id },
    update: { readAt: new Date() },
  });
}
export async function createAlbum(name: string) {
  await database().album.create({ data: { name } });
}
export async function renameAlbum(id: string, name: string) {
  const r = await database().album.updateMany({ where: { id }, data: { name } });
  if (!r.count) throw new HttpError(404, "相册不存在。");
}
export async function deleteAlbum(id: string) {
  const r = await database().album.deleteMany({ where: { id } });
  if (!r.count) throw new HttpError(404, "相册不存在。");
}
export async function changeAlbumImage(id: string, image: string, user: Actor, add: boolean) {
  await database().$transaction(async (tx) => {
    if (!(await tx.album.findUnique({ where: { id }, select: { id: true } })))
      throw new HttpError(404, "相册不存在。");
    if (add) {
      const photos = await validPhotos(tx, [image], user);
      await tx.albumItem.upsert({
        where: { albumId_image: { albumId: id, image } },
        create: { albumId: id, image, photoId: photos[0] || null },
        update: {},
      });
    } else await tx.albumItem.deleteMany({ where: { albumId: id, image } });
  });
}
export async function saveMood(
  input: { date: string; mood: string; note: string; version?: number },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    const old = await tx.moodEntry.findUnique({
      where: { authorId_date: { authorId: user.id, date: input.date } },
    });
    if (old) {
      if (old.version !== input.version) throw conflict();
      const result = await tx.moodEntry.updateMany({
        where: { id: old.id, version: old.version },
        data: { mood: input.mood, note: input.note, version: { increment: 1 } },
      });
      if (!result.count) throw conflict();
    } else {
      if (input.version) throw conflict();
      await tx.moodEntry.create({
        data: { authorId: user.id, date: input.date, mood: input.mood, note: input.note },
      });
    }
  });
}
export async function deleteMood(id: string, user: Actor) {
  const mood = await database().moodEntry.findUnique({ where: { id } });
  if (!mood) throw new HttpError(404, "心情记录不存在。");
  if (mood.authorId !== user.id) throw new HttpError(403, "只能删除自己的心情记录。");
  await database().moodEntry.delete({ where: { id } });
}

export async function saveAnniversary(
  input: { name: string; date: string; yearly: boolean; version?: number },
  id?: string,
) {
  if (!id) {
    await database().anniversary.create({
      data: { name: input.name, date: input.date, yearly: input.yearly },
    });
    return;
  }
  if (!input.version) throw conflict();
  const result = await database().anniversary.updateMany({
    where: { id, version: input.version },
    data: { name: input.name, date: input.date, yearly: input.yearly, version: { increment: 1 } },
  });
  if (!result.count) throw conflict();
}
export async function deleteAnniversary(id: string, version: number) {
  const result = await database().anniversary.deleteMany({ where: { id, version } });
  if (!result.count) throw conflict();
}
export async function sendLetter(
  input: { title: string; body: string; unlockDate: string; images: string[] },
  user: Actor,
) {
  await database().$transaction(async (tx) => {
    const ids = [...new Set(input.images.map((image) => image.slice(12)))];
    for (const id of ids) {
      await tx.$queryRaw`SELECT id FROM photo WHERE id = ${id} FOR UPDATE`;
      const photo = await tx.photo.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              memories: true,
              covers: true,
              albumItems: true,
              draftPhotos: true,
              letterPhotos: true,
            },
          },
        },
      });
      if (
        !photo ||
        photo.status !== "ready" ||
        photo.ownerId !== user.id ||
        Object.values(photo._count).some(Boolean)
      )
        throw new HttpError(400, "请为信件重新上传未分享的照片。");
    }
    const letter = await tx.futureLetter.create({
      data: {
        authorId: user.id,
        recipientId: user.id === "xin" ? "yi" : "xin",
        title: input.title,
        body: input.body,
        unlockDate: input.unlockDate,
      },
    });
    if (ids.length)
      await tx.letterPhoto.createMany({
        data: ids.map((photoId, position) => ({ letterId: letter.id, photoId, position })),
      });
  });
}
export async function deleteLetter(id: string, user: Actor) {
  const letter = await database().futureLetter.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!letter) throw new HttpError(404, "信件不存在。");
  if (letter.authorId !== user.id) throw new HttpError(403, "只能删除自己写的信。");
  await database().futureLetter.delete({ where: { id } });
}
