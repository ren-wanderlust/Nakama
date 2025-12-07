import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { ProfileCard } from './ProfileCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProfileListSkeleton } from './Skeleton';
import { LikesEmptyState } from './EmptyState';

interface LikesPageProps {
    likedProfileIds: Set<string>;
    allProfiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
    onLike: (profileId: string) => void;
}

export function LikesPage({ likedProfileIds, allProfiles, onProfileSelect, onLike }: LikesPageProps) {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [receivedLikes, setReceivedLikes] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const listRef = useRef<FlatList>(null);

    React.useEffect(() => {
        const fetchReceivedLikes = async () => {
            if (!session?.user) {
                setLoading(false);
                return;
            }

            try {
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
                            grade: item.grade || '',
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
            } catch (error) {
                console.error('Error in fetchReceivedLikes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReceivedLikes();
    }, [session]);

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

    const renderReceivedList = () => {
        if (loading) {
            return <ProfileListSkeleton count={4} />;
        }

        if (displayReceivedLikes.length === 0) {
            return <LikesEmptyState type="received" />;
        }

        return (
            <FlatList
                data={displayReceivedLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={false}
                            onLike={() => onLike(item.id)}
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

    const renderSentList = () => {
        if (sentLikes.length === 0) {
            return <LikesEmptyState type="sent" />;
        }

        return (
            <FlatList
                data={sentLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true}
                            onLike={() => onLike(item.id)}
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
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'received' && styles.tabButtonActive]}
                        onPress={() => {
                            setActiveTab('received');
                            listRef.current?.scrollToIndex({ index: 0, animated: true });
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
                            あなたに興味あり
                        </Text>
                        {displayReceivedLikes.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{displayReceivedLikes.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'sent' && styles.tabButtonActive]}
                        onPress={() => {
                            setActiveTab('sent');
                            listRef.current?.scrollToIndex({ index: 1, animated: true });
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                            送ったいいね
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Swipeable Content */}
            <FlatList
                ref={listRef}
                data={['received', 'sent']}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                    setActiveTab(index === 0 ? 'received' : 'sent');
                }}
                getItemLayout={(data, index) => (
                    { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                )}
                initialScrollIndex={0}
                renderItem={({ item }) => (
                    <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                        {item === 'received' ? renderReceivedList() : renderSentList()}
                    </View>
                )}
            />
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
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        alignItems: 'center',
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
        justifyContent: 'center',
        gap: 24,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: '#009688',
    },
    tabText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#009688',
        fontWeight: 'bold',
    },
    badge: {
        backgroundColor: '#FF7F11',
        height: 18,
        minWidth: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
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
        justifyContent: 'flex-start',
        paddingTop: 120,
        paddingHorizontal: 32,
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
