import { actor, route, json } from "@/lib/server/http";
import { state } from "@/lib/server/data";
export const runtime = "nodejs";
export function GET(request: Request) {
  return route(async () => json(await state(await actor(request))));
}
