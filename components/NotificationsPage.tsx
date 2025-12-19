import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../data/hooks/useNotifications';
import { markNotificationsAsRead } from '../data/api/notifications';
import type { FormattedNotification as Notification } from '../data/api/notifications';
import { useAuth } from '../contexts/AuthContext';

interface NotificationsPageProps {
    onBack: () => void;
    onNotificationsRead?: () => void;
    onViewProject?: (projectId: string) => void;
    onViewProfile?: (userId: string) => void;
}

export function NotificationsPage({ onBack, onNotificationsRead, onViewProject, onViewProfile }: NotificationsPageProps) {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const [refreshing, setRefreshing] = useState(false);

    // React Query hook
    const notificationsQuery = useNotifications(userId);
    const notifications: Notification[] = notificationsQuery.data || [];
    const loading = notificationsQuery.isLoading;

    // Force refresh on mount to ensure latest data
    useEffect(() => {
        if (userId) {
            notificationsQuery.refetch();
        }
    }, []);

    // Mark user-specific notifications as read when page is opened
    useEffect(() => {
        const markAllAsRead = async () => {
            if (!userId) return;

            try {
                // Mark user-specific notifications as read (いいね, マッチング etc.)
                // Public notifications (user_id is null) are shared across all users,
                // so we only mark user-specific ones as read
                await markNotificationsAsRead(userId);

                // Notify parent to refresh count
                if (onNotificationsRead) {
                    onNotificationsRead();
                }
            } catch (error) {
                console.error('Error marking notifications as read:', error);
            }
        };

        markAllAsRead();
    }, [userId, onNotificationsRead]);

    // Handle fetch errors
    useEffect(() => {
        if (notificationsQuery.error) {
            console.error('Error fetching notifications:', notificationsQuery.error);
            Alert.alert('エラー', 'お知らせの取得に失敗しました');
        }
    }, [notificationsQuery.error]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await notificationsQuery.refetch();
        setRefreshing(false);
    }, [notificationsQuery]);

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'important':
                return { backgroundColor: '#FF5252', text: '重要' };
            case 'update':
                return { backgroundColor: '#9E9E9E', text: 'アップデート' };
            case 'psychology':
                return { backgroundColor: '#E040FB', text: '心理テスト' };
            case 'like':
                return { backgroundColor: '#FF7F11', text: 'いいね' };
            case 'match':
                return { backgroundColor: '#009688', text: 'マッチング' };
            case 'application':
                return { backgroundColor: '#2196F3', text: 'プロジェクト応募' };
            case 'application_status':
                return { backgroundColor: '#4CAF50', text: '応募結果' };
            default:
                return { backgroundColor: '#2196F3', text: 'お知らせ' };
        }
    };

    const handleNotificationPress = (item: Notification) => {
        console.log('Notification tapped:', {
            title: item.title,
            type: item.type,
            projectId: item.projectId,
            relatedUserId: item.relatedUserId,
            senderId: item.senderId
        });

        // プロジェクト応募通知の場合は、応募者のプロフィールを表示
        if (item.type === 'application' && item.senderId && onViewProfile) {
            console.log('Navigating to applicant profile:', item.senderId);
            onBack(); // 通知ページを閉じる
            onViewProfile(item.senderId);
        }
        // その他のプロジェクト関連の通知（応募ステータス変更など）
        else if (item.projectId && onViewProject) {
            console.log('Navigating to project:', item.projectId);
            onBack(); // 通知ページを閉じる
            onViewProject(item.projectId);
        }
        // ユーザー関連の通知（いいね、マッチング）
        else if (item.relatedUserId && onViewProfile) {
            console.log('Navigating to profile:', item.relatedUserId);
            onBack(); // 通知ページを閉じる
            onViewProfile(item.relatedUserId);
        }
        // その他の通知
        else {
            console.log('No navigation data, showing alert');
            Alert.alert(item.title, item.content || "詳細情報はここに表示されます。");
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const badge = getBadgeStyle(item.type);
        // ユーザー由来の通知は丸アイコン（いいね / マッチング / 応募ステータス）
        const isUserNotification =
            item.type === 'like' ||
            item.type === 'match' ||
            item.type === 'application_status';

        return (
            <TouchableOpacity style={styles.itemContainer} onPress={() => handleNotificationPress(item)}>
                {/* Icon/Image */}
                <View style={styles.iconContainer}>
                    {item.imageUrl ? (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={[
                                styles.iconImage,
                                (isUserNotification || true) && styles.iconImageRound
                            ]}
                        />
                    ) : (
                        <View style={[
                            styles.placeholderIcon,
                            (isUserNotification || true) && styles.iconImageRound
                        ]} />
                    )}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                            <Text style={styles.badgeText}>{badge.text}</Text>
                        </View>
                        <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                    <Text style={styles.titleText} numberOfLines={2}>
                        {item.title}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>まだお知らせはありません</Text>
            <Text style={styles.emptySubText}>新しいお知らせが届くまでお待ちください</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>お知らせ</Text>
                    <View style={{ width: 28 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#009688" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>お知らせ</Text>
                <View style={{ width: 28 }} />
            </View>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.flexGrow
                ]}
                ListEmptyComponent={renderEmpty}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        paddingBottom: 20,
    },
    flexGrow: {
        flexGrow: 1,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        alignItems: 'flex-start',
    },
    iconContainer: {
        marginRight: 12,
    },
    iconImage: {
        width: 48,
        height: 48,
        borderRadius: 24, // 丸型
        backgroundColor: '#eee',
    },
    iconImageRound: {
        borderRadius: 24, // 48 / 2 = 24 for perfect circle
    },
    placeholderIcon: {
        width: 48,
        height: 48,
        borderRadius: 24, // 丸型
        backgroundColor: '#eee',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    titleText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
});
