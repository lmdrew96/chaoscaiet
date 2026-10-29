import { ownerGate } from "@/lib/auth";
import { MISSING_PHOTO, createEntry, isMissingPhoto } from "@/lib/entries";
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

  try {
    if (await isMissingPhoto(result.value)) return Response.json({ error: MISSING_PHOTO }, { status: 400 });
    return Response.json({ entry: await createEntry(result.value) }, { status: 201 });
  } catch (err) {
    console.error("create entry failed", err);
    return Response.json({ error: "Couldn't save that. Your text is still here; try again." }, { status: 500 });
  }
};
