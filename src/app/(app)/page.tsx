import { PenLine } from "lucide-react";
import { Composer } from "@/components/composer";
import { Feed, parseBefore } from "@/components/feed";
import { Columns } from "@/components/rail";
import { listFeed, listTags } from "@/lib/entries";
import { ownerTimeZone } from "@/lib/time";

const DashPage = async ({ searchParams }: PageProps<"/">): Promise<React.ReactNode> => {
  const sp = await searchParams;
  const before = parseBefore(sp.before);
  const [{ entries, nextBefore }, tags, tz] = await Promise.all([listFeed({ before }), listTags(), ownerTimeZone()]);
  const knownTags = tags.map((t) => t.tag);

  return (
    <Columns tags={tags}>
      <div className="flex items-start gap-4">
        <div className="side-square max-sm:hidden" aria-hidden="true">
          <PenLine size={28} strokeWidth={2} />
        </div>
        <div className="card min-w-0 flex-auto">
          <Composer startOpen={sp.write !== undefined} knownTags={knownTags} />
        </div>
      </div>
      <Feed entries={entries} nextBefore={nextBefore} before={before} basePath="/" tz={tz} knownTags={knownTags} />
    </Columns>
  );
};

export default DashPage;
