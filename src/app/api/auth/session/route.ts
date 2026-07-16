import { NextResponse } from "next/server";

import { getSession } from "@/features/auth/api/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}
