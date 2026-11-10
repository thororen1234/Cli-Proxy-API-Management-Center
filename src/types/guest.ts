export type GuestLevel = 'none' | 'view' | 'edit';

/** Level per backend route group id. A missing id means `none`. */
export type GuestPermissions = Record<string, GuestLevel>;

export interface SessionInfo {
  role: 'admin' | 'guest';
  name: string;
  permissions: GuestPermissions;
}

/** A set of Management API routes a guest permission is set for. */
export interface GuestRouteGroup {
  id: string;
  paths: string[];
  editOnGet: boolean;
}

export interface GuestEntry {
  id: string;
  name: string;
  createdAt: string;
  permissions: GuestPermissions;
}

export interface GuestWithKey {
  guest: GuestEntry;
  key: string;
}
