import { z } from "zod";
import { today } from "@/lib/dates";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期。")
  .refine((value) => {
    const parsed = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= today()
    );
  }, "日期不正确或晚于今天。");
export const image = z
  .string()
  .max(255)
  .refine(
    (value) =>
      ["/images/sea.jpg", "/images/cafe.jpg", "/images/forest.jpg"].includes(value) ||
      /^\/api\/photos\/[a-f0-9-]{36}$/.test(value),
    "请重新上传照片。",
  );
export const memoryInput = z.object({
  title: z.string().trim().min(1).max(60),
  body: z.string().trim().max(5000),
  date,
  images: z.array(image).max(3),
});
export const memoryUpdate = memoryInput.extend({ version: z.number().int().positive() });
export const settingsInput = z.object({
  startDate: z.union([date, z.literal("")]),
  xinBirthday: z.union([date, z.literal("")]),
  yiBirthday: z.union([date, z.literal("")]),
  coverImage: z.union([image, z.literal("")]),
  version: z.number().int().positive(),
});
export const wishInput = z.object({
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(1000),
  category: z.enum(["小日常", "去远方", "小浪漫", "慢慢来"]),
});
export const wishUpdate = z.union([
  wishInput.extend({ version: z.number().int().positive() }),
  z.object({ action: z.literal("toggle"), version: z.number().int().positive() }),
]);
export const recordInput = z.object({
  note: z.string().trim().max(5000),
  images: z.array(image).max(3),
});
export const versionInput = z.object({ version: z.number().int().positive() });
