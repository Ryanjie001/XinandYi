import { actor, route, HttpError } from "@/lib/server/http";
import { database } from "@/lib/server/database";
import { authorizedLetter } from "@/lib/server/letters";
import { storage } from "@/lib/server/storage";
export const runtime = "nodejs";
export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  return route(async () => {
    const user = await actor(request),
      { id, photoId } = await params;
    await authorizedLetter(id, user.id);
    const linked = await database().letterPhoto.findUnique({
      where: { letterId_photoId: { letterId: id, photoId } },
      include: { photo: true },
    });
    if (!linked || linked.photo.status !== "ready") throw new HttpError(404, "照片不存在。");
    const photo = linked.photo;
    const location = await storage().getObjectUrl({
      Bucket: photo.bucket,
      Region: photo.region,
      Key: photo.objectKey,
      Sign: true,
      Expires: 60,
      Protocol: "https:",
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: location,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        Vary: "Cookie",
      },
    });
  });
}
