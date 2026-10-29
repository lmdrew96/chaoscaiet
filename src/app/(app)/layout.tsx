import Link from "next/link";
import { redirect } from "next/navigation";
import { Hash, House } from "lucide-react";
import { ownerFromCookies } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { WriteButton } from "@/components/write-button";

// Every page in the app lives under this layout, so this check is what makes
// every route require sign-in. Only /login sits outside it.
const AppLayout = async ({ children }: LayoutProps<"/">): Promise<React.ReactNode> => {
  if (!(await ownerFromCookies())) redirect("/login");
  return (
    <>
      <header className="border-b border-hairline-ground px-4 py-2.5">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 max-[359px]:gap-2">
          <Link
            href="/"
            aria-label="ChaosCaiet, your dash"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded"
          >
            {/* Decorative: the link's label names it. A static asset, so no next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/chaoscaiet-logo.svg" alt="" aria-hidden="true" width={36} height={36} className="block" />
          </Link>
          {/* Five 44px icons and the logo only just fit at 320px, so the gaps go first. */}
          <nav className="flex items-center gap-1 max-[359px]:gap-0" aria-label="Main">
            <Link href="/" aria-label="Dash" className="nav-icon">
              <House size={24} strokeWidth={2} />
            </Link>
            <Link href="/tags" aria-label="Tags" className="nav-icon">
              <Hash size={24} strokeWidth={2} />
            </Link>
            <ThemeToggle />
            <LogoutButton />
            <WriteButton />
          </nav>
        </div>
      </header>
      {children}
    </>
  );
};

export default AppLayout;
