/** Where the Next.js server reaches the FastAPI backend. */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/** Name of the session cookie set by the backend on login. */
export const SESSION_COOKIE = "prelegal_session";
