import { actor, mutationOrigin, body, route, json, HttpError } from "@/lib/server/http";
import {
  state,
  changeSettings,
  createMemory,
  changeMemory,
  createWish,
  changeWish,
  recordWish,
} from "@/lib/server/data";
import {
  memoryInput,
  memoryUpdate,
  settingsInput,
  wishInput,
  wishUpdate,
  recordInput,
  versionInput,
} from "@/lib/server/validation";
export const runtime = "nodejs";
function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request);
    const path = (await params).path,
      [resource, id, action] = path,
      method = request.method;
    if (path.length > 3) throw new HttpError(404, "接口不存在。");
    if (resource === "settings" && path.length === 1 && method === "PATCH")
      await changeSettings(await body(request, settingsInput), user);
    else if (resource === "memories" && path.length === 1 && method === "POST")
      await createMemory(await body(request, memoryInput), user);
    else if (resource === "memories" && path.length === 2 && method === "PATCH")
      await changeMemory(id, await body(request, memoryUpdate), user);
    else if (resource === "memories" && path.length === 2 && method === "DELETE")
      await changeMemory(id, await body(request, versionInput), user, true);
    else if (resource === "wishes" && path.length === 1 && method === "POST")
      await createWish(await body(request, wishInput), user);
    else if (resource === "wishes" && path.length === 2 && method === "PATCH")
      await changeWish(id, await body(request, wishUpdate));
    else if (resource === "wishes" && path.length === 2 && method === "DELETE")
      await changeWish(id, await body(request, versionInput), true);
    else if (resource === "wishes" && path.length === 3 && action === "record" && method === "POST")
      await recordWish(id, await body(request, recordInput), user);
    else throw new HttpError(404, "接口不存在。");
    return json(await state(user));
  });
}
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
