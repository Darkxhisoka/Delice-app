import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole, UserSession } from '../../types';
import { notifyToast } from '../../services/storage';

interface ProtectedRouteProps {
  session: UserSession | null;
  currentPath: string;
  allowedRole?: UserRole;
  children: React.ReactNode;
  onRedirect: (targetPath: string) => void;
}

/**
 * Guard component that enforces strict session-based role restrictions and URL path protection.
 * Checks the user's base permission (is_central_lab / role === 'CENTRAL_LAB') rather than temporary view context.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  session,
  currentPath,
  allowedRole,
  children,
  onRedirect
}) => {
  const { t } = useTranslation();
  const isAuthenticated = session?.isAuthenticated ?? false;
  
  // Base user permission check (decoupled from active view context)
  const isCentralLabUser = session?.user?.role === 'CENTRAL_LAB' || 
                           session?.user?.secret_role === 'LAB_EXECUTIVE_ADMIN' || 
                           session?.user?.is_central_lab === true;

  useEffect(() => {
    // 1. Unauthenticated users trying to access protected paths
    if (!isAuthenticated) {
      if (currentPath !== '/login') {
        notifyToast({
          type: 'warning',
          title: t('login.authRequired', 'Authentification Requise'),
          message: t('login.authRequiredMsg', 'Veuillez vous connecter pour accéder au système Pâtisserie le Délice.')
        });
        onRedirect('/login');
      }
      return;
    }

    // 2. Non-Lab STORE accounts trying to access Central Lab paths (/lab, /lab/*)
    if (!isCentralLabUser && (currentPath.startsWith('/lab') || allowedRole === 'CENTRAL_LAB')) {
      notifyToast({
        type: 'warning',
        title: t('login.accessRestrictedTitle', 'Accès Non Autorisé (Magasin)'),
        message: t('login.accessRestrictedMsg', 'Accès restreint : Votre compte Point de Vente ne possède pas les privilèges pour accéder aux modules du Laboratoire Central (/lab).')
      });
      onRedirect('/store');
      return;
    }

    // 3. Authenticated user on /login path redirect to appropriate dashboard
    if (currentPath === '/login' && isAuthenticated) {
      const defaultPath = isCentralLabUser ? '/lab' : '/store';
      onRedirect(defaultPath);
    }
  }, [isAuthenticated, isCentralLabUser, currentPath, allowedRole, onRedirect, t]);

  // If unauthenticated and on protected route, do not render children
  if (!isAuthenticated && currentPath !== '/login') {
    return null;
  }

  // If non-lab STORE user attempting LAB route, do not render children during redirect
  if (!isCentralLabUser && (currentPath.startsWith('/lab') || allowedRole === 'CENTRAL_LAB')) {
    return null;
  }

  return <>{children}</>;
};

