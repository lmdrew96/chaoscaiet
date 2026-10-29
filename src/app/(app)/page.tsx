import { Lock, PenLine } from "lucide-react";
import { PostTypeBar } from "@/components/post-type-bar";

const DashPage = (): React.ReactNode => (
  <div className="mx-auto flex max-w-[960px] flex-wrap items-start gap-8 px-4 pt-7 pb-12">
    <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="side-square max-sm:hidden" aria-hidden="true">
          <PenLine size={28} strokeWidth={2} />
        </div>
        <div className="card min-w-0 flex-auto">
          <PostTypeBar />
        </div>
      </div>
      {/* The feed goes here. With no entries there's nothing to show, and nothing scolds. */}
    </main>

    <aside className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-6 text-on-ground">
      <p className="m-0 flex items-center gap-1.5 text-xs">
        <Lock size={12} strokeWidth={2} aria-hidden="true" />
        private · only you can see this
      </p>
    </aside>
  </div>
);

export default DashPage;
