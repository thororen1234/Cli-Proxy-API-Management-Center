import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { guestsApi } from '@/services/api';
import { useAuthStore, useNotificationStore } from '@/stores';
import type { GuestEntry, GuestPermissions, GuestRouteGroup } from '@/types';
import { copyToClipboard } from '@/utils/clipboard';
import { getErrorMessage } from '@/utils/helpers';
import { emptyPermissions } from '@/utils/permissions';
import { PermissionMatrix } from './PermissionMatrix';
import styles from './GuestsPage.module.scss';

const samePermissions = (groups: GuestRouteGroup[], a: GuestPermissions, b: GuestPermissions) =>
  groups.every((group) => (a[group.id] ?? 'none') === (b[group.id] ?? 'none'));

interface IssuedKey {
  guestName: string;
  key: string;
}

export function GuestsPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);

  const [routes, setRoutes] = useState<GuestRouteGroup[]>([]);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GuestPermissions>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyID, setBusyID] = useState('');
  const [newName, setNewName] = useState('');
  const [newPermissions, setNewPermissions] = useState<GuestPermissions>({});
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [routeGroups, list] = await Promise.all([guestsApi.routes(), guestsApi.list()]);
      setRoutes(routeGroups);
      setGuests(list);
      setDrafts({});
    } catch (err) {
      setError(getErrorMessage(err, t('guests.load_failed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    void load();
  }, [connectionStatus, load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      showNotification(t('guests.name_required'), 'error');
      return;
    }
    setCreating(true);
    try {
      const created = await guestsApi.create(name, newPermissions);
      setGuests((prev) => [...prev, created.guest]);
      setIssued({ guestName: created.guest.name, key: created.key });
      setNewName('');
      setNewPermissions(emptyPermissions(routes.map((group) => group.id)));
    } catch (err) {
      showNotification(getErrorMessage(err, t('guests.create_failed')), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (guest: GuestEntry) => {
    const draft = drafts[guest.id];
    if (!draft) return;
    setBusyID(guest.id);
    try {
      const updated = await guestsApi.update(guest.id, { permissions: draft });
      setGuests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
      showNotification(t('guests.saved'), 'success');
    } catch (err) {
      showNotification(getErrorMessage(err, t('guests.save_failed')), 'error');
    } finally {
      setBusyID('');
    }
  };

  const handleRotate = (guest: GuestEntry) => {
    showConfirmation({
      title: t('guests.rotate_title'),
      message: t('guests.rotate_message', { name: guest.name }),
      variant: 'danger',
      confirmText: t('guests.rotate'),
      onConfirm: async () => {
        try {
          const rotated = await guestsApi.rotate(guest.id);
          setIssued({ guestName: rotated.guest.name, key: rotated.key });
        } catch (err) {
          showNotification(getErrorMessage(err, t('guests.rotate_failed')), 'error');
        }
      },
    });
  };

  const handleDelete = (guest: GuestEntry) => {
    showConfirmation({
      title: t('guests.delete_title'),
      message: t('guests.delete_message', { name: guest.name }),
      variant: 'danger',
      confirmText: t('guests.delete'),
      onConfirm: async () => {
        try {
          await guestsApi.remove(guest.id);
          setGuests((prev) => prev.filter((item) => item.id !== guest.id));
        } catch (err) {
          showNotification(getErrorMessage(err, t('guests.delete_failed')), 'error');
        }
      },
    });
  };

  const handleCopy = async (key: string) => {
    const ok = await copyToClipboard(key);
    showNotification(
      ok ? t('guests.key_copied') : t('guests.key_copy_failed'),
      ok ? 'success' : 'error'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('guests.title')}</h1>
        <p className={styles.description}>{t('guests.description')}</p>
      </div>

      {issued ? (
        <div className={styles.keyBox} role="status">
          <div className={styles.keyBoxTitle}>
            {t('guests.key_issued', { name: issued.guestName })}
          </div>
          <code className={styles.keyValue}>{issued.key}</code>
          <p className={styles.hint}>{t('guests.key_once')}</p>
          <div className={styles.actions}>
            <Button size="sm" onClick={() => void handleCopy(issued.key)}>
              {t('guests.copy_key')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIssued(null)}>
              {t('guests.dismiss')}
            </Button>
          </div>
        </div>
      ) : null}

      <section className={styles.card} aria-labelledby="guests-new-title">
        <h2 className={styles.cardTitle} id="guests-new-title">
          {t('guests.new_title')}
        </h2>
        <Input
          label={t('guests.name_label')}
          placeholder={t('guests.name_placeholder')}
          value={newName}
          maxLength={64}
          onChange={(event) => setNewName(event.target.value)}
        />
        <PermissionMatrix groups={routes} value={newPermissions} onChange={setNewPermissions} />
        <p className={styles.hint}>{t('guests.sensitive_note')}</p>
        <div className={styles.actions}>
          <Button onClick={() => void handleCreate()} loading={creating}>
            {t('guests.create')}
          </Button>
        </div>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {!loading && guests.length === 0 && !error ? (
        <EmptyState title={t('guests.empty_title')} description={t('guests.empty_description')} />
      ) : null}

      {guests.map((guest) => {
        const draft = drafts[guest.id] ?? guest.permissions;
        const dirty = !samePermissions(routes, draft, guest.permissions);
        const busy = busyID === guest.id;
        return (
          <section className={styles.card} key={guest.id} aria-label={guest.name}>
            <div className={styles.guestHeader}>
              <h2 className={styles.cardTitle}>{guest.name}</h2>
              {guest.createdAt ? (
                <span className={styles.hint}>
                  {t('guests.created', { date: new Date(guest.createdAt).toLocaleDateString() })}
                </span>
              ) : null}
            </div>
            <PermissionMatrix
              groups={routes}
              value={draft}
              disabled={busy}
              onChange={(next) => setDrafts((prev) => ({ ...prev, [guest.id]: next }))}
            />
            <div className={styles.actions}>
              <Button
                size="sm"
                onClick={() => void handleSave(guest)}
                disabled={!dirty}
                loading={busy}
              >
                {t('guests.save')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleRotate(guest)}>
                {t('guests.rotate')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(guest)}>
                {t('guests.delete')}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
