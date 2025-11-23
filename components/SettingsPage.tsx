import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsPageProps {
    onBack: () => void;
    onLogout?: () => void;
    onOpenTerms?: () => void;
    onOpenPrivacy?: () => void;
}

export function SettingsPage({ onBack, onLogout, onOpenTerms, onOpenPrivacy }: SettingsPageProps) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            "ログアウト",
            "本当にログアウトしますか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "ログアウト",
                    style: "destructive",
                    onPress: onLogout
                }
            ]
        );
    };

    const renderSectionHeader = (title: string) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const renderItem = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        rightElement: React.ReactNode,
        onPress?: () => void,
        isLast: boolean = false,
        iconColor: string = '#009688'
    ) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemLeft}>
                    <Ionicons name={icon} size={22} color={iconColor} style={styles.itemIcon} />
                    <Text style={styles.itemLabel}>{label}</Text>
                </View>
                {rightElement}
            </View>
            {!isLast && <View style={styles.separator} />}
        </TouchableOpacity>
    );

    const handleFeatureNotImplemented = () => {
        Alert.alert("開発中", "この機能は現在開発中です。");
    };

    const handleOpenURL = async (url: string) => {
        // In a real app, you would use Linking.openURL(url)
        // For now, we'll just show an alert with the URL
        Alert.alert("外部リンク", `${url} を開きます`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>各種設定</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Notifications */}
                {renderSectionHeader('通知')}
                <View style={styles.sectionContainer}>
                    {renderItem('notifications-outline', 'プッシュ通知', (
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#34C759" }}
                            thumbColor={"#fff"}
                        />
                    ), undefined, true, '#FF9500')}
                </View>

                {/* Account */}
                {renderSectionHeader('アカウント')}
                <View style={styles.sectionContainer}>
                    {renderItem('person-outline', 'アカウント設定', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, handleFeatureNotImplemented, false, '#007AFF')}
                    {renderItem('ban-outline', 'ブロックリスト', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, handleFeatureNotImplemented, true, '#FF3B30')}
                </View>

                {/* Legal */}
                {renderSectionHeader('サポート・規約')}
                <View style={styles.sectionContainer}>
                    {renderItem('document-text-outline', '利用規約', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, onOpenTerms, false, '#8E8E93')}
                    {renderItem('shield-checkmark-outline', 'プライバシーポリシー', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, onOpenPrivacy, false, '#8E8E93')}
                    {renderItem('mail-outline', 'お問い合わせ', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, () => handleOpenURL('mailto:support@bizyou.app'), true, '#007AFF')}
                </View>

                {/* Logout */}
                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>ログアウト</Text>
                    </TouchableOpacity>
                </View>

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
                                        onPress: () => {
                                            Alert.alert("完了", "アカウント削除のリクエストを受け付けました。\n（デモ版のため実際の削除は行われません）", [
                                                { text: "OK", onPress: onLogout }
                                            ]);
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Text style={styles.deleteAccountText}>アカウントを削除する</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: 'white',
        borderBottomWidth: 0.5,
        borderBottomColor: '#C6C6C8',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 13,
        color: '#6D6D72',
        marginLeft: 16,
        marginBottom: 6,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    sectionContainer: {
        backgroundColor: 'white',
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#C6C6C8',
    },
    itemContainer: {
        backgroundColor: 'white',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    itemLabel: {
        fontSize: 17,
        color: '#000',
    },
    separator: {
        height: 0.5,
        backgroundColor: '#C6C6C8',
        marginLeft: 52,
    },
    logoutContainer: {
        marginTop: 32,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#C6C6C8',
    },
    logoutButton: {
        backgroundColor: 'white',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 17,
        color: '#FF3B30',
        fontWeight: '400',
    },
    deleteAccountContainer: {
        marginTop: 32,
        alignItems: 'center',
        marginBottom: 40,
    },
    deleteAccountButton: {
        padding: 12,
    },
    deleteAccountText: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'underline',
    },
});
