import type { GuestLevel, GuestPermissions, SessionInfo } from '@/types/guest';

const LEVEL_RANK: Record<GuestLevel, number> = { none: 0, view: 1, edit: 2 };

export const ADMIN_SESSION: SessionInfo = { role: 'admin', name: '', permissions: {} };

const isLevel = (value: unknown): value is GuestLevel =>
  value === 'none' || value === 'view' || value === 'edit';

/** Keeps the route group ids the backend sent; anything that is not a level is dropped. */
export const normalizePermissions = (value: unknown): GuestPermissions => {
  const out: GuestPermissions = {};
  if (!value || typeof value !== 'object') return out;
  for (const [group, level] of Object.entries(value)) {
    if (isLevel(level)) out[group] = level;
  }
  return out;
};

/** A permission set with `none` for every given route group. */
export const emptyPermissions = (groupIds: string[]): GuestPermissions =>
  Object.fromEntries(groupIds.map((id) => [id, 'none'])) as GuestPermissions;

export const meetsLevel = (have: GuestLevel, need: GuestLevel): boolean =>
  LEVEL_RANK[have] >= LEVEL_RANK[need];

export const levelOf = (session: SessionInfo, group: string): GuestLevel =>
  session.role === 'admin' ? 'edit' : (session.permissions[group] ?? 'none');

/**
 * Route groups that make a panel route usable. A route opens when the session
 * has view on any of them. `'admin'` is management-key only, `null` is open.
 */
export const routeGroupsForPath = (path: string): string[] | 'admin' | null => {
  const clean = `/${path.replace(/^\/+/, '').split(/[?#]/)[0]}`.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/dashboard') return ['config', 'usage', 'credentials'];
  if (clean === '/guests') return 'admin';
  if (clean === '/system') return null;
  if (clean === '/quick-start' || clean.startsWith('/quick-start/')) return ['config'];
  if (clean === '/ai-providers' || clean.startsWith('/ai-providers/')) return ['config'];
  if (clean === '/auth-files' || clean.startsWith('/auth-files/')) return ['credentials'];
  if (clean === '/oauth') return ['oauth'];
  if (clean === '/quota') return ['credentials', 'api-call'];
  if (clean === '/config') return ['config'];
  if (clean === '/logs') return ['logs'];
  if (clean === '/plugin-store') return ['plugins-store'];
  if (clean === '/plugins' || clean.startsWith('/plugins/')) return ['plugins'];
  if (clean.startsWith('/plugin-pages/')) return ['plugins'];
  return null;
};

export const canViewPath = (session: SessionInfo, path: string): boolean => {
  const groups = routeGroupsForPath(path);
  if (groups === null) return true;
  if (groups === 'admin') return session.role === 'admin';
  return groups.some((group) => meetsLevel(levelOf(session, group), 'view'));
};

export const canEditPath = (session: SessionInfo, path: string): boolean => {
  const groups = routeGroupsForPath(path);
  if (groups === null) return true;
  if (groups === 'admin') return session.role === 'admin';
  return groups.some((group) => meetsLevel(levelOf(session, group), 'edit'));
};

/** The panel reads the whole config on sign-in; only sessions allowed to do so should. */
export const canReadConfig = (session: SessionInfo): boolean =>
  meetsLevel(levelOf(session, 'config'), 'view');

const LANDING_ORDER = [
  '/',
  '/ai-providers',
  '/auth-files',
  '/oauth',
  '/quota',
  '/logs',
  '/config',
  '/plugins',
  '/plugin-store',
  '/system',
];

export const firstAccessiblePath = (session: SessionInfo): string =>
  LANDING_ORDER.find((path) => canViewPath(session, path)) ?? '/system';

/**
 * Applies one checkbox change. Edit implies view: ticking edit also ticks view,
 * and clearing view also clears edit.
 */
export const togglePermission = (
  permissions: GuestPermissions,
  group: string,
  box: 'view' | 'edit',
  checked: boolean
): GuestPermissions => {
  const current = permissions[group] ?? 'none';
  let level: GuestLevel;
  if (box === 'edit') level = checked ? 'edit' : 'view';
  else level = checked ? (current === 'edit' ? 'edit' : 'view') : 'none';
  return { ...permissions, [group]: level };
};
