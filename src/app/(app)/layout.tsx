import Link from "next/link";
import { redirect } from "next/navigation";
import { ownerFromCookies } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

// Every page in the app lives under this layout, so this check is what makes
// every route require sign-in. Only /login sits outside it.
const AppLayout = async ({ children }: LayoutProps<"/">): Promise<React.ReactNode> => {
  if (!(await ownerFromCookies())) redirect("/login");
  return (
    <>
      <header className="border-b border-hairline-ground px-4 py-2.5">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="ChaosCaiet, your dash"
            className="flex h-11 w-11 items-center justify-center rounded"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded bg-mark-bg font-serif text-xl font-semibold text-mark-fg"
            >
              c
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <ThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </>
  );
};

export default AppLayout;
