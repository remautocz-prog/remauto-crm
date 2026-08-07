import type { AppRole } from "@/lib/auth/roles";
import type { Permission } from "@/lib/auth/permissions";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string | null;
};

export type UserAccess = {
  userId: string;
  email: string | null;
  profile: UserProfile;
  role: AppRole;
  isActive: boolean;
  permissions: Set<Permission>;
};

export type ManagedUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
};
