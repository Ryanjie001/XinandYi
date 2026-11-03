import "server-only";
import { database } from "./database";
import { HttpError } from "./http";
import { today } from "@/lib/dates";

export async function authorizedLetter(id: string, userId: string) {
  const letter = await database().futureLetter.findUnique({
    where: { id },
    select: { authorId: true, recipientId: true, unlockDate: true },
  });
  if (!letter || (letter.authorId !== userId && letter.recipientId !== userId))
    throw new HttpError(404, "信件不存在。");
  if (letter.authorId !== userId && letter.unlockDate > today())
    throw new HttpError(403, "还没到开启日期。");
  return letter;
}
