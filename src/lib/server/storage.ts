import "server-only";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { database } from "./database";
import { HttpError } from "./http";
let client: COS;
export function storage() {
  return (client ||= new COS({
    SecretId: process.env.COS_SECRET_ID!,
    SecretKey: process.env.COS_SECRET_KEY!,
    Timeout: 20000,
  }));
}
export function location() {
  const Bucket = process.env.COS_BUCKET!;
  const Region = process.env.COS_REGION!;
  const prefix = (process.env.COS_PREFIX || "xinanyi/development").replace(/^\/+|\/+$/g, "");
  if (!Bucket || !Region || !prefix.startsWith("xinanyi/"))
    throw new Error("Storage configuration missing.");
  return { Bucket, Region, prefix };
}
export async function uploadPhoto(bytes: Buffer, ownerId: string) {
  let encoded: Buffer;
  let width: number, height: number;
  try {
    const out = await sharp(bytes, { limitInputPixels: 40_000_000, animated: false })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    encoded = out.data;
    width = out.info.width;
    height = out.info.height;
  } catch {
    throw new HttpError(400, "无法读取这张照片，请选择有效的 JPG、PNG、WebP 或 GIF 图片。");
  }
  const { Bucket, Region, prefix } = location(),
    id = randomUUID(),
    Key = prefix + "/photos/" + id + ".jpg";
  await storage().putObject({
    Bucket,
    Region,
    Key,
    Body: encoded,
    ContentType: "image/jpeg",
    ACL: "private",
  });
  try {
    await database().photo.create({
      data: {
        id,
        objectKey: Key,
        bucket: Bucket,
        region: Region,
        contentType: "image/jpeg",
        bytes: encoded.length,
        width,
        height,
        ownerId,
      },
    });
  } catch (error) {
    await storage()
      .deleteObject({ Bucket, Region, Key })
      .catch(() => console.error("Photo rollback pending:", id));
    throw error;
  }
  return "/api/photos/" + id;
}
export async function photoUrl(id: string, ownerId: string) {
  const photo = await database().photo.findUnique({
    where: { id },
    include: {
      gallery: true,
      _count: { select: { memories: true, covers: true, albumItems: true } },
    },
  });
  if (
    !photo ||
    photo.status !== "ready" ||
    (photo.ownerId !== ownerId &&
      !photo._count.memories &&
      !photo._count.covers &&
      !photo._count.albumItems &&
      !photo.gallery)
  )
    throw new HttpError(404, "照片不存在。");
  const result = await storage().getObjectUrl({
    Bucket: photo.bucket,
    Region: photo.region,
    Key: photo.objectKey,
    Sign: true,
    Expires: 60,
    Protocol: "https:",
  });
  return result;
}
