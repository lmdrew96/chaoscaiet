"use client";

import { useEffect } from "react";

/** A failed load (database asleep, network blip) gets a retry instead of a blank 500. */
const AppError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode => {
  useEffect(() => {
    console.error("dash failed to load", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-[960px] px-4 pt-7">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="m-0 text-[15px]">Couldn&apos;t load your entries just now.</p>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 cursor-pointer rounded bg-accent px-5 text-sm font-semibold text-[var(--indigo-void)]"
        >
          try again
        </button>
      </div>
    </main>
  );
};

export default AppError;
