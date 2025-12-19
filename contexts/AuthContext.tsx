import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { QueryClient } from '@tanstack/react-query';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
    refreshSession: async () => { },
});

export const AuthProvider = ({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // セッションの取得
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                setLoading(false);
            }

            // 認証状態の変更を監視
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('=== Auth State Change ===');
                console.log('Event:', event);
                console.log('User ID:', session?.user.id);
                console.log('Email:', session?.user.email);

                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        initializeAuth();
    }, []);

    const signOut = async () => {
        try {
            console.log('=== Signing out ===');
            // Supabaseセッションをクリア
            await supabase.auth.signOut();
            // ローカル状態も明示的にクリア
            setSession(null);
            setUser(null);
            // React Queryのキャッシュを完全にクリア
            queryClient.clear();
            console.log('Cache cleared successfully');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const refreshSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
        } catch (error) {
            console.error('Error refreshing session:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
