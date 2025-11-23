import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// TODO: Supabaseのプロジェクト設定から取得したURLとAnon Keyをここに設定してください
// 1. https://supabase.com/dashboard で新しいプロジェクトを作成
// 2. Project Settings -> API から URL と anon/public key をコピーして以下に貼り付け
const SUPABASE_URL = 'https://qexnfdidlqewfxskkqow.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Vk8g53TJnlk4sySpbMAVEw_1FZabrBp';

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
