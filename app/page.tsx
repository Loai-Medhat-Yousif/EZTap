import { redirect } from "next/navigation";

// EZTab has no public marketing site (see product spec: no landing page,
// no pricing page). `/` just forwards into the product. Once Stage 3
// (auth) lands, /admin itself redirects to /login when unauthenticated.
export default function RootPage() {
  redirect("/admin");
}
