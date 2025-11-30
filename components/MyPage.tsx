import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface MyPageProps {
    profile: Profile;
    onLogout?: () => void;
    onEditProfile?: () => void;
    onOpenNotifications?: () => void;
    onSettingsPress?: () => void;
    onHelpPress?: () => void;
}

interface MenuItem {
    id: string;
    icon: any;
    label: string;
    badge?: number;
}

export function MyPage({ profile, onLogout, onEditProfile, onOpenNotifications, onSettingsPress, onHelpPress }: MyPageProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);

    const menuItems: MenuItem[] = [
        { id: 'billing', icon: 'card-outline', label: '課金・プラン管理' },
        { id: 'notifications', icon: 'notifications-outline', label: 'お知らせ' },
        { id: 'favorites', icon: 'star-outline', label: 'お気に入り' },
        { id: 'settings', icon: 'settings-outline', label: '各種設定' },
        { id: 'help', icon: 'help-circle-outline', label: 'ヘルプ・ガイドライン' },
    ];

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Delete avatar images
            const { data: avatarFiles } = await supabase.storage
                .from('avatars')
                .list(`${user.id}/`);

            if (avatarFiles && avatarFiles.length > 0) {
                const filesToRemove = avatarFiles.map(x => `${user.id}/${x.name}`);
                const { error: removeError } = await supabase.storage
                    .from('avatars')
                    .remove(filesToRemove);
                if (removeError) console.error('Error removing avatars:', removeError);
            }

            // 2. Delete chat images
            const { data: chatFiles } = await supabase.storage
                .from('chat-images')
                .list(`${user.id}/`);

            if (chatFiles && chatFiles.length > 0) {
                const filesToRemove = chatFiles.map(x => `${user.id}/${x.name}`);
                const { error: removeError } = await supabase.storage
                    .from('chat-images')
                    .remove(filesToRemove);
                if (removeError) console.error('Error removing chat images:', removeError);
            }

            // 3. Delete account data and auth user
            const { error } = await supabase.rpc('delete_account');
            if (error) throw error;

            Alert.alert("完了", "アカウントを削除しました。", [
                { text: "OK", onPress: onLogout }
            ]);
        } catch (error: any) {
            console.error('Error deleting account:', error);
            Alert.alert("エラー", "アカウントの削除に失敗しました。");
            setIsDeleting(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header Area */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.pageTitle}>マイページ</Text>
                        <View style={styles.profileImageContainer}>
                            <TouchableOpacity onPress={() => setIsImageModalVisible(true)} activeOpacity={0.9}>
                                <Image
                                    source={{ uri: profile.image }}
                                    style={styles.profileImage}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{profile.name}</Text>
                        <Text style={styles.userDetails}>{profile.age}歳 · {profile.university || profile.company || ''}</Text>

                        <TouchableOpacity
                            onPress={onEditProfile}
                            style={styles.editButton}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.editButtonText}>プロフィール編集</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Plan Area */}
                    <View style={styles.planContainer}>
                        <View style={styles.planCard}>
                            <Text style={styles.planLabel}>現在のプラン</Text>
                            <Text style={styles.planName}>スタンダード（無料）</Text>
                        </View>
                    </View>

                    {/* Menu List */}
                    <View style={styles.menuContainer}>
                        {menuItems.map((item, index) => {
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        if (item.id === 'notifications' && onOpenNotifications) {
                                            onOpenNotifications();
                                        } else if (item.id === 'settings' && onSettingsPress) {
                                            onSettingsPress();
                                        } else if (item.id === 'help' && onHelpPress) {
                                            onHelpPress();
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuLeft}>
                                        <Ionicons name={item.icon} size={22} color="#555" />
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                    </View>
                                    <View style={styles.menuRight}>
                                        {item.badge && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{item.badge}</Text>
                                            </View>
                                        )}
                                        <Ionicons name="chevron-forward" size={16} color="#CCC" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={onLogout}
                        style={styles.logoutButton}
                    >
                        <Text style={styles.logoutText}>ログアウト</Text>
                    </TouchableOpacity>

                    {/* Delete Account */}
                    <View style={styles.deleteAccountContainer}>
                        <TouchableOpacity
                            style={styles.deleteAccountButton}
                            onPress={() => {
                                Alert.alert(
                                    "アカウント削除",
                                    "本当にアカウントを削除しますか？この操作は取り消せません。\nすべてのデータが完全に削除されます。",
                                    [
                                        { text: "キャンセル", style: "cancel" },
                                        {
                                            text: "削除する",
                                            style: "destructive",
                                            onPress: handleDeleteAccount
                                        }
                                    ]
                                );
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#999" />
                            ) : (
                                <Text style={styles.deleteAccountText}>アカウントを削除する</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* App Version */}
                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>Nakama v1.0.0</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Image Preview Modal */}
            <Modal
                visible={isImageModalVisible}
                transparent={true}
                onRequestClose={() => setIsImageModalVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalBackground}
                    activeOpacity={1}
                    onPress={() => setIsImageModalVisible(false)}
                >
                    <Image
                        source={{ uri: profile.image }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsImageModalVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FAFAFA',
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
    },
    profileImageContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E5E7EB',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    userDetails: {
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
    },
    editButton: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DDD',
        backgroundColor: 'white',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    planContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    planCard: {
        backgroundColor: '#F0F9FF', // Very light blue
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    planLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    planName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0284C7', // Blue
    },
    menuContainer: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#EEE',
        marginBottom: 32,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    logoutButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 8,
    },
    logoutText: {
        fontSize: 14,
        color: '#EF4444', // Red for logout
        fontWeight: '600',
    },
    versionContainer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    versionText: {
        fontSize: 12,
        color: '#CCC',
    },
    deleteAccountContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    deleteAccountButton: {
        padding: 8,
    },
    deleteAccountText: {
        fontSize: 13,
        color: '#999',
        textDecorationLine: 'underline',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
        zIndex: 1,
    },
});
