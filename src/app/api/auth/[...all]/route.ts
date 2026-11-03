import { auth } from "@/lib/server/auth";
import { json, mutationOrigin, route, readBytes } from "@/lib/server/http";
const allowed = new Set([
  "sign-in/email",
  "sign-out",
  "get-session",
  "change-password",
  "list-sessions",
  "revoke-session",
  "revoke-other-sessions",
]);
export const runtime = "nodejs";
function handle(request: Request) {
  return route(async () => {
    const action = new URL(request.url).pathname.replace("/api/auth/", "");
    if (!allowed.has(action)) return json({ error: "此空间仅对新与怡开放。" }, 404);
    if (request.method !== "GET") {
      mutationOrigin(request);
      const bytes = await readBytes(request, 8192);
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: bytes,
      });
    }
    const response = await auth.handler(request);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
export const GET = handle;
export const POST = handle;
