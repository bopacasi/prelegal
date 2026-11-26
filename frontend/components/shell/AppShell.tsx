import Link from "next/link";
import { SignOutButton } from "@/components/shell/SignOutButton";
import type { User } from "@/lib/api/client";

/** Header and frame around every signed-in page. */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/nda" className="font-semibold text-sky-800">
            Prelegal
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              Signed in as <span className="font-medium text-slate-900">{user.name}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
