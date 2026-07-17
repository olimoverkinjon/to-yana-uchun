import type { Metadata } from "next";

import { GlobalSearch } from "@/features/search/components/global-search";

export const metadata: Metadata = {
  title: "Qidiruv — To'y Daftari",
};

export default function SearchPage() {
  return <GlobalSearch />;
}
