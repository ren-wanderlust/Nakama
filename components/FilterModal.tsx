import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    Platform,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticTouchable, triggerHaptic } from './HapticButton';
import { getRoleColors, getRoleIcon } from '../constants/RoleConstants';
import { translateTag } from '../constants/TagConstants';
import universitiesData from '../assets/japanese_universities.json';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FilterCriteria {
    keyword: string;
    university: string;
    grades: string[];
    seekingRoles: string[];
    themes?: string[];
}

// 学年オプション
const GRADE_OPTIONS = [
    { value: 'B1', label: 'B1', icon: '🎓' },
    { value: 'B2', label: 'B2', icon: '🎓' },
    { value: 'B3', label: 'B3', icon: '🎓' },
    { value: 'B4', label: 'B4', icon: '🎓' },
    { value: 'M1', label: 'M1', icon: '📚' },
    { value: 'M2', label: 'M2', icon: '📚' },
];

// 探している仲間オプション
const SEEKING_ROLE_OPTIONS = [
    { id: 'engineer', label: 'エンジニア', icon: '💻' },
    { id: 'designer', label: 'デザイナー', icon: '🎨' },
    { id: 'marketer', label: 'マーケター', icon: '📣' },
    { id: 'ideaman', label: 'アイディアマン', icon: '💡' },
    { id: 'creator', label: 'クリエイター', icon: '🎥' },
    { id: 'other', label: 'その他', icon: '✨' },
];

const THEME_OPTIONS = [
    { id: '個人開発', label: '個人開発', color: '#3B82F6', bgColor: '#EFF6FF' },
    { id: '起業', label: '起業', color: '#8B5CF6', bgColor: '#F5F3FF' },
    { id: 'クリエイティブ', label: 'クリエイティブ', color: '#EC4899', bgColor: '#FDF2F8' },
    { id: 'コミュニティづくり', label: 'コミュニティづくり', color: '#F97316', bgColor: '#FFF7ED' },
    { id: '教育', label: '教育', color: '#10B981', bgColor: '#ECFDF5' },
    { id: 'コンテスト', label: 'コンテスト', color: '#EF4444', bgColor: '#FEF2F2' },
];

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (criteria: FilterCriteria) => void;
    initialCriteria?: FilterCriteria;
    mode?: 'users' | 'projects';
}

export function FilterModal({ visible, onClose, onApply, initialCriteria, mode = 'users' }: FilterModalProps) {
    const [keyword, setKeyword] = useState(initialCriteria?.keyword || '');
    const [university, setUniversity] = useState(initialCriteria?.university || '');
    const [selectedGrades, setSelectedGrades] = useState<string[]>(initialCriteria?.grades || []);
    const [selectedSeekingRoles, setSelectedSeekingRoles] = useState<string[]>(initialCriteria?.seekingRoles || []);
    const [selectedThemes, setSelectedThemes] = useState<string[]>(initialCriteria?.themes || []);

    const [showUniversityModal, setShowUniversityModal] = useState(false);
    const [universitySearch, setUniversitySearch] = useState('');
    const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);
    const [allUniversities, setAllUniversities] = useState<string[]>([]);

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

    // Load universities
    useEffect(() => {
        // Load universities from JSON data
        if (mode === 'users') {
            const universities = universitiesData as string[];
            setAllUniversities(universities);
        }
    }, [mode]);

    // Filter universities by search
    useEffect(() => {
        if (!universitySearch.trim()) {
            setFilteredUniversities(allUniversities.slice(0, 50));
            return;
        }

        const searchTerm = universitySearch.trim().toLowerCase();
        const filtered = allUniversities.filter(uni =>
            uni.toLowerCase().includes(searchTerm)
        ).slice(0, 50);

        setFilteredUniversities(filtered);
    }, [universitySearch, allUniversities]);

    // Animation
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        setKeyword('');
        setUniversity('');
        setSelectedGrades([]);
        setSelectedSeekingRoles([]);
        setSelectedThemes([]);
        setShowResetConfirm(false);
        triggerHaptic('success');
    };

    const handleApply = () => {
        onApply({
            keyword,
            university,
            grades: selectedGrades,
            seekingRoles: selectedSeekingRoles,
            themes: selectedThemes,
        });
        onClose();
    };

    const toggleGrade = (grade: string) => {
        triggerHaptic('selection');
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(prev => prev.filter(g => g !== grade));
        } else {
            setSelectedGrades(prev => [...prev, grade]);
        }
    };

    const toggleSeekingRole = (roleId: string) => {
        triggerHaptic('selection');
        if (selectedSeekingRoles.includes(roleId)) {
            setSelectedSeekingRoles(prev => prev.filter(r => r !== roleId));
        } else {
            setSelectedSeekingRoles(prev => [...prev, roleId]);
        }
    };

    const toggleTheme = (themeId: string) => {
        triggerHaptic('selection');
        if (selectedThemes.includes(themeId)) {
            setSelectedThemes(prev => prev.filter(t => t !== themeId));
        } else {
            setSelectedThemes(prev => [...prev, themeId]);
        }
    };

    const activeFiltersCount =
        (keyword ? 1 : 0) +
        (university ? 1 : 0) +
        selectedGrades.length +
        selectedSeekingRoles.length +
        selectedThemes.length;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdropTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Drag Indicator */}
                    <View style={styles.dragIndicatorContainer}>
                        <View style={styles.dragIndicator} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIconContainer}>
                                <Ionicons name="options" size={20} color="#009688" />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>絞り込み検索</Text>
                                {activeFiltersCount > 0 && (
                                    <Text style={styles.headerSubtitle}>
                                        {activeFiltersCount}件の条件が選択中
                                    </Text>
                                )}
                            </View>
                        </View>
                        <HapticTouchable onPress={onClose} style={styles.closeButton} hapticType="light">
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </HapticTouchable>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Keyword Search Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <LinearGradient
                                    colors={['#009688', '#00BCD4']}
                                    style={styles.sectionIconBg}
                                >
                                    <Ionicons name="search" size={14} color="white" />
                                </LinearGradient>
                                <Text style={styles.sectionTitle}>キーワード検索</Text>
                            </View>
                            <View style={styles.searchInputContainer}>
                                <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={keyword}
                                    onChangeText={setKeyword}
                                    placeholder="名前、スキル、テーマなど..."
                                    placeholderTextColor="#9CA3AF"
                                />
                                {keyword.length > 0 && (
                                    <TouchableOpacity onPress={() => setKeyword('')} style={styles.clearButton}>
                                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>



                        {/* Theme Section - Project Mode Only */}
                        {mode === 'projects' && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionIconBg}>
                                        <Ionicons name="pricetag" size={14} color="#009688" />
                                    </View>
                                    <Text style={styles.sectionTitle}>プロジェクトのテーマ</Text>
                                    {selectedThemes.length > 0 && (
                                        <View style={styles.countBadge}>
                                            <Text style={styles.countBadgeText}>{selectedThemes.length}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.chipGrid}>
                                    {THEME_OPTIONS.map((theme) => {
                                        const isSelected = selectedThemes.includes(theme.id);
                                        return (
                                            <TouchableOpacity
                                                key={theme.id}
                                                style={[
                                                    styles.chip,
                                                    isSelected && {
                                                        backgroundColor: theme.bgColor,
                                                        borderColor: theme.color,
                                                    }
                                                ]}
                                                onPress={() => toggleTheme(theme.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.chipLabel,
                                                    isSelected && { color: theme.color, fontWeight: '600' }
                                                ]}>
                                                    {theme.label}
                                                </Text>
                                                {isSelected && (
                                                    <View style={[styles.chipCheckmark, { backgroundColor: theme.color }]}>
                                                        <Ionicons name="checkmark" size={12} color="white" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* University Section - User Mode Only */}
                        {mode === 'users' && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <LinearGradient
                                        colors={['#3B82F6', '#8B5CF6']}
                                        style={styles.sectionIconBg}
                                    >
                                        <Ionicons name="school" size={14} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.sectionTitle}>大学名</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.dropdownButton, university && styles.dropdownButtonActive]}
                                    onPress={() => setShowUniversityModal(true)}
                                >
                                    <View style={styles.dropdownContent}>
                                        <Ionicons
                                            name={university ? "checkmark-circle" : "school-outline"}
                                            size={20}
                                            color={university ? "#009688" : "#9CA3AF"}
                                        />
                                        <Text style={[styles.dropdownText, !university && styles.dropdownPlaceholder]}>
                                            {university || '大学名を選択'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Grade Section - User Mode Only */}
                        {mode === 'users' && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <LinearGradient
                                        colors={['#F59E0B', '#EF4444']}
                                        style={styles.sectionIconBg}
                                    >
                                        <Ionicons name="calendar" size={14} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.sectionTitle}>学年</Text>
                                    {selectedGrades.length > 0 && (
                                        <View style={styles.countBadge}>
                                            <Text style={styles.countBadgeText}>{selectedGrades.length}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.chipGrid}>
                                    {GRADE_OPTIONS.map((grade) => {
                                        const isSelected = selectedGrades.includes(grade.value);
                                        return (
                                            <TouchableOpacity
                                                key={grade.value}
                                                style={[styles.chip, isSelected && styles.chipSelected]}
                                                onPress={() => toggleGrade(grade.value)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.chipEmoji}>{grade.icon}</Text>
                                                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                                                    {grade.label}
                                                </Text>
                                                {isSelected && (
                                                    <View style={styles.chipCheckmark}>
                                                        <Ionicons name="checkmark" size={12} color="white" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Seeking Roles Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <LinearGradient
                                    colors={['#EC4899', '#8B5CF6']}
                                    style={styles.sectionIconBg}
                                >
                                    <Ionicons name="people" size={14} color="white" />
                                </LinearGradient>
                                <Text style={styles.sectionTitle}>探している仲間</Text>
                                {selectedSeekingRoles.length > 0 && (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{selectedSeekingRoles.length}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.chipGrid}>
                                {SEEKING_ROLE_OPTIONS.map((role) => {
                                    const isSelected = selectedSeekingRoles.includes(role.id);
                                    const translatedRole = translateTag(role.label);
                                    const roleIcon = getRoleIcon(translatedRole);
                                    return (
                                        <TouchableOpacity
                                            key={role.id}
                                            style={[
                                                styles.chip,
                                                isSelected && styles.chipSelected
                                            ]}
                                            onPress={() => toggleSeekingRole(role.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={roleIcon as any}
                                                size={16}
                                                color={isSelected ? '#009688' : '#6B7280'}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                                                {role.label}
                                            </Text>
                                            {isSelected && (
                                                <View style={styles.chipCheckmark}>
                                                    <Ionicons name="checkmark" size={12} color="white" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerButtons}>
                            <HapticTouchable onPress={handleReset} style={styles.resetButton} hapticType="medium">
                                <Ionicons name="refresh" size={18} color="#6B7280" />
                                <Text style={styles.resetButtonText}>リセット</Text>
                            </HapticTouchable>

                            <HapticTouchable onPress={handleApply} style={styles.applyButtonContainer} hapticType="success">
                                <LinearGradient
                                    colors={['#009688', '#00BCD4']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.applyButton}
                                >
                                    <Text style={styles.applyButtonText}>
                                        {activeFiltersCount > 0
                                            ? `${activeFiltersCount}件の条件で検索`
                                            : '検索する'
                                        }
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="white" />
                                </LinearGradient>
                            </HapticTouchable>
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* University Selection Modal */}
            <Modal
                visible={showUniversityModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUniversityModal(false)}
            >
                <View style={styles.universityModalOverlay}>
                    <View style={styles.universityModalContainer}>
                        <View style={styles.universityModalHeader}>
                            <Text style={styles.universityModalTitle}>大学名を選択</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowUniversityModal(false);
                                    setUniversitySearch('');
                                }}
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.universitySearchContainer}>
                            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.universitySearchIcon} />
                            <TextInput
                                value={universitySearch}
                                onChangeText={setUniversitySearch}
                                placeholder="大学名を入力して検索"
                                placeholderTextColor="#9CA3AF"
                                style={styles.universitySearchInput}
                                autoFocus={true}
                            />
                            {universitySearch.length > 0 && (
                                <TouchableOpacity onPress={() => setUniversitySearch('')}>
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Clear Selection Button */}
                        {university && (
                            <TouchableOpacity
                                style={styles.clearSelectionButton}
                                onPress={() => {
                                    setUniversity('');
                                    setShowUniversityModal(false);
                                    setUniversitySearch('');
                                }}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                                <Text style={styles.clearSelectionText}>選択を解除</Text>
                            </TouchableOpacity>
                        )}

                        <ScrollView style={styles.universityList}>
                            {filteredUniversities.map((uni, index) => (
                                <TouchableOpacity
                                    key={`${uni}-${index}`}
                                    style={[
                                        styles.universityItem,
                                        university === uni && styles.universityItemSelected
                                    ]}
                                    onPress={() => {
                                        setUniversity(uni);
                                        setShowUniversityModal(false);
                                        setUniversitySearch('');
                                        triggerHaptic('selection');
                                    }}
                                >
                                    <Text style={[
                                        styles.universityItemText,
                                        university === uni && styles.universityItemTextSelected
                                    ]}>
                                        {uni}
                                    </Text>
                                    {university === uni && (
                                        <Ionicons name="checkmark-circle" size={20} color="#009688" />
                                    )}
                                </TouchableOpacity>
                            ))}
                            {filteredUniversities.length === 0 && (
                                <View style={styles.noResultsContainer}>
                                    <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                                    <Text style={styles.noResultsText}>該当する大学が見つかりません</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Reset Confirmation Modal */}
            <Modal
                visible={showResetConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResetConfirm(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <View style={styles.confirmIconContainer}>
                            <Ionicons name="refresh" size={32} color="#EF4444" />
                        </View>
                        <Text style={styles.confirmTitle}>検索条件をリセット</Text>
                        <Text style={styles.confirmMessage}>
                            すべての検索条件をリセットしてもよろしいですか？
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={styles.confirmCancelButton}
                                onPress={() => setShowResetConfirm(false)}
                            >
                                <Text style={styles.confirmCancelText}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmResetButton}
                                onPress={confirmReset}
                            >
                                <Text style={styles.confirmResetText}>リセット</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal >
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdropTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        backgroundColor: '#FAFAFA',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dragIndicatorContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: 'white',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E0F2F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#009688',
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
    },
    countBadge: {
        backgroundColor: '#009688',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    clearButton: {
        padding: 4,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dropdownButtonActive: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    dropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dropdownText: {
        fontSize: 15,
        color: '#111827',
    },
    dropdownPlaceholder: {
        color: '#9CA3AF',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingLeft: 14,
        paddingRight: 28,  // Space for checkmark icon
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    chipSelected: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    chipLabelSelected: {
        color: '#00695C',
        fontWeight: '600',
    },
    chipCheckmark: {
        position: 'absolute',
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#009688',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleTagNew: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
        position: 'relative',
        paddingRight: 32,
    },
    roleIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleTagNewText: {
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        gap: 6,
    },
    resetButtonText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 15,
    },
    applyButtonContainer: {
        flex: 1,
    },
    applyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    applyButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    // University Modal Styles
    universityModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    universityModalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
    },
    universityModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    universityModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    universitySearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        margin: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    universitySearchIcon: {
        marginRight: 8,
    },
    universitySearchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    clearSelectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        gap: 8,
    },
    clearSelectionText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 14,
    },
    universityList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    universityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    universityItemSelected: {
        backgroundColor: '#E0F2F1',
        borderRadius: 12,
        marginVertical: 2,
        borderBottomWidth: 0,
    },
    universityItemText: {
        fontSize: 15,
        color: '#374151',
    },
    universityItemTextSelected: {
        color: '#00695C',
        fontWeight: '600',
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    noResultsText: {
        marginTop: 12,
        fontSize: 14,
        color: '#9CA3AF',
    },
    // Confirm Dialog Styles
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmDialog: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '85%',
        alignItems: 'center',
    },
    confirmIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmCancelText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 15,
    },
    confirmResetButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmResetText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
});
