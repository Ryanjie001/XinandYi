import { createHash } from "node:crypto";
import { z } from "zod";
import { actor, body, json, mutationOrigin, route } from "@/lib/server/http";
import { memoryInput, wishInput, settingsInput } from "@/lib/server/validation";
import { state, validPhotos, links } from "@/lib/server/data";
import { database } from "@/lib/server/database";
const person = z.enum(["新", "怡"]),
  id = z.string().min(1).max(64);
const schema = z.object({
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  settings: settingsInput.omit({ version: true }),
  memories: z.array(memoryInput.extend({ id, author: person, wishId: id.optional() })).max(2000),
  wishes: z
    .array(
      wishInput.extend({
        id,
        author: person,
        completedAt: z.union([memoryInput.shape.date, z.null()]),
      }),
    )
    .max(2000),
});
export const runtime = "nodejs";
const mapped = (type: string, id: string) =>
  "import-" +
  createHash("sha256")
    .update(type + ":" + id)
    .digest("hex")
    .slice(0, 40);
export function POST(request: Request) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request),
      input = await body(request, schema, 2 * 1024 * 1024);
    await database().$transaction(
      async (tx) => {
        const existing = await tx.importBatch.findUnique({ where: { hash: input.sourceHash } });
        if (existing) return;
        for (const w of input.wishes) {
          const { author, id, ...fields } = w;
          await tx.wish.upsert({
            where: { id: mapped("wish", id) },
            create: { id: mapped("wish", id), ...fields, authorId: author === "新" ? "xin" : "yi" },
            update: {},
          });
        }
        for (const m of input.memories) {
          const { author, id, wishId, ...fields } = m,
            mid = mapped("memory", id);
          if (await tx.memory.findUnique({ where: { id: mid } })) continue;
          const photoIds = await validPhotos(tx, m.images, user);
          const linked =
            wishId && input.wishes.some((w) => w.id === wishId) ? mapped("wish", wishId) : null;
          await tx.memory.create({
            data: { id: mid, ...fields, authorId: author === "新" ? "xin" : "yi", wishId: linked },
          });
          await links(tx, mid, photoIds);
        }
        const settings = await tx.coupleSettings.findUniqueOrThrow({ where: { id: "us" } });
        // Existing shared settings take priority over older browser settings.
        if (
          !settings.startDate &&
          !settings.xinBirthday &&
          !settings.yiBirthday &&
          !settings.xinLunarBirthday &&
          !settings.yiLunarBirthday &&
          !settings.coverImage
        ) {
          const p = await validPhotos(
            tx,
            input.settings.coverImage ? [input.settings.coverImage] : [],
            user,
          );
          await tx.coupleSettings.update({
            where: { id: "us" },
            data: { ...input.settings, coverPhotoId: p[0] || null, version: { increment: 1 } },
          });
        }
        await tx.importBatch.create({ data: { hash: input.sourceHash, actorId: user.id } });
      },
      { timeout: 30000 },
    );
    return json(await state(user));
  });
}
