import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
};
const SUPABASE_URL = extra?.supabaseUrl;
const SUPABASE_ANON_KEY = extra?.supabaseAnonKey;

// セッションの永続化にSecureStoreを使用するアダプター
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter, // Webの場合はデフォルト(localStorage)を使用
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
