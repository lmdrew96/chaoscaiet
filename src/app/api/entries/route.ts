import { ownerGate } from "@/lib/auth";
import { MISSING_PHOTO, createEntry, entryExists, isMissingPhoto, isUuid } from "@/lib/entries";
import { validateEntry } from "@/lib/entry-fields";

export const POST = async (req: Request): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const result = validateEntry(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  // Adding a layer: the entry it goes on top of.
  const layerOf = (body as { layerOf?: unknown }).layerOf;
  if (layerOf !== undefined && (typeof layerOf !== "string" || !isUuid(layerOf))) {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    if (await isMissingPhoto(result.value)) return Response.json({ error: MISSING_PHOTO }, { status: 400 });
    if (layerOf && !(await entryExists(layerOf))) {
      return Response.json({ error: "The entry you're adding a layer to isn't here anymore." }, { status: 404 });
    }
    return Response.json({ entry: await createEntry(result.value, layerOf) }, { status: 201 });
  } catch (err) {
    console.error("create entry failed", err);
    return Response.json({ error: "Couldn't save that. Your text is still here; try again." }, { status: 500 });
  }
};
