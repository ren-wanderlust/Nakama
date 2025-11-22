import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ThemeCardProps {
    icon: string;
    title: string;
    count: number;
    onPress: () => void;
}

const ThemeCard = ({ icon, title, count, onPress }: ThemeCardProps) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>{icon}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.cardFooter}>
            <Ionicons name="people-outline" size={12} color="#6b7280" />
            <Text style={styles.cardCount}>{count}人が挑戦中</Text>
        </View>
        <View style={styles.actionLink}>
            <Text style={styles.actionLinkText}>👉 参加者を見る</Text>
        </View>
    </TouchableOpacity>
);

interface ChallengeCardPageProps {
    onThemeSelect?: (themeName: string) => void;
}

const ICON_OPTIONS = ['🚀', '💻', '🎨', '🗣️', '💼', '💰', '🌍', '❤️', '📚', '🎮', '🎵', '⚽️'];

export function ChallengeCardPage({ onThemeSelect }: ChallengeCardPageProps) {
    const [themes, setThemes] = useState([
        { id: 1, icon: '🤖', title: 'AIプロダクト開発', count: 127 },
        { id: 2, icon: '🌍', title: 'SDGs・社会課題', count: 85 },
        { id: 3, icon: '📱', title: 'モバイルアプリ', count: 203 },
        { id: 4, icon: '🎨', title: 'UI/UXデザイン', count: 94 },
        { id: 5, icon: '🚀', title: 'スタートアップ', count: 342 },
        { id: 6, icon: '💰', title: 'FinTech', count: 156 },
        { id: 7, icon: '🎮', title: 'GameFi / Web3', count: 78 },
        { id: 8, icon: '📢', title: 'マーケティング', count: 112 },
    ]);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newThemeTitle, setNewThemeTitle] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);

    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredThemes = themes.filter(theme =>
        theme.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateTheme = () => {
        if (!newThemeTitle.trim()) {
            Alert.alert('エラー', 'テーマ名を入力してください');
            return;
        }

        const newTheme = {
            id: Date.now(),
            icon: selectedIcon,
            title: newThemeTitle,
            count: 0
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
                <Text style={styles.headerTitle}>挑戦テーマ</Text>
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => setIsSearchModalVisible(true)}
                >
                    <Ionicons name="search-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.gridContainer}>
                    <View style={styles.grid}>
                        {themes.map((item) => (
                            <ThemeCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                count={item.count}
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
                                            count={item.count}
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
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
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
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 0,
    },
    cardIconContainer: {
        width: 52,
        height: 52,
        backgroundColor: '#F5F7FA',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardIcon: {
        fontSize: 26,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        height: 44,
        lineHeight: 22,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardCount: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    actionLink: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    actionLinkText: {
        fontSize: 12,
        color: '#009688',
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
