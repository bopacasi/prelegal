import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/config";

/** The platform has no start page of its own yet. */
export default function RootRedirect() {
  redirect(HOME_PATH);
}
