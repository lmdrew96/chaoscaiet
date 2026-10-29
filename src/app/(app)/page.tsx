import Link from "next/link";
import { Lock, PenLine } from "lucide-react";
import { Composer } from "@/components/composer";
import { EntryCard } from "@/components/entry-card";
import { listFeed } from "@/lib/entries";
import { formatWhen, ownerTimeZone } from "@/lib/time";

const DashPage = async ({ searchParams }: PageProps<"/">): Promise<React.ReactNode> => {
  const sp = await searchParams;
  const beforeParam = typeof sp.before === "string" ? sp.before : undefined;
  const before = beforeParam && !Number.isNaN(Date.parse(beforeParam)) ? new Date(beforeParam) : undefined;
  const [{ entries, nextBefore }, tz] = await Promise.all([listFeed(before), ownerTimeZone()]);

  return (
    <div className="mx-auto flex max-w-[960px] flex-wrap items-start gap-8 px-4 pt-7 pb-12">
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="side-square max-sm:hidden" aria-hidden="true">
            <PenLine size={28} strokeWidth={2} />
          </div>
          <div className="card min-w-0 flex-auto overflow-hidden">
            <Composer startOpen={sp.write !== undefined} />
          </div>
        </div>

        {/* No entries means nothing here: no empty state, nothing that scolds. */}
        {entries.map((entry) => (
          <EntryCard key={`${entry.id}:${entry.updatedAt}`} entry={entry} when={formatWhen(entry.createdAt, tz)} />
        ))}

        {(nextBefore || before) && (
          <nav className="flex justify-between gap-4 pl-20 text-sm text-on-ground max-sm:pl-0" aria-label="Older and newer">
            {before ? (
              <Link href="/" className="flex min-h-11 items-center underline">
                back to newest
              </Link>
            ) : (
              <span />
            )}
            {nextBefore && (
              <Link href={`/?before=${encodeURIComponent(nextBefore)}`} className="flex min-h-11 items-center underline">
                older entries
              </Link>
            )}
          </nav>
        )}
      </main>

      <aside className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-6 text-on-ground">
        <p className="m-0 flex items-center gap-1.5 text-xs">
          <Lock size={12} strokeWidth={2} aria-hidden="true" />
          private · only you can see this
        </p>
      </aside>
    </div>
  );
};

export default DashPage;
