import { ownerGate } from "@/lib/auth";
import { MISSING_PHOTO, deleteEntry, isMissingPhoto, isUuid, updateEntry } from "@/lib/entries";
import { validateEntry } from "@/lib/entry-fields";

const notFound = (): Response => Response.json({ error: "That entry isn't here anymore." }, { status: 404 });

export const PATCH = async (req: Request, ctx: RouteContext<"/api/entries/[id]">): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

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
    const entry = await updateEntry(id, result.value);
    return entry ? Response.json({ entry }) : notFound();
  } catch (err) {
    console.error("update entry failed", err);
    return Response.json({ error: "Couldn't save that. Your text is still here; try again." }, { status: 500 });
  }
};

export const DELETE = async (req: Request, ctx: RouteContext<"/api/entries/[id]">): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  try {
    // ?scope=thread removes the whole chain shown on the card; the default removes just this entry.
    const scope = new URL(req.url).searchParams.get("scope") === "thread" ? "thread" : "one";
    return (await deleteEntry(id, scope)) ? Response.json({ ok: true }) : notFound();
  } catch (err) {
    console.error("delete entry failed", err);
    return Response.json({ error: "Couldn't delete that. Try again." }, { status: 500 });
  }
};
