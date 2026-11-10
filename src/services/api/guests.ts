import { apiClient } from './client';
import { isRecord } from '@/utils/helpers';
import { ADMIN_SESSION, normalizePermissions } from '@/utils/permissions';
import type {
  GuestEntry,
  GuestPermissions,
  GuestRouteGroup,
  GuestWithKey,
  SessionInfo,
} from '@/types';

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeGuest = (value: unknown): GuestEntry | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;
  return {
    id,
    name: asString(value.name),
    createdAt: asString(value['created-at']),
    permissions: normalizePermissions(value.permissions),
  };
};

const normalizeRouteGroup = (value: unknown): GuestRouteGroup | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;
  const paths = Array.isArray(value.paths) ? value.paths.map(asString).filter(Boolean) : [];
  return { id, paths, editOnGet: value['edit-on-get'] === true };
};

const normalizeGuestWithKey = (data: unknown): GuestWithKey => {
  const record = isRecord(data) ? data : {};
  const guest = normalizeGuest(record.guest);
  const key = asString(record.key);
  if (!guest || !key) throw new Error('Invalid guest response');
  return { guest, key };
};

export const guestsApi = {
  async session(): Promise<SessionInfo> {
    const data = await apiClient.get('/session');
    if (!isRecord(data) || data.role !== 'guest') return ADMIN_SESSION;
    return {
      role: 'guest',
      name: asString(data.name),
      permissions: normalizePermissions(data.permissions),
    };
  },

  async routes(): Promise<GuestRouteGroup[]> {
    const data = await apiClient.get('/guests/routes');
    const items = isRecord(data) && Array.isArray(data.routes) ? data.routes : [];
    return items.map(normalizeRouteGroup).filter((item): item is GuestRouteGroup => item !== null);
  },

  async list(): Promise<GuestEntry[]> {
    const data = await apiClient.get('/guests');
    const items = isRecord(data) && Array.isArray(data.guests) ? data.guests : [];
    return items.map(normalizeGuest).filter((item): item is GuestEntry => item !== null);
  },

  async create(name: string, permissions: GuestPermissions): Promise<GuestWithKey> {
    return normalizeGuestWithKey(await apiClient.post('/guests', { name, permissions }));
  },

  async update(
    id: string,
    patch: { name?: string; permissions?: GuestPermissions }
  ): Promise<GuestEntry> {
    const data = await apiClient.patch(`/guests/${encodeURIComponent(id)}`, patch);
    const guest = isRecord(data) ? normalizeGuest(data.guest) : null;
    if (!guest) throw new Error('Invalid guest response');
    return guest;
  },

  async rotate(id: string): Promise<GuestWithKey> {
    return normalizeGuestWithKey(await apiClient.post(`/guests/${encodeURIComponent(id)}/rotate`));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/guests/${encodeURIComponent(id)}`);
  },
};
