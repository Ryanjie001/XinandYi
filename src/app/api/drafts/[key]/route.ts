import { actor, body, HttpError, json, mutationOrigin, route } from "@/lib/server/http";
import { validPhotos } from "@/lib/server/data";
import { database } from "@/lib/server/database";
import { draftInput } from "@/lib/server/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ key: string }> };
async function keyOf(context: Context) {
  const { key } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) throw new HttpError(400, "草稿不存在。");
  return key;
}
export function GET(request: Request, context: Context) {
  return route(async () => {
    const user = await actor(request),
      key = await keyOf(context);
    const draft = await database().memoryDraft.findUnique({
      where: { authorId_draftKey: { authorId: user.id, draftKey: key } },
    });
    return json(
      draft
        ? {
            title: draft.title,
            body: draft.body,
            date: draft.date,
            images: draft.images,
            updatedAt: draft.updatedAt.toISOString(),
          }
        : null,
    );
  });
}
export function PUT(request: Request, context: Context) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request),
      key = await keyOf(context),
      input = await body(request, draftInput);
    await database().$transaction(async (tx) => {
      if (key !== "new") {
        const memory = await tx.memory.findUnique({
          where: { id: key },
          select: { authorId: true },
        });
        if (!memory || memory.authorId !== user.id)
          throw new HttpError(403, "只能编辑自己的手记。");
      }
      const photoIds = await validPhotos(tx, input.images, user);
      const draft = await tx.memoryDraft.upsert({
        where: { authorId_draftKey: { authorId: user.id, draftKey: key } },
        create: { ...input, authorId: user.id, draftKey: key },
        update: input,
      });
      await tx.draftPhoto.deleteMany({ where: { draftId: draft.id } });
      if (photoIds.length)
        await tx.draftPhoto.createMany({
          data: photoIds.map((photoId) => ({ draftId: draft.id, photoId })),
        });
    });
    return json({ saved: true });
  });
}
export function DELETE(request: Request, context: Context) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request),
      key = await keyOf(context);
    await database().memoryDraft.deleteMany({ where: { authorId: user.id, draftKey: key } });
    return json({ deleted: true });
  });
}
