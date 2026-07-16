export interface AuthenticatedUser {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium: boolean;
}
