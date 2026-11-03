export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))
    throw new Error("请选择 JPG、PNG、WebP 或 GIF 图片。");
  if (file.size > 12 * 1024 * 1024) throw new Error("单张照片请小于 12 MB。");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理这张图片。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("照片压缩失败。"))),
        "image/jpeg",
        0.84,
      ),
    );
    const form = new FormData();
    form.set("photo", blob, "photo.jpg");
    const r = await fetch("/api/photos", { method: "POST", body: form }),
      value = await r.json();
    if (!r.ok) throw new Error(value.error || "照片上传失败，请重试。");
    return value.image;
  } finally {
    bitmap.close();
  }
}
