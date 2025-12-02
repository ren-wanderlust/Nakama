import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, ImageBackground, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Theme } from '../types';

interface ThemeCardProps {
    icon: string;
    title: string;
    count: number;
    image: string;
    onPress: () => void;
}

const ThemeCard = ({ icon, title, count, image, onPress }: ThemeCardProps) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        <ImageBackground
            source={{ uri: image }}
            style={styles.cardBackground}
            imageStyle={{ borderRadius: 16 }}
        >
            <View style={styles.cardOverlay}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.countContainer}>
                        <Ionicons name="people" size={14} color="white" />
                        <Text style={styles.cardCount}>{count}人が挑戦中</Text>
                    </View>
                    <View style={styles.actionLink}>
                        <Text style={styles.actionLinkText}>👉 参加者を見る</Text>
                    </View>
                </View>
            </View>
        </ImageBackground>
    </TouchableOpacity>
);

interface ChallengeCardPageProps {
    onThemeSelect?: (theme: Theme) => void;
    hideHeader?: boolean;
}

export function ChallengeCardPage({ onThemeSelect, hideHeader = false }: ChallengeCardPageProps) {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchThemes = async () => {
        try {
            // Fetch themes
            const { data: themesData, error: themesError } = await supabase
                .from('themes')
                .select('*');

            if (themesError) throw themesError;

            // Fetch participant counts
            // Note: For a large app, this should be a view or a separate count query per item, or stored in the themes table.
            // For now, we'll fetch all participants to count them client-side or do a join if possible.
            // A better approach for scalability is to use a database function or view.
            // Let's try to get counts by grouping. Supabase JS client doesn't support simple GroupBy count easily without rpc.
            // We will fetch all participants for now (assuming not too many yet) or just fetch counts per theme.

            // Optimization: Fetch participant counts using a separate query or RPC is better.
            // For simplicity in this step, we will just fetch themes. 
            // To show real counts, we would ideally have a 'participant_count' column in 'themes' updated via triggers,
            // or fetch counts individually.

            // Let's fetch all participants to count (Not scalable but works for MVP)
            const { data: participantsData, error: participantsError } = await supabase
                .from('theme_participants')
                .select('theme_id');

            if (participantsError) throw participantsError;

            const counts: Record<string, number> = {};
            participantsData?.forEach((p: any) => {
                counts[p.theme_id] = (counts[p.theme_id] || 0) + 1;
            });

            const formattedThemes: Theme[] = themesData.map((theme: any) => ({
                id: theme.id,
                icon: theme.icon,
                title: theme.title,
                image_url: theme.image_url,
                participant_count: counts[theme.id] || 0,
            }));

            // Sort by count descending
            formattedThemes.sort((a, b) => (b.participant_count || 0) - (a.participant_count || 0));

            setThemes(formattedThemes);
        } catch (error) {
            console.error('Error fetching themes:', error);
            Alert.alert('エラー', 'テーマの取得に失敗しました');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchThemes();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchThemes();
    }, []);

    const filteredThemes = themes.filter(theme =>
        theme.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header - Navigation Bar Style */}
            {!hideHeader && (
                <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                        <View style={styles.logoRow}>
                            <Ionicons name="bulb-outline" size={24} color="#374151" style={{ marginRight: 4 }} />
                            <Text style={styles.arrowDecoration}>{'>>'}</Text>
                            <Text style={styles.headerLogoText}>挑戦テーマ</Text>
                            <Ionicons name="settings-outline" size={20} color="#0d9488" style={{ marginLeft: 4, marginTop: 4 }} />
                        </View>
                        <View style={styles.underlineContainer}>
                            <View style={styles.underline} />
                            <Ionicons name="chevron-down" size={12} color="#0d9488" style={styles.underlineIcon} />
                            <View style={styles.underline} />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => setIsSearchModalVisible(true)}
                    >
                        <Ionicons name="search-outline" size={28} color="#333" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#009688']}
                        tintColor="#009688"
                    />
                }
            >
                <View style={styles.gridContainer}>
                    <View style={styles.grid}>
                        {themes.map((item) => (
                            <ThemeCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                count={item.participant_count || 0}
                                image={item.image_url}
                                onPress={() => onThemeSelect?.(item)}
                            />
                        ))}
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Search Modal */}
            <Modal
                visible={isSearchModalVisible}
                animationType="slide"
                onRequestClose={() => setIsSearchModalVisible(false)}
            >
                <View style={styles.searchModalContainer}>
                    <View style={styles.searchHeader}>
                        <TouchableOpacity onPress={() => setIsSearchModalVisible(false)}>
                            <Text style={styles.cancelText}>キャンセル</Text>
                        </TouchableOpacity>
                        <Text style={styles.searchTitle}>検索</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <View style={styles.searchBarContainer}>
                        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="テーマ名で検索..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.gridContainer}>
                            {searchQuery ? (
                                <View style={styles.grid}>
                                    {filteredThemes.map((item) => (
                                        <ThemeCard
                                            key={item.id}
                                            icon={item.icon}
                                            title={item.title}
                                            count={item.participant_count || 0}
                                            image={item.image_url}
                                            onPress={() => {
                                                onThemeSelect?.(item);
                                                setIsSearchModalVisible(false);
                                            }}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptySearchContainer}>
                                    <Text style={styles.emptySearchText}>検索ワードを入力してください</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        height: 90,
        paddingTop: 45,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        position: 'relative',
        zIndex: 10,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogoText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937', // Dark Navy/Black
        letterSpacing: 1,
        marginHorizontal: 4,
    },
    arrowDecoration: {
        fontSize: 20,
        color: '#374151',
        fontWeight: '300',
        marginRight: 4,
    },
    underlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -4,
        width: '100%',
        justifyContent: 'center',
    },
    underline: {
        height: 2,
        backgroundColor: '#0d9488', // Teal accent
        flex: 1,
        maxWidth: 80,
        borderRadius: 1,
    },
    underlineIcon: {
        marginHorizontal: 4,
    },
    searchButton: {
        position: 'absolute',
        right: 16,
        bottom: 12,
        padding: 4,
    },
    content: {
        flex: 1,
    },
    gridContainer: {
        padding: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: (Dimensions.get('window').width - 32 - 12) / 2,
        height: (Dimensions.get('window').width - 32 - 12) / 2 * 1.1, // Slightly taller
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 4,
    },
    cardBackground: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)', // Dark overlay for readability
        padding: 12,
        justifyContent: 'space-between',
    },
    cardHeader: {
        alignItems: 'flex-start',
    },
    cardIcon: {
        fontSize: 24,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        width: '100%',
    },
    cardFooter: {
        width: '100%',
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    cardCount: {
        fontSize: 11,
        color: '#E5E7EB',
        fontWeight: '600',
    },
    actionLink: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.3)',
        paddingTop: 6,
    },
    actionLinkText: {
        fontSize: 11,
        color: '#FFEB3B', // Yellow accent
        fontWeight: 'bold',
    },
    searchModalContainer: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        paddingTop: 50,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    cancelText: {
        fontSize: 16,
        color: '#009688',
    },
    searchTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    emptySearchContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptySearchText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
});
