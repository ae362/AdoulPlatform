import { useEffect } from 'react';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';

/**
 * Hook to set a custom dynamic title for a specific page/workspace.
 * Automatically restores previous title on unmount.
 *
 * Example:
 *   usePageTitle('رسم بيع عقار رقم 402/2026');
 */
export function usePageTitle(title?: string | null) {
  const { setCustomPageTitle } = useMessagingNotifications();

  useEffect(() => {
    if (title) {
      setCustomPageTitle(title);
    }
    return () => {
      if (title) {
        setCustomPageTitle(null);
      }
    };
  }, [title, setCustomPageTitle]);
}

export default usePageTitle;
