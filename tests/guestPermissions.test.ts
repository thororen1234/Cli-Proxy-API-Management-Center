import { describe, expect, test } from 'bun:test';
import {
  ADMIN_SESSION,
  canEditPath,
  canReadConfig,
  canViewPath,
  emptyPermissions,
  firstAccessiblePath,
  levelOf,
  normalizePermissions,
  routeGroupsForPath,
  togglePermission,
} from '../src/utils/permissions';
import type { GuestPermissions, SessionInfo } from '../src/types/guest';

const guest = (permissions: GuestPermissions): SessionInfo => ({
  role: 'guest',
  name: 'dev',
  permissions,
});

describe('guest permissions', () => {
  test('maps panel routes to the route groups they call', () => {
    expect(routeGroupsForPath('/')).toEqual(['config', 'usage', 'credentials']);
    expect(routeGroupsForPath('/ai-providers')).toEqual(['config']);
    expect(routeGroupsForPath('/auth-files/oauth-excluded')).toEqual(['credentials']);
    expect(routeGroupsForPath('/plugin-pages/p1/0')).toEqual(['plugins']);
    expect(routeGroupsForPath('/plugin-store')).toEqual(['plugins-store']);
    expect(routeGroupsForPath('/guests')).toBe('admin');
    expect(routeGroupsForPath('/system')).toBeNull();
  });

  test('admin opens everything, guests only routes they hold', () => {
    expect(canViewPath(ADMIN_SESSION, '/guests')).toBe(true);
    expect(levelOf(ADMIN_SESSION, 'anything')).toBe('edit');
    const session = guest({ logs: 'view', plugins: 'edit' });
    expect(canViewPath(session, '/logs')).toBe(true);
    expect(canViewPath(session, '/plugins')).toBe(true);
    expect(canViewPath(session, '/plugin-store')).toBe(false);
    expect(canViewPath(session, '/config')).toBe(false);
    expect(canViewPath(session, '/guests')).toBe(false);
    expect(canViewPath(session, '/system')).toBe(true);
  });

  test('a page is view-only when no route it calls is editable', () => {
    const session = guest({ logs: 'view', credentials: 'view', 'api-call': 'edit' });
    expect(canEditPath(session, '/logs')).toBe(false);
    expect(canEditPath(session, '/auth-files')).toBe(false);
    expect(canEditPath(session, '/quota')).toBe(true);
    expect(canEditPath(session, '/system')).toBe(true);
  });

  test('lands a guest without dashboard routes on a page they can open', () => {
    expect(firstAccessiblePath(guest({ logs: 'view' }))).toBe('/logs');
    expect(firstAccessiblePath(guest({}))).toBe('/system');
    expect(firstAccessiblePath(ADMIN_SESSION)).toBe('/');
  });

  test('only config view lets the panel read the config on sign-in', () => {
    expect(canReadConfig(guest({ logs: 'edit', plugins: 'edit' }))).toBe(false);
    expect(canReadConfig(guest({ config: 'view' }))).toBe(true);
    expect(canReadConfig(ADMIN_SESSION)).toBe(true);
  });

  test('edit implies view in the checkboxes', () => {
    let perms = emptyPermissions(['logs', 'config']);
    perms = togglePermission(perms, 'logs', 'edit', true);
    expect(perms.logs).toBe('edit');
    perms = togglePermission(perms, 'logs', 'edit', false);
    expect(perms.logs).toBe('view');
    perms = togglePermission(perms, 'logs', 'view', false);
    expect(perms.logs).toBe('none');
    perms = togglePermission(perms, 'config', 'view', true);
    expect(perms.config).toBe('view');
    perms = togglePermission(perms, 'config', 'edit', true);
    perms = togglePermission(perms, 'config', 'view', true);
    expect(perms.config).toBe('edit');
    perms = togglePermission(perms, 'config', 'view', false);
    expect(perms.config).toBe('none');
    expect(togglePermission({}, 'usage', 'view', true).usage).toBe('view');
  });

  test('keeps route groups from newer backends and drops invalid levels', () => {
    const perms = normalizePermissions({ logs: 'edit', quota: 'root', 'new-group': 'view' });
    expect(perms).toEqual({ logs: 'edit', 'new-group': 'view' });
    expect(normalizePermissions(null)).toEqual({});
  });
});
