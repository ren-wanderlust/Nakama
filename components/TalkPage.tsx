import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatRoom {
    id: string;
    partnerId: string;
    partnerName: string;
    partnerAge: number;
    partnerLocation: string;
    partnerImage: string;
    lastMessage: string;
    unreadCount: number;
    timestamp: string;
    isOnline?: boolean;
}

interface TalkPageProps {
    onOpenChat?: (room: ChatRoom) => void;
}

export function TalkPage({ onOpenChat }: TalkPageProps) {
    const chatRooms: ChatRoom[] = [
        {
            id: 'c1',
            partnerId: 'p1',
            partnerName: 'アヤカ',
            partnerAge: 21,
            partnerLocation: '大阪',
            partnerImage: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
            lastMessage: 'ブランドのコンセプトについて、もう少し詳しくお話できますか？',
            unreadCount: 2,
            timestamp: '15分前',
            isOnline: true,
        },
        {
            id: 'c2',
            partnerId: 'p2',
            partnerName: 'サクラ',
            partnerAge: 22,
            partnerLocation: '東京',
            partnerImage: 'https://images.unsplash.com/photo-1709803312782-0c3b175875ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNyZWF0aXZlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MzUyMDMzNXww&ixlib=rb-4.1.0&q=80&w=1080',
            lastMessage: 'ポートフォリオサイトのUI、一緒に考えませんか？',
            unreadCount: 1,
            timestamp: '1時間前',
            isOnline: true,
        },
        {
            id: 'c3',
            partnerId: 'p3',
            partnerName: 'リョウ',
            partnerAge: 23,
            partnerLocation: '神奈川',
            partnerImage: 'https://images.unsplash.com/photo-1762341116674-784c5dbedeb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwZW50cmVwcmVuZXVyJTIweW91bmd8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
            lastMessage: 'Web3のイベント、一緒に行きませんか？',
            unreadCount: 0,
            timestamp: '2日前',
            isOnline: false,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>トーク</Text>
            </View>

            {/* Chat Rooms List */}
            {chatRooms.length > 0 ? (
                <FlatList
                    data={chatRooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.roomItem}
                            onPress={() => onOpenChat?.(item)}
                            activeOpacity={0.7}
                        >
                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={{ uri: item.partnerImage }}
                                    style={styles.avatar}
                                />
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                <View style={styles.topRow}>
                                    <View style={styles.nameContainer}>
                                        <Text style={styles.name}>{item.partnerName}</Text>
                                        <Text style={styles.details}>
                                            {item.partnerAge}歳 · {item.partnerLocation}
                                        </Text>
                                    </View>
                                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                                </View>

                                <View style={styles.messageRow}>
                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {item.lastMessage}
                                    </Text>
                                    {item.unreadCount > 0 ? (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                        </View>
                                    ) : (
                                        <Ionicons name="checkmark-done" size={16} color="#14b8a6" />
                                    )}
                                </View>
                            </View>

                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>まだトークがありません</Text>
                    <Text style={styles.emptySubText}>
                        マッチングした相手とメッセージを始めましょう！
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    listContent: {
        paddingBottom: 20,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#e5e7eb',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e', // green-500
        borderWidth: 2,
        borderColor: 'white',
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    details: {
        fontSize: 12,
        color: '#6b7280',
    },
    timestamp: {
        fontSize: 12,
        color: '#9ca3af',
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#f97316', // orange-500
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
});
