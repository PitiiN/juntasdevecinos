export const COLORS = {
    primary: '#1E3A5F', // Dark Blue from icon background
    secondary: '#2563EB', // Standard Blue
    accent: '#38BDF8', // Light Blue
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

// Based on the provided roles enum
export type Role = 'socio' | 'moderador' | 'secretario' | 'tesorero' | 'presidente' | 'director' | 'superadmin';

export const isAdminRole = (role: Role | null | undefined) => {
    if (!role) return false;
    return ['secretario', 'tesorero', 'presidente', 'director', 'superadmin'].includes(role);
};
