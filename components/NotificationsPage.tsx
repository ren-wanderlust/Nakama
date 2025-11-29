import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    type: 'important' | 'update' | 'psychology' | 'other';
    title: string;
    content?: string;
    date: string;
    imageUrl?: string;
    created_at: string;
}

interface NotificationsPageProps {
    onBack: () => void;
}

export function NotificationsPage({ onBack }: NotificationsPageProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedNotifications: Notification[] = data.map((item: any) => ({
                    id: item.id,
                    type: item.type,
                    title: item.title,
                    content: item.content,
                    imageUrl: item.image_url,
                    created_at: item.created_at,
                    date: new Date(item.created_at).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        weekday: 'short',
                    }),
                }));
                setNotifications(formattedNotifications);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            Alert.alert('エラー', 'お知らせの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'important':
                return { backgroundColor: '#FF5252', text: '重要' };
            case 'update':
                return { backgroundColor: '#9E9E9E', text: 'アップデート' };
            case 'psychology':
                return { backgroundColor: '#E040FB', text: '心理テスト' };
            default:
                return { backgroundColor: '#2196F3', text: 'お知らせ' };
        }
    };

    const handleNotificationPress = (item: Notification) => {
        Alert.alert(item.title, item.content || "詳細情報はここに表示されます。");
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const badge = getBadgeStyle(item.type);
        return (
            <TouchableOpacity style={styles.itemContainer} onPress={() => handleNotificationPress(item)}>
                {/* Icon/Image */}
                <View style={styles.iconContainer}>
                    {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.iconImage} />
                    ) : (
                        <View style={styles.placeholderIcon} />
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
                refreshing={loading}
                onRefresh={fetchNotifications}
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
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    placeholderIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
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
