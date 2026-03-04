import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Role } from '../lib/constants';

// Emails that have admin access
const ADMIN_EMAILS = ['javier.aravena25@gmail.com'];

type ViewMode = 'user' | 'admin';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    role: Role | null;
    organizationId: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    organizationId: null,
    isLoading: true,
    isAdmin: false,
    viewMode: 'user',
    setViewMode: () => { },
    signOut: async () => { },
    refreshSession: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('user');

    const isAdmin = ADMIN_EMAILS.includes(user?.email || '');

    const fetchMembershipData = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('memberships')
                .select('role, organization_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            if (error) {
                console.warn('No membership found:', error.message);
                setRole(null);
                setOrganizationId(null);
            } else if (data) {
                setRole(data.role as Role);
                setOrganizationId(data.organization_id);
            }
        } catch (err) {
            console.error('Unexpected error fetching membership:', err);
        }
    };

    const refreshSession = async () => {
        setIsLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
            await fetchMembershipData(currentSession.user.id);
            // Auto-set viewMode based on email
            if (ADMIN_EMAILS.includes(currentSession.user.email || '')) {
                // Don't auto-switch to admin, let the user choose
            }
        } else {
            setRole(null);
            setOrganizationId(null);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        refreshSession();

        // Safety timeout: if auth takes > 5s, stop loading anyway
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
                await fetchMembershipData(newSession.user.id);
            } else {
                setRole(null);
                setOrganizationId(null);
                setViewMode('user');
            }
            setIsLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        setViewMode('user');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, role, organizationId, isLoading, isAdmin, viewMode, setViewMode, signOut, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
