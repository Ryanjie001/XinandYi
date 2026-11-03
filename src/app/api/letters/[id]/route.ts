import { actor, json, route, HttpError } from "@/lib/server/http";
import { database } from "@/lib/server/database";
import { authorizedLetter } from "@/lib/server/letters";
export const runtime = "nodejs";
export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const user = await actor(request),
      { id } = await params;
    await authorizedLetter(id, user.id);
    const letter = await database().futureLetter.findUnique({
      where: { id },
      include: { photos: { orderBy: { position: "asc" } } },
    });
    if (!letter) throw new HttpError(404, "信件不存在。");
    return json({
      id: letter.id,
      title: letter.title,
      body: letter.body,
      unlockDate: letter.unlockDate,
      images: letter.photos.map((photo) => `/api/letters/${id}/photos/${photo.photoId}`),
    });
  });
}
