import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ServiceUnavailable } from "@/components/shell/ServiceUnavailable";
import { BackendUnavailableError, getCurrentUser } from "@/lib/api/server";
import type { User } from "@/lib/api/types";

/** The signed-in part of the platform. */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  let user: User | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof BackendUnavailableError) return <ServiceUnavailable />;
    throw error;
  }
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
