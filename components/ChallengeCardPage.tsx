import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, TouchableWithoutFeedback, Keyboard, ImageBackground, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Profile } from '../types';
import { isProfileMatchingTheme } from '../utils/themeMatching';

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
    onThemeSelect?: (themeName: string) => void;
    profiles?: Profile[];
}

const ICON_OPTIONS = ['🚀', '💻', '🎨', '🗣️', '💼', '💰', '🌍', '❤️', '📚', '🎮', '🎵', '⚽️'];

const INITIAL_THEMES = [
    { id: 1, icon: '🤖', title: 'AIプロダクト開発', count: 127, image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' },
    { id: 2, icon: '📱', title: 'モバイルアプリ開発', count: 203, image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80' },
    { id: 3, icon: '🚀', title: 'スタートアップ企業', count: 342, image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80' },
    { id: 4, icon: '⛓️', title: 'Web3 / ブロックチェーン', count: 78, image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80' },
    { id: 5, icon: '🏙️', title: '地方創生 / まちづくり', count: 85, image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80' },
    { id: 6, icon: '👗', title: 'D2C / ブランド立ち上げ', count: 94, image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80' },
    { id: 7, icon: '🔥', title: 'ハッカソン / ビジコン', count: 110, image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80' },
    { id: 8, icon: '📚', title: 'EdTech / 教育', count: 62, image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80' },
    { id: 9, icon: '🤝', title: '学生団体 / コミュニティ', count: 156, image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80' },
    { id: 10, icon: '💻', title: 'Vibeコーディング', count: 42, image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80' },
];

export function ChallengeCardPage({ onThemeSelect, profiles = [] }: ChallengeCardPageProps) {
    const [themes, setThemes] = useState(INITIAL_THEMES);
    const [refreshing, setRefreshing] = useState(false);

    const DEFAULT_IMAGES = [
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80',
    ];

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newThemeTitle, setNewThemeTitle] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);

    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 参加人数を集計するロジック
    const countParticipants = useCallback((themeTitle: string) => {
        if (!profiles || profiles.length === 0) return 0;
        return profiles.filter(profile => isProfileMatchingTheme(profile, themeTitle)).length;
    }, [profiles]);

    // テーマを参加人数順（降順）にソート
    const sortedThemes = useMemo(() => {
        const themesWithCount = themes.map(theme => ({
            ...theme,
            dynamicCount: countParticipants(theme.title)
        }));
        return themesWithCount.sort((a, b) => b.dynamicCount - a.dynamicCount);
    }, [themes, countParticipants]);

    const filteredThemes = sortedThemes.filter(theme =>
        theme.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // 擬似的なリロード処理（本来はAPIからデータを再取得する）
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    }, []);

    const handleCreateTheme = () => {
        if (!newThemeTitle.trim()) {
            Alert.alert('エラー', 'テーマ名を入力してください');
            return;
        }

        const newTheme = {
            id: Date.now(),
            icon: selectedIcon,
            title: newThemeTitle,
            count: 0,
            image: DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)]
        };
        setThemes([newTheme, ...themes]);

        console.log('New Theme Created:', newTheme);
        Alert.alert('完了', 'テーマを作成しました！');
        setIsModalVisible(false);
        setNewThemeTitle('');
        setSelectedIcon(ICON_OPTIONS[0]);
    };

    return (
        <View style={styles.container}>
            {/* Header - Navigation Bar Style */}
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
                        {sortedThemes.map((item) => (
                            <ThemeCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                count={item.dynamicCount} // ソート済みの計算結果を使用
                                image={item.image}
                                onPress={() => onThemeSelect?.(item.title)}
                            />
                        ))}
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setIsModalVisible(true)}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Create Theme Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>新しい挑戦テーマを作成</Text>

                            <Text style={styles.inputLabel}>どんなテーマで募集しますか？</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="例: 週末ハッカソン仲間募集"
                                value={newThemeTitle}
                                onChangeText={setNewThemeTitle}
                            />

                            <Text style={styles.inputLabel}>アイコンを選んでください</Text>
                            <View style={styles.iconGrid}>
                                {ICON_OPTIONS.map((icon) => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[
                                            styles.iconOption,
                                            selectedIcon === icon && styles.iconOptionSelected
                                        ]}
                                        onPress={() => setSelectedIcon(icon)}
                                    >
                                        <Text style={styles.iconText}>{icon}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setIsModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.createButton,
                                        !newThemeTitle.trim() && styles.createButtonDisabled
                                    ]}
                                    onPress={handleCreateTheme}
                                    disabled={!newThemeTitle.trim()}
                                >
                                    <Text style={styles.createButtonText}>作成する</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

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
                                            count={countParticipants(item.title)}
                                            image={item.image}
                                            onPress={() => {
                                                onThemeSelect?.(item.title);
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
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#009688',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
        justifyContent: 'center',
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconOptionSelected: {
        borderColor: '#009688',
        backgroundColor: '#E0F2F1',
    },
    iconText: {
        fontSize: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    createButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#009688',
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
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
