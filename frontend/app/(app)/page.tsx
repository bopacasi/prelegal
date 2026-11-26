import { redirect } from "next/navigation";

/** The platform's home is the NDA creator, for now. */
export default function Home() {
  redirect("/nda");
}
