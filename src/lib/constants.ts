export const COLORS = {
    primary: '#1E3A5F',
    secondary: '#2563EB',
    accent: '#38BDF8',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
};

export const PADDING = {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const ROUNDING = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

export const GLOBAL_SUPERADMIN_EMAIL = 'javier.aravena25@gmail.com';
export const INTERNAL_AUDIT_ORGANIZATION_NAMES = [
    'Security Audit JJVV A',
    'Security Audit JJVV B',
] as const;

export type Role =
    | 'member'
    | 'director'
    | 'secretary'
    | 'treasurer'
    | 'president'
    | 'superadmin';

export const ROLE_LABELS: Record<Role, string> = {
    member: 'Socio',
    director: 'Director/a',
    secretary: 'Secretario/a',
    treasurer: 'Tesorero/a',
    president: 'Presidente',
    superadmin: 'Superadmin',
};

export const BOARD_ROLES: Role[] = ['president', 'secretary', 'treasurer', 'director'];
export const MEMBER_ADMIN_ROLES: Role[] = ['president', 'superadmin'];
export const CONTENT_ADMIN_ROLES: Role[] = ['director', 'secretary', 'treasurer', 'president', 'superadmin'];

export const getRoleLabel = (role: Role | null | undefined) => {
    if (!role) return 'Sin rol';
    return ROLE_LABELS[role] || role;
};

export const isAdminRole = (role: Role | null | undefined) => {
    if (!role) return false;
    return CONTENT_ADMIN_ROLES.includes(role);
};

export const canManageMembers = (role: Role | null | undefined) => {
    if (!role) return false;
    return MEMBER_ADMIN_ROLES.includes(role);
};

export const isInternalAuditOrganization = (organizationName: string | null | undefined) => {
    const normalizedName = (organizationName || '').trim().toLowerCase();
    return INTERNAL_AUDIT_ORGANIZATION_NAMES.some((name) => name.toLowerCase() === normalizedName);
};
