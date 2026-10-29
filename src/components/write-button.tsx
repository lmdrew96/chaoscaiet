"use client";

import { usePathname, useRouter } from "next/navigation";
import { PenLine } from "lucide-react";

/** The sage write button: opens compose on the dash, or goes there with it open. */
export const WriteButton = (): React.ReactNode => {
  const pathname = usePathname();
  const router = useRouter();
  const write = (): void => {
    if (pathname === "/") window.dispatchEvent(new Event("caiet:write"));
    else router.push("/?write");
  };
  return (
    <button
      type="button"
      onClick={write}
      aria-label="Write an entry"
      className="ml-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-accent text-[var(--indigo-void)]"
    >
      <PenLine size={22} strokeWidth={2} />
    </button>
  );
};
