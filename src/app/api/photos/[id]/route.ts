import { actor, route } from "@/lib/server/http";
import { photoUrl } from "@/lib/server/storage";
export const runtime = "nodejs";
export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const user = await actor(request),
      { id } = await params;
    return new Response(null, {
      status: 302,
      headers: {
        Location: await photoUrl(id, user.id),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        Vary: "Cookie",
      },
    });
  });
}
