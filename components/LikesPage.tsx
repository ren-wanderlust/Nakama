import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types';
import { ProfileCard } from './ProfileCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LikesPageProps {
    likedProfileIds: Set<string>;
    allProfiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
}



export function LikesPage({ likedProfileIds, allProfiles, onProfileSelect }: LikesPageProps) {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('sent');
    const [receivedLikes, setReceivedLikes] = useState<Profile[]>([]);

    React.useEffect(() => {
        const fetchReceivedLikes = async () => {
            if (!session?.user) return;

            const { data: likes, error } = await supabase
                .from('likes')
                .select('sender_id')
                .eq('receiver_id', session.user.id);

            if (error) {
                console.error('Error fetching received likes:', error);
                return;
            }

            if (likes && likes.length > 0) {
                const senderIds = likes.map(l => l.sender_id);
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', senderIds);

                if (profilesError) {
                    console.error('Error fetching profiles for received likes:', profilesError);
                    return;
                }

                if (profiles) {
                    const mappedProfiles: Profile[] = profiles.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        age: item.age,
                        location: item.location || '',
                        university: item.university,
                        company: item.company,
                        image: item.image,
                        challengeTheme: item.challenge_theme || '',
                        theme: item.theme || '',
                        bio: item.bio,
                        skills: item.skills || [],
                        seekingFor: item.seeking_for || [],
                        seekingRoles: item.seeking_roles || [],
                        statusTags: item.status_tags || [],
                        isStudent: item.is_student,
                        createdAt: item.created_at,
                    }));
                    setReceivedLikes(mappedProfiles);
                }
            } else {
                setReceivedLikes([]);
            }
        };

        fetchReceivedLikes();
    }, [session, activeTab]);

    // Filter profiles based on likedProfileIds
    // Exclude those who are also in receivedLikes (Matched)
    const receivedLikeIds = new Set(receivedLikes.map(p => p.id));
    const sentLikes = allProfiles.filter(profile =>
        likedProfileIds.has(profile.id) && !receivedLikeIds.has(profile.id)
    );

    // Filter receivedLikes to exclude those who are also in likedProfileIds (Matched)
    const displayReceivedLikes = receivedLikes.filter(profile =>
        !likedProfileIds.has(profile.id)
    );

    const renderContent = () => {
        const data = activeTab === 'received' ? displayReceivedLikes : sentLikes;
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
                                {displayReceivedLikes.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{displayReceivedLikes.length}</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        ) : (
                            <View style={styles.tabContentInactive}>
                                <Text style={styles.tabTextInactive}>あなたに興味あり</Text>
                                {displayReceivedLikes.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{displayReceivedLikes.length}</Text>
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
        height: 44, // Fixed height
    },
    tabButtonActive: {
        backgroundColor: 'transparent',
    },
    tabGradient: {
        flex: 1, // Fill the fixed height
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    tabContentInactive: {
        flex: 1, // Fill the fixed height
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
        backgroundColor: '#FF7F11',
        height: 20,
        minWidth: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
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
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: 12,
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
