import { ownerGate } from "@/lib/auth";
import { MAX_PHOTO_BYTES } from "@/lib/entry-fields";
import { looksHeic, putPhoto, sniffPhotoType } from "@/lib/photos";

const fail = (error: string, status: number): Response => Response.json({ error }, { status });

const TOO_BIG = "That photo is over 10 MB.";

/** Upload: the raw image as the body. Returns the key the photo entry stores. */
export const POST = async (req: Request): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;

  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return fail(TOO_BIG, 413);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await req.arrayBuffer());
  } catch {
    return fail("The upload didn't come through. Try again.", 400);
  }
  if (bytes.length === 0) return fail("That file is empty.", 400);
  if (bytes.length > MAX_PHOTO_BYTES) return fail(TOO_BIG, 413);

  if (looksHeic(bytes)) {
    return fail("That's a HEIC photo, which browsers can't show. Choose it again and it'll be converted to JPEG first.", 415);
  }
  const type = sniffPhotoType(bytes);
  if (!type) return fail("That isn't a photo ChaosCaiet can keep (JPEG, PNG, WebP or GIF).", 415);

  try {
    return Response.json({ key: await putPhoto(bytes, type) }, { status: 201 });
  } catch (err) {
    console.error("photo upload failed", err);
    return fail("Couldn't store that photo. Try again.", 500);
  }
};
