import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile, Theme } from '../types';
import { ProfileCard } from './ProfileCard';
import { supabase } from '../lib/supabase';

interface ThemeDetailPageProps {
    theme: Theme;
    onBack: () => void;
    profiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
    onLike: (id: string) => void;
    likedProfileIds: Set<string>;
    currentUser: Profile | null;
}

export function ThemeDetailPage({ theme, onBack, profiles, onProfileSelect, onLike, likedProfileIds, currentUser }: ThemeDetailPageProps) {
    const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        fetchParticipants();
    }, [theme.id]);

    const fetchParticipants = async () => {
        try {
            const { data, error } = await supabase
                .from('theme_participants')
                .select('user_id')
                .eq('theme_id', theme.id);

            if (error) throw error;

            if (data) {
                setParticipantIds(new Set(data.map((item: any) => item.user_id)));
            }
        } catch (error) {
            console.error('Error fetching participants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!currentUser) return;
        setJoining(true);
        try {
            const { error } = await supabase
                .from('theme_participants')
                .insert({
                    theme_id: theme.id,
                    user_id: currentUser.id
                });

            if (error) throw error;

            setParticipantIds(prev => new Set(prev).add(currentUser.id));
            Alert.alert('完了', 'テーマに参加しました！');
        } catch (error: any) {
            console.error('Error joining theme:', error);
            Alert.alert('エラー', '参加に失敗しました');
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!currentUser) return;
        setJoining(true);
        try {
            const { error } = await supabase
                .from('theme_participants')
                .delete()
                .eq('theme_id', theme.id)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            setParticipantIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentUser.id);
                return newSet;
            });
            Alert.alert('完了', 'テーマへの参加を取り消しました');
        } catch (error: any) {
            console.error('Error leaving theme:', error);
            Alert.alert('エラー', 'キャンセルに失敗しました');
        } finally {
            setJoining(false);
        }
    };

    // Filter profiles based on participant IDs
    const themeParticipants = React.useMemo(() => {
        return profiles.filter(profile => participantIds.has(profile.id));
    }, [profiles, participantIds]);

    const isJoined = currentUser ? participantIds.has(currentUser.id) : false;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#009688" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{theme.title}</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Theme Info Header */}
            <View style={styles.themeInfoContainer}>
                <View style={styles.themeIconContainer}>
                    <Text style={styles.themeIcon}>{theme.icon}</Text>
                </View>
                <View style={styles.themeTextContainer}>
                    <Text style={styles.themeTitle}>{theme.title}</Text>
                    <Text style={styles.participantCount}>
                        <Ionicons name="people" size={16} color="#6B7280" /> {participantIds.size}人が参加中
                    </Text>
                </View>
                {currentUser && (
                    <TouchableOpacity
                        style={[styles.joinButton, isJoined ? styles.leaveButton : styles.joinButtonActive]}
                        onPress={isJoined ? handleLeave : handleJoin}
                        disabled={joining}
                    >
                        {joining ? (
                            <ActivityIndicator size="small" color={isJoined ? "#6B7280" : "white"} />
                        ) : (
                            <Text style={[styles.joinButtonText, isJoined && styles.leaveButtonText]}>
                                {isJoined ? '参加中' : '参加する'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#009688" />
                </View>
            ) : (
                <FlatList
                    data={themeParticipants}
                    renderItem={({ item }) => (
                        <View style={styles.gridItem}>
                            <ProfileCard
                                profile={item}
                                isLiked={likedProfileIds.has(item.id)}
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>まだ参加者はいません。</Text>
                            <Text style={styles.emptySubText}>一番乗りで参加しましょう！</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        maxWidth: '70%',
    },
    themeInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    themeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    themeIcon: {
        fontSize: 24,
    },
    themeTextContainer: {
        flex: 1,
    },
    themeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    participantCount: {
        fontSize: 14,
        color: '#6B7280',
    },
    joinButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    joinButtonActive: {
        backgroundColor: '#009688',
    },
    leaveButton: {
        backgroundColor: '#E5E7EB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    joinButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
    leaveButtonText: {
        color: '#374151',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});
