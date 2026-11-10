import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { IconShield } from '@/components/ui/icons';
import { useAuthStore } from '@/stores';
import { canEditPath, canViewPath } from '@/utils/permissions';
import styles from './GuestBanner.module.scss';

/** Tells a guest signed in with a view-only page that edits will be rejected. */
export function GuestBanner() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const session = useAuthStore((state) => state.session);

  if (session.role !== 'guest') return null;
  if (!canViewPath(session, pathname) || canEditPath(session, pathname)) return null;

  return (
    <div className={styles.banner} role="status">
      <IconShield size={16} />
      <span>{t('guests.view_only_banner')}</span>
    </div>
  );
}
