import { AuthGate } from "@/features/auth";

export default function RootPage() {
  return <AuthGate />;
}
