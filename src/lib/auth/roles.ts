export const appRoles = ["customer", "artist", "admin"] as const;

export type AppRole = (typeof appRoles)[number];

export type AuthzProfile = {
  uid: string;
  role: AppRole;
  emailVerified: boolean;
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoles.includes(value as AppRole);
}

export function canAccessStaffArea(profile: AuthzProfile | null): boolean {
  if (!profile?.emailVerified) {
    return false;
  }

  return profile.role === "admin" || profile.role === "artist";
}
