import { deleteSharedPhoto } from "@/lib/server/photo-deletion";
import { actor, mutationOrigin, body, route, json, HttpError } from "@/lib/server/http";
import {
  state,
  changeSettings,
  createMemory,
  changeMemory,
  createWish,
  changeWish,
  recordWish,
  commentMemory,
  deleteComment,
  reactMemory,
  readMemory,
  createAlbum,
  renameAlbum,
  deleteAlbum,
  changeAlbumImage,
  addGalleryPhoto,
  addMoodComment,
  deleteMoodComment,
  saveMood,
  deleteMood,
  saveAnniversary,
  deleteAnniversary,
  sendLetter,
  deleteLetter,
} from "@/lib/server/data";
import {
  memoryInput,
  memoryUpdate,
  settingsInput,
  wishInput,
  wishUpdate,
  recordInput,
  versionInput,
  commentInput,
  reactionInput,
  albumInput,
  albumImageInput,
  galleryInput,
  photoDeletionInput,
  moodInput,
  anniversaryInput,
  letterInput,
} from "@/lib/server/validation";
export const runtime = "nodejs";
function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return route(async () => {
    mutationOrigin(request);
    const user = await actor(request);
    const path = (await params).path,
      [resource, id, action] = path,
      method = request.method;
    let storagePending = false;
    if (path.length > 4) throw new HttpError(404, "接口不存在。");
    if (resource === "anniversaries" && path.length === 1 && method === "POST")
      await saveAnniversary(await body(request, anniversaryInput));
    else if (resource === "anniversaries" && id && path.length === 2 && method === "PATCH")
      await saveAnniversary(await body(request, anniversaryInput), id);
    else if (resource === "anniversaries" && id && path.length === 2 && method === "DELETE")
      await deleteAnniversary(id, (await body(request, versionInput)).version);
    else if (resource === "letters" && path.length === 1 && method === "POST")
      await sendLetter(await body(request, letterInput), user);
    else if (resource === "letters" && id && path.length === 2 && method === "DELETE")
      await deleteLetter(id, user);
    else if (
      resource === "memories" &&
      id &&
      action === "comments" &&
      path.length === 3 &&
      method === "POST"
    )
      await commentMemory(id, (await body(request, commentInput)).body, user);
    else if (
      resource === "memories" &&
      id &&
      action === "comments" &&
      path.length === 4 &&
      method === "DELETE"
    )
      await deleteComment(id, path[3], user);
    else if (
      resource === "memories" &&
      id &&
      action === "reaction" &&
      path.length === 3 &&
      method === "PUT"
    )
      await reactMemory(id, (await body(request, reactionInput)).liked, user);
    else if (
      resource === "memories" &&
      id &&
      action === "read" &&
      path.length === 3 &&
      method === "POST"
    )
      await readMemory(id, user);
    else if (resource === "albums" && path.length === 1 && method === "POST")
      await createAlbum((await body(request, albumInput)).name);
    else if (resource === "albums" && id && path.length === 2 && method === "PATCH")
      await renameAlbum(id, (await body(request, albumInput)).name);
    else if (resource === "albums" && id && path.length === 2 && method === "DELETE")
      await deleteAlbum(id);
    else if (
      resource === "albums" &&
      id &&
      action === "images" &&
      path.length === 3 &&
      (method === "PUT" || method === "DELETE")
    )
      await changeAlbumImage(
        id,
        (await body(request, albumImageInput)).image,
        user,
        method === "PUT",
      );
    else if (resource === "photos" && id === "delete" && path.length === 2 && method === "POST") {
      const input = await body(request, photoDeletionInput);
      storagePending = (await deleteSharedPhoto(input.image, input.fingerprint, user))
        .storagePending;
    } else if (resource === "gallery" && path.length === 1 && method === "POST") {
      const input = await body(request, galleryInput);
      await addGalleryPhoto(input.image, input.albumId, user);
    } else if (
      resource === "moods" &&
      id &&
      action === "comments" &&
      path.length === 3 &&
      method === "POST"
    )
      await addMoodComment(id, (await body(request, commentInput)).body, user);
    else if (
      resource === "moods" &&
      id &&
      action === "comments" &&
      path.length === 4 &&
      method === "DELETE"
    )
      await deleteMoodComment(id, path[3], user);
    else if (resource === "moods" && path.length === 1 && method === "PUT")
      await saveMood(await body(request, moodInput), user);
    else if (resource === "moods" && id && path.length === 2 && method === "DELETE")
      await deleteMood(id, user);
    else if (resource === "settings" && path.length === 1 && method === "PATCH")
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
    return json({
      ...(await state(user)),
      ...(storagePending ? { warning: "照片已从页面移除，存储空间清理待重试。" } : {}),
    });
  });
}
export const PUT = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
