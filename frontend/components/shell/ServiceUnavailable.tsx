/** Shown instead of a signed-in page when the backend can't be reached. */
export function ServiceUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div role="alert" className="max-w-sm rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">Prelegal is temporarily unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">Please try again in a moment.</p>
      </div>
    </main>
  );
}
