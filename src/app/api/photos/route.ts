import { actor, mutationOrigin, readBytes, route, json, HttpError } from "@/lib/server/http";
import { uploadPhoto } from "@/lib/server/storage";
export const runtime = "nodejs";
let active = 0;
export function POST(request: Request) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request);
    if (active >= 2) throw new HttpError(429, "照片正在上传，请稍后再试。");
    active++;
    try {
      const type = request.headers.get("content-type") || "";
      if (!type.startsWith("multipart/form-data")) throw new HttpError(415, "请选择照片上传。");
      const bytes = await readBytes(request, 12 * 1024 * 1024 + 65536);
      const form = await new Response(bytes, { headers: { "Content-Type": type } }).formData();
      const file = form.get("photo");
      if (
        !(file instanceof File) ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
      )
        throw new HttpError(400, "请选择 JPG、PNG、WebP 或 GIF 图片。");
      if (!file.size || file.size > 12 * 1024 * 1024)
        throw new HttpError(413, "单张照片请小于 12 MB。");
      return json(
        { image: await uploadPhoto(Buffer.from(await file.arrayBuffer()), user.id) },
        201,
      );
    } finally {
      active--;
    }
  });
}
