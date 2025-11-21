import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
    const menuItems: MenuItem[] = [
        { id: 'billing', icon: 'card', label: '課金・プラン管理' },
        { id: 'notifications', icon: 'notifications', label: 'お知らせ', badge: 3 },
        { id: 'favorites', icon: 'star', label: 'お気に入り' },
        { id: 'settings', icon: 'settings', label: '各種設定' },
        { id: 'help', icon: 'help-circle', label: 'ヘルプ・ガイドライン' },
    ];

    // Mock billing date for now as it's not in Profile
    const nextBillingDate = '2025年12月19日';

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Background */}
                <LinearGradient
                    colors={['#0d9488', '#1d4ed8']} // teal-600 to blue-700
                    style={styles.headerBackground}
                >
                    <SafeAreaView>
                        <Text style={styles.headerTitle}>マイページ</Text>
                    </SafeAreaView>
                </LinearGradient>

                {/* Profile Card */}
                <View style={styles.profileCardContainer}>
                    <View style={styles.profileCard}>
                        {/* Profile Info */}
                        <View style={styles.profileInfo}>
                            <View style={styles.imageWrapper}>
                                <Image
                                    source={{ uri: profile.image }}
                                    style={styles.profileImage}
                                />
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={12} color="white" />
                                </View>
                            </View>
                            <View style={styles.textInfo}>
                                <Text style={styles.userName}>{profile.name}</Text>
                                <Text style={styles.userDetails}>{profile.age}歳 · {profile.university || profile.company || ''}</Text>
                            </View>
                        </View>

                        {/* Edit Profile Button */}
                        <View style={styles.editButtonContainer}>
                            <TouchableOpacity
                                onPress={onEditProfile}
                                style={styles.editButton}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#f97316', '#ea580c']} // orange-500 to orange-600
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.editButtonGradient}
                                >
                                    <Ionicons name="create-outline" size={20} color="white" />
                                    <Text style={styles.editButtonText}>プロフィール編集・確認</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Status Banner */}
                        <LinearGradient
                            colors={['#0d9488', '#2563eb']} // teal-600 to blue-600
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.statusBanner}
                        >
                            <View style={styles.statusRow}>
                                <View style={styles.statusLeft}>
                                    <View style={styles.pulseDot} />
                                    <Text style={styles.statusText}>月額 ¥500 参加中</Text>
                                </View>
                            </View>
                            <Text style={styles.statusSubText}>次月更新日：{nextBillingDate}</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    <View style={styles.menuList}>
                        {menuItems.map((item, index) => {
                            const isLast = index === menuItems.length - 1;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        !isLast && styles.menuItemBorder
                                    ]}
                                    onPress={() => {
                                        if (item.id === 'notifications' && onOpenNotifications) {
                                            onOpenNotifications();
                                        } else if (item.id === 'settings' && onSettingsPress) {
                                            onSettingsPress();
                                        } else if (item.id === 'help' && onHelpPress) {
                                            onHelpPress();
                                        }
                                    }}
                                >
                                    <View style={styles.menuIconWrapper}>
                                        <Ionicons name={item.icon} size={20} color="#0d9488" />
                                    </View>
                                    <View style={styles.menuLabelWrapper}>
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                    </View>
                                    {item.badge && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{item.badge}</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Logout Button */}
                <View style={styles.logoutContainer}>
                    <TouchableOpacity
                        onPress={onLogout}
                        style={styles.logoutButton}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#374151" />
                        <Text style={styles.logoutText}>ログアウト</Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>BizYou v1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2025 BizYou. All rights reserved.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb', // gray-50
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBackground: {
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    profileCardContainer: {
        paddingHorizontal: 16,
        marginTop: -20,
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    profileInfo: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    imageWrapper: {
        position: 'relative',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#14b8a6', // teal-500
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        backgroundColor: '#0d9488', // teal-600
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    textInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    userDetails: {
        fontSize: 14,
        color: '#4b5563',
    },
    editButtonContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    editButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    editButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    statusBanner: {
        padding: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ade80', // green-400
    },
    statusText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    statusSubText: {
        color: '#ccfbf1', // teal-100
        fontSize: 12,
    },
    menuContainer: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    menuList: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    menuIconWrapper: {
        width: 40,
        height: 40,
        backgroundColor: '#f0fdfa', // teal-50
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabelWrapper: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 14,
        color: '#111827',
    },
    badge: {
        backgroundColor: '#f97316', // orange-500
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    logoutContainer: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    logoutText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
    },
    versionContainer: {
        marginTop: 32,
        alignItems: 'center',
        paddingBottom: 16,
    },
    versionText: {
        fontSize: 12,
        color: '#6b7280',
    },
    copyrightText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
});
