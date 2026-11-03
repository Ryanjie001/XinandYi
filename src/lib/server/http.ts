import "server-only";
import { auth, appOrigin } from "@/lib/server/auth";
import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function actor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !["xin", "yi"].includes(session.user.id))
    throw new HttpError(401, "请先登录我们的空间。");
  return { id: session.user.id, person: (session.user.id === "xin" ? "新" : "怡") as "新" | "怡" };
}
export function mutationOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin)
    throw new HttpError(403, "请求来源无效，请刷新页面后重试。");
}
export async function readBytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new HttpError(413, "提交内容过大。");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "提交内容不能为空。");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new HttpError(413, "提交内容过大。");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function body<T>(request: Request, schema: z.ZodType<T>, max = 65536): Promise<T> {
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    throw new HttpError(415, "请使用 JSON 格式提交。");
  let data: unknown;
  try {
    data = JSON.parse((await readBytes(request, max)).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "提交格式不正确。");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new HttpError(400, parsed.error.issues[0]?.message || "请检查填写内容。");
  return parsed.data;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export async function route(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const code = (error as { code?: string })?.code;
    if (code === "P2002") return json({ error: "这条记录已存在，请刷新页面。" }, 409);
    if (code === "P2025") return json({ error: "记录已更新或不存在，请刷新后重试。" }, 409);
    console.error(
      "Request failed:",
      code || (error instanceof Error ? error.name : "UnknownError"),
    );
    return json({ error: "暂时无法保存，请稍后重试；当前填写内容仍保留。" }, 503);
  }
}
