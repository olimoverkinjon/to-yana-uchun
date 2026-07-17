import { NextResponse } from "next/server";

import { getPermissions } from "@/features/auth/api/permissions";
import { getSession } from "@/features/auth/api/session";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The client's single source of truth for "who am I and what may I do".
 * Permissions ride along with the session rather than sitting behind their
 * own endpoint, so a client never renders with one and not the other.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null, permissions: null }, { headers: NO_STORE });
  }

  const permissions = await getPermissions();
  return NextResponse.json({ user: session, permissions }, { headers: NO_STORE });
}
