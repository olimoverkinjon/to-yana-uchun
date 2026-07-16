import type { Metadata } from "next";

import { GlobalSearch } from "@/features/search/components/global-search";

export const metadata: Metadata = {
  title: "Search — Wedding Registry",
};

export default function SearchPage() {
  return <GlobalSearch />;
}
