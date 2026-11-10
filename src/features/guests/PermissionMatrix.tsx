import { useTranslation } from 'react-i18next';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import type { GuestPermissions, GuestRouteGroup } from '@/types';
import { meetsLevel, togglePermission } from '@/utils/permissions';
import styles from './GuestsPage.module.scss';

interface PermissionMatrixProps {
  groups: GuestRouteGroup[];
  value: GuestPermissions;
  onChange: (value: GuestPermissions) => void;
  disabled?: boolean;
}

export function PermissionMatrix({
  groups,
  value,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  const { t } = useTranslation();

  return (
    <table className={styles.matrix}>
      <thead>
        <tr>
          <th scope="col">{t('guests.route')}</th>
          <th scope="col">{t('guests.view')}</th>
          <th scope="col">{t('guests.edit')}</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => {
          const level = value[group.id] ?? 'none';
          const paths = group.paths.length > 0 ? group.paths.join(', ') : t('guests.plugin_routes');
          return (
            <tr key={group.id}>
              <th scope="row">
                <span className={styles.routeId}>{group.id}</span>
                <span className={styles.routePaths}>
                  {paths}
                  {group.editOnGet ? ` · ${t('guests.edit_on_get')}` : ''}
                </span>
              </th>
              <td>
                <SelectionCheckbox
                  checked={meetsLevel(level, 'view')}
                  onChange={(checked) =>
                    onChange(togglePermission(value, group.id, 'view', checked))
                  }
                  ariaLabel={t('guests.view_aria', { route: group.id })}
                  disabled={disabled}
                />
              </td>
              <td>
                <SelectionCheckbox
                  checked={meetsLevel(level, 'edit')}
                  onChange={(checked) =>
                    onChange(togglePermission(value, group.id, 'edit', checked))
                  }
                  ariaLabel={t('guests.edit_aria', { route: group.id })}
                  disabled={disabled}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
