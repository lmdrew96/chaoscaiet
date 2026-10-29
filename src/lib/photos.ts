import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PHOTO_TYPES } from "./entry-fields";

/** The private bucket, through the Worker binding. `next dev` serves a local simulation. */
const bucket = async (): Promise<R2Bucket> => (await getCloudflareContext({ async: true })).env.PHOTOS;

/**
 * The real type from the file's first bytes, so a mislabelled upload can't be
 * stored as something it isn't. Null when it isn't an image the bucket takes.
 */
export const sniffPhotoType = (bytes: Uint8Array): string | null => {
  const at = (i: number, ...sig: number[]): boolean => sig.every((b, j) => bytes[i + j] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
};

/** HEIC/HEIF carry "ftyp" at byte 4 followed by one of these brands. */
export const looksHeic = (bytes: Uint8Array): boolean => {
  if (!(bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70)) return false;
  const brand = String.fromCharCode(...bytes.slice(8, 12));
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand);
};

export const putPhoto = async (bytes: Uint8Array, contentType: string): Promise<string> => {
  const key = `photos/${crypto.randomUUID()}.${PHOTO_TYPES[contentType]}`;
  await (await bucket()).put(key, bytes, { httpMetadata: { contentType } });
  return key;
};

export const photoExists = async (key: string): Promise<boolean> => (await (await bucket()).head(key)) !== null;

export const getPhoto = async (key: string): Promise<R2ObjectBody | null> => (await bucket()).get(key);

/**
 * Best effort: the entry is already gone or changed, so a failure here leaves
 * an unreferenced object rather than breaking anything. Logged, not thrown.
 */
export const deletePhoto = async (key: string): Promise<void> => {
  try {
    await (await bucket()).delete(key);
  } catch (err) {
    console.error("photo delete failed", key, err);
  }
};
