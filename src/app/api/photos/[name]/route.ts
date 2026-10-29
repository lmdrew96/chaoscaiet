import { ownerGate } from "@/lib/auth";
import { PHOTO_NAME_RE } from "@/lib/entry-fields";
import { getPhoto } from "@/lib/photos";

/**
 * Every photo read goes through here, behind the session check. The bucket
 * has no public access, so there is no URL that works without signing in.
 */
export const GET = async (req: Request, ctx: RouteContext<"/api/photos/[name]">): Promise<Response> => {
  const denied = await ownerGate(req);
  if (denied) return denied;
  const { name } = await ctx.params;
  if (!PHOTO_NAME_RE.test(name)) return new Response("Not found", { status: 404 });

  try {
    const object = await getPhoto(`photos/${name}`);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    // Keys are never reused, so the bytes behind one never change. "private"
    // keeps it out of any shared cache; only this browser keeps a copy.
    headers.set("cache-control", "private, max-age=31536000, immutable");
    if (req.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
    return new Response(object.body, { headers });
  } catch (err) {
    console.error("photo read failed", name, err);
    return new Response("Couldn't load that photo.", { status: 500 });
  }
};
