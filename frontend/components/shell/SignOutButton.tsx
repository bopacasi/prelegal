"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api/client";

/** Ends the session; stays put and shows an error if that fails. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setPending(true);
    setFailed(false);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {failed && (
        <span role="alert" className="text-red-700">
          Sign-out failed. Try again.
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md px-2 py-1 font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-60"
      >
        Sign out
      </button>
    </span>
  );
}
