import { ownerGate } from "@/lib/auth";
import { listAllEntries } from "@/lib/entries";

/**
 * Every entry as JSON. The browser turns it into the Markdown zip and pulls
 * photos through /api/photos, so a big export never hits the Worker's limits.
 */
export const GET = async (req: Request): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;
  try {
    return Response.json({ entries: await listAllEntries() }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("export failed", err);
    return Response.json({ error: "Couldn't gather your entries. Try again." }, { status: 500 });
  }
};
