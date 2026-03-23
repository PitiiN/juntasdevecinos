import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { GLOBAL_SUPERADMIN_EMAIL, isAdminRole, isInternalAuditOrganization, Role } from '../lib/constants';
import { clearPersistedAppState } from '../lib/store';
import { accountService } from '../services/accountService';
import { MembershipRequestInfo } from '../services/accessRequestService';
import { pushService } from '../services/pushService';

type ViewMode = 'user' | 'admin';

type AccessibleOrganization = {
    organizationId: string;
    role: Role;
    organizationName: string | null;
    organizationLogoUrl: string | null;
    organizationDirectivaImageUrl: string | null;
};

type AuthContextType = {
    session: Session | null;
    user: User | null;
    role: Role | null;
    organizationId: string | null;
    organizationName: string | null;
    organizationLogoUrl: string | null;
    directivaImageUrl: string | null;
    accessibleOrganizations: AccessibleOrganization[];
    pendingMembershipRequest: MembershipRequestInfo | null;
    isLoading: boolean;
    isAdmin: boolean;
    isSuperadmin: boolean;
    hasApprovedAccess: boolean;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    switchOrganization: (nextOrganizationId: string) => void;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const defaultValue: AuthContextType = {
    session: null,
    user: null,
    role: null,
    organizationId: null,
    organizationName: null,
    organizationLogoUrl: null,
    directivaImageUrl: null,
    accessibleOrganizations: [],
    pendingMembershipRequest: null,
    isLoading: true,
    isAdmin: false,
    isSuperadmin: false,
    hasApprovedAccess: false,
    viewMode: 'user',
    setViewMode: () => { },
    switchOrganization: () => { },
    signOut: async () => { },
    deleteAccount: async () => { },
    refreshSession: async () => { },
};

const AuthContext = createContext<AuthContextType>(defaultValue);
const retryDelayMs = 700;

const emptyOrganizationState = {
    role: null as Role | null,
    organizationId: null as string | null,
    organizationName: null as string | null,
    organizationLogoUrl: null as string | null,
    directivaImageUrl: null as string | null,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null);
    const [directivaImageUrl, setDirectivaImageUrl] = useState<string | null>(null);
    const [accessibleOrganizations, setAccessibleOrganizations] = useState<AccessibleOrganization[]>([]);
    const [pendingMembershipRequest, setPendingMembershipRequest] = useState<MembershipRequestInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('user');
    const selectedOrganizationIdRef = useRef<string | null>(null);
    const pendingAccessRefreshInFlightRef = useRef(false);

    const isSuperadminUser = (user?.email || '').toLowerCase() === GLOBAL_SUPERADMIN_EMAIL;
    const isAdmin = isAdminRole(role) || isSuperadminUser;
    const isSuperadmin = role === 'superadmin' || isSuperadminUser;
    const hasApprovedAccess = Boolean(organizationId) || isSuperadmin;

    const applyOrganizationContext = (nextOrganization: AccessibleOrganization | null) => {
        if (!nextOrganization) {
            selectedOrganizationIdRef.current = null;
            setRole(emptyOrganizationState.role);
            setOrganizationId(emptyOrganizationState.organizationId);
            setOrganizationName(emptyOrganizationState.organizationName);
            setOrganizationLogoUrl(emptyOrganizationState.organizationLogoUrl);
            setDirectivaImageUrl(emptyOrganizationState.directivaImageUrl);
            return;
        }

        selectedOrganizationIdRef.current = nextOrganization.organizationId;
        setRole(nextOrganization.role);
        setOrganizationId(nextOrganization.organizationId);
        setOrganizationName(nextOrganization.organizationName);
        setOrganizationLogoUrl(nextOrganization.organizationLogoUrl);
        setDirectivaImageUrl(nextOrganization.organizationDirectivaImageUrl);
    };

    const pause = (milliseconds: number) =>
        new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });

    const listAccessibleOrganizations = async (userId: string): Promise<AccessibleOrganization[]> => {
        const organizationResult = await supabase.rpc('list_accessible_organizations');
        let organizations = organizationResult.error
            ? []
            : (((organizationResult.data as any[]) || [])
                .map((item) => ({
                    organizationId: item.organization_id,
                    role: item.role as Role,
                    organizationName: item.organization_name ?? null,
                    organizationLogoUrl: item.organization_logo_url ?? null,
                    organizationDirectivaImageUrl: item.organization_directiva_image_url ?? null,
                }))
                .filter((item) => !isInternalAuditOrganization(item.organizationName)));

        if (organizationResult.error) {
            console.warn('Error fetching membership context, using fallback:', organizationResult.error.message);
        }

        if (organizations.length === 0) {
            try {
                organizations = await loadMembershipFallback(userId);
            } catch (fallbackError: any) {
                console.warn('Fallback membership lookup failed:', fallbackError?.message || fallbackError);
            }
        }

        return organizations;
    };

    const loadMembershipFallback = async (userId: string) => {
        const { data, error } = await supabase
            .from('memberships')
            .select(`
                organization_id,
                role,
                joined_at,
                organization:organizations(name, logo_url, directiva_image_url)
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('joined_at', { ascending: true });

        if (error) {
            throw error;
        }

        return (((data as any[]) || [])
            .map((item) => ({
                organizationId: item.organization_id,
                role: item.role as Role,
                organizationName: Array.isArray(item.organization) ? item.organization[0]?.name ?? null : item.organization?.name ?? null,
                organizationLogoUrl: Array.isArray(item.organization) ? item.organization[0]?.logo_url ?? null : item.organization?.logo_url ?? null,
                organizationDirectivaImageUrl: Array.isArray(item.organization) ? item.organization[0]?.directiva_image_url ?? null : item.organization?.directiva_image_url ?? null,
            }))
            .filter((item) => !isInternalAuditOrganization(item.organizationName)));
    };

    const fetchMembershipData = async (userId: string, email?: string | null) => {
        try {
            const requestResult = await supabase.rpc('get_my_membership_request');

            if (requestResult.error) {
                console.warn('Error fetching membership request:', requestResult.error.message);
                setPendingMembershipRequest(null);
            } else {
                const requestRows = (requestResult.data as any[]) || [];
                const latestRequest = requestRows[0] && !isInternalAuditOrganization(requestRows[0].organization_name)
                    ? {
                        id: requestRows[0].id,
                        organizationId: requestRows[0].organization_id,
                        organizationName: requestRows[0].organization_name || 'Organización',
                        requestedEmail: requestRows[0].requested_email || '',
                        requestedFullName: requestRows[0].requested_full_name || null,
                        status: requestRows[0].status,
                        rejectionReason: requestRows[0].rejection_reason || null,
                        createdAt: requestRows[0].created_at,
                        reviewedAt: requestRows[0].reviewed_at || null,
                    }
                    : null;

                setPendingMembershipRequest(latestRequest && latestRequest.status !== 'approved' ? latestRequest : null);
            }

            let organizations = await listAccessibleOrganizations(userId);
            if (organizations.length === 0) {
                await pause(retryDelayMs);
                organizations = await listAccessibleOrganizations(userId);
            }

            setAccessibleOrganizations(organizations);

            if (organizations.length === 0) {
                applyOrganizationContext(null);
                if ((email || '').toLowerCase() === GLOBAL_SUPERADMIN_EMAIL) {
                    setRole('superadmin');
                }
                return;
            }

            const nextOrganization =
                organizations.find((item) => item.organizationId === selectedOrganizationIdRef.current) ??
                organizations[0];

            applyOrganizationContext(nextOrganization);
        } catch (error) {
            console.error('Unexpected error fetching auth context:', error);
            setAccessibleOrganizations([]);
            setPendingMembershipRequest(null);
            applyOrganizationContext(null);
        }
    };

    const clearClientState = async () => {
        setViewMode('user');
        setAccessibleOrganizations([]);
        setPendingMembershipRequest(null);
        applyOrganizationContext(null);
        await clearPersistedAppState();
        setSession(null);
        setUser(null);
    };

    const refreshSession = async () => {
        setIsLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
            await fetchMembershipData(currentSession.user.id, currentSession.user.email);
        } else {
            await clearPersistedAppState();
            setAccessibleOrganizations([]);
            setPendingMembershipRequest(null);
            applyOrganizationContext(null);
            setViewMode('user');
        }

        setIsLoading(false);
    };

    const switchOrganization = (nextOrganizationId: string) => {
        const nextOrganization = accessibleOrganizations.find((item) => item.organizationId === nextOrganizationId);
        if (!nextOrganization) {
            return;
        }

        applyOrganizationContext(nextOrganization);
    };

    useEffect(() => {
        if (!isAdmin && viewMode === 'admin') {
            setViewMode('user');
            return;
        }

        if (isAdmin && !isSuperadmin && viewMode !== 'admin') {
            setViewMode('admin');
        }
    }, [isAdmin, isSuperadmin, viewMode]);

    useEffect(() => {
        let cancelled = false;
        let authSubscription: { unsubscribe: () => void } | null = null;

        const handleSessionChange = async (newSession: Session | null) => {
            setIsLoading(true);
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
                await fetchMembershipData(newSession.user.id, newSession.user.email);
            } else {
                await clearPersistedAppState();
                setAccessibleOrganizations([]);
                setPendingMembershipRequest(null);
                applyOrganizationContext(null);
                setViewMode('user');
            }

            if (!cancelled) {
                setIsLoading(false);
            }
        };

        const bootstrapAuth = async () => {
            await refreshSession();
            if (cancelled) {
                return;
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
                if (cancelled) {
                    return;
                }

                if (event === 'INITIAL_SESSION') {
                    return;
                }

                if (event === 'TOKEN_REFRESHED') {
                    setSession(newSession);
                    setUser(newSession?.user || null);
                    return;
                }

                void handleSessionChange(newSession);
            });

            authSubscription = subscription;
        };

        void bootstrapAuth();

        return () => {
            cancelled = true;
            authSubscription?.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!session?.user?.id || hasApprovedAccess) {
            return;
        }

        let cancelled = false;

        const refreshPendingAccess = async () => {
            if (pendingAccessRefreshInFlightRef.current || cancelled) {
                return;
            }

            pendingAccessRefreshInFlightRef.current = true;
            try {
                await fetchMembershipData(session.user.id, session.user.email);
            } catch (error) {
                console.warn('Pending-access refresh skipped:', (error as any)?.message || error);
            } finally {
                pendingAccessRefreshInFlightRef.current = false;
            }
        };

        void refreshPendingAccess();
        const intervalId = setInterval(() => {
            void refreshPendingAccess();
        }, 12000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [session?.user?.id, session?.user?.email, hasApprovedAccess]);

    useEffect(() => {
        if (!user?.id || !organizationId || !hasApprovedAccess) {
            return;
        }

        void pushService.registerPushToken(user.id, organizationId).catch((error) => {
            console.warn('Push token registration skipped:', error?.message || error);
        });
    }, [user?.id, organizationId, hasApprovedAccess]);

    const signOut = async () => {
        await clearClientState();
        await supabase.auth.signOut();
    };

    const deleteAccount = async () => {
        await accountService.deleteMyAccount();
        await clearClientState();
        await supabase.auth.signOut({ scope: 'local' });
    };

    const value = useMemo<AuthContextType>(() => ({
        session,
        user,
        role,
        organizationId,
        organizationName,
        organizationLogoUrl,
        directivaImageUrl,
        accessibleOrganizations,
        pendingMembershipRequest,
        isLoading,
        isAdmin,
        isSuperadmin,
        hasApprovedAccess,
        viewMode,
        setViewMode,
        switchOrganization,
        signOut,
        deleteAccount,
        refreshSession,
    }), [
        session,
        user,
        role,
        organizationId,
        organizationName,
        organizationLogoUrl,
        directivaImageUrl,
        accessibleOrganizations,
        pendingMembershipRequest,
        isLoading,
        isAdmin,
        isSuperadmin,
        hasApprovedAccess,
        viewMode,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

