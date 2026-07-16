export interface AuthenticatedUser {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium: boolean;
}

/**
 * Mirrors the database's my_permissions() RPC. Lives here rather than beside
 * the server-only function that resolves it, so client code can import the
 * type without dragging `server-only` into the browser bundle.
 */
export interface Permissions {
  isSuperAdmin: boolean;
  /** Has been granted any role — i.e. can see the ledger at all. */
  hasAccess: boolean;
  roles: string[];
}
