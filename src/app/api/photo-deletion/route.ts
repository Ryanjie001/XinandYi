import { actor, route, json, HttpError } from "@/lib/server/http";
import { image } from "@/lib/server/validation";
import { photoDeletionImpact } from "@/lib/server/photo-deletion";
export const runtime = "nodejs";
export function GET(request: Request) {
  return route(async () => {
    const user = await actor(request);
    const parsed = image.safeParse(new URL(request.url).searchParams.get("image"));
    if (!parsed.success) throw new HttpError(400, "照片地址无效。 ");
    return json(await photoDeletionImpact(parsed.data, user));
  });
}
