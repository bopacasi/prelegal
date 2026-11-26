import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login/LoginForm";
import { getCurrentUser } from "@/lib/api/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/nda");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Prelegal</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Demo sign-in: enter any name and email. There is no password yet.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
