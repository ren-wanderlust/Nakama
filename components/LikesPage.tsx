import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types';
import { ProfileCard } from './ProfileCard';

interface LikesPageProps {
    likedProfileIds: Set<string>;
    allProfiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
}

// Mock data for received likes (since we don't have real backend yet)
const receivedLikesMock: Profile[] = [
    {
        id: 'r1',
        name: 'アヤカ',
        age: 21,
        location: '大阪',
        university: '大阪大学',
        image: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
        challengeTheme: 'サステナブルファッションブランド立ち上げ',
        skills: ['マーケティング', 'デザイン', 'SNS運用'],
        isStudent: true,
    },
    {
        id: 'r2',
        name: 'サクラ',
        age: 22,
        location: '東京',
        university: '東京大学',
        image: 'https://images.unsplash.com/photo-1709803312782-0c3b175875ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNyZWF0aXZlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MzUyMDMzNXww&ixlib=rb-4.1.0&q=80&w=1080',
        challengeTheme: 'クリエイター向けポートフォリオプラットフォーム',
        skills: ['Figma', 'デザインシステム', 'ブランディング'],
        isStudent: true,
    },
];

export function LikesPage({ likedProfileIds, allProfiles, onProfileSelect }: LikesPageProps) {
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('sent'); // Default to 'sent' per user instruction context

    // Filter profiles based on likedProfileIds
    const sentLikes = allProfiles.filter(profile => likedProfileIds.has(profile.id));

    const renderContent = () => {
        const data = activeTab === 'received' ? receivedLikesMock : sentLikes;
        const emptyMessage = activeTab === 'received' ? 'まだいいねがありません' : 'まだいいねを送っていません';
        const emptySubMessage = activeTab === 'received' ? 'プロフィールを充実させて待ちましょう！' : '気になる相手を探してみましょう！';

        if (data.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>{emptyMessage}</Text>
                    <Text style={styles.emptySubText}>{emptySubMessage}</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={data}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true} // Always liked in this view (or received like)
                            onLike={() => { }} // No-op or unlike logic
                            onSelect={() => onProfileSelect(item)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>いいね</Text>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('received')}
                        style={[styles.tabButton, activeTab === 'received' && styles.tabButtonActive]}
                    >
                        {activeTab === 'received' ? (
                            <LinearGradient
                                colors={['#0d9488', '#2563eb']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.tabGradient}
                            >
                                <Text style={styles.tabTextActive}>あなたに興味あり</Text>
                                {receivedLikesMock.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{receivedLikesMock.length}</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        ) : (
                            <View style={styles.tabContentInactive}>
                                <Text style={styles.tabTextInactive}>あなたに興味あり</Text>
                                {receivedLikesMock.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{receivedLikesMock.length}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('sent')}
                        style={[styles.tabButton, activeTab === 'sent' && styles.tabButtonActive]}
                    >
                        {activeTab === 'sent' ? (
                            <LinearGradient
                                colors={['#0d9488', '#2563eb']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.tabGradient}
                            >
                                <Text style={styles.tabTextActive}>送ったいいね</Text>
                            </LinearGradient>
                        ) : (
                            <View style={styles.tabContentInactive}>
                                <Text style={styles.tabTextInactive}>送ったいいね</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {renderContent()}
            </View>
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
        paddingTop: 16, // SafeArea handled by parent or header height
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#111827',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6', // gray-100
    },
    tabButtonActive: {
        backgroundColor: 'transparent',
    },
    tabGradient: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    tabContentInactive: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    tabTextActive: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tabTextInactive: {
        color: '#4b5563', // gray-600
        fontSize: 12,
        fontWeight: '500',
    },
    badge: {
        backgroundColor: '#f97316', // orange-500
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: -4,
        right: -4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    gridItem: {
        // width handled in ProfileCard
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
    },
});
