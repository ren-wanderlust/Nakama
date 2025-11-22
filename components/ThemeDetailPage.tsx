import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { ProfileCard } from './ProfileCard';

interface ThemeDetailPageProps {
    themeTitle: string;
    onBack: () => void;
    profiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
    onLike: (id: string) => void;
    likedProfileIds: Set<string>;
}

export function ThemeDetailPage({ themeTitle, onBack, profiles, onProfileSelect, onLike, likedProfileIds }: ThemeDetailPageProps) {
    // Filter profiles based on the selected theme title
    const filteredProfiles = React.useMemo(() => {
        // Split theme title into keywords (e.g., "SDGs・社会課題" -> ["SDGs", "社会課題"])
        const keywords = themeTitle.split(/・|\s+/).filter(k => k.length > 0);

        return profiles.filter(profile => {
            // Check if any keyword matches relevant profile fields
            return keywords.some(keyword => {
                const lowerKeyword = keyword.toLowerCase();
                return (
                    profile.challengeTheme.toLowerCase().includes(lowerKeyword) ||
                    profile.theme.toLowerCase().includes(lowerKeyword) ||
                    profile.bio.toLowerCase().includes(lowerKeyword) ||
                    (profile.skills && profile.skills.some(skill => skill.toLowerCase().includes(lowerKeyword)))
                );
            });
        });
    }, [themeTitle, profiles]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{themeTitle}</Text>
                <View style={{ width: 28 }} />
            </View>
            <FlatList
                data={filteredProfiles}
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
                        <Text style={styles.emptyText}>このテーマに参加しているユーザーはいません</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
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
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
});
