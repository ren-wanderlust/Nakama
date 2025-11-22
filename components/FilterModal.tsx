import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    SafeAreaView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface FilterCriteria {
    keyword: string;
    ageMin: string;
    ageMax: string;
    location: string;
    isStudentOnly: boolean;
    statuses: string[];
}

const STATUS_OPTIONS = [
    'ビジネスメンバー探し',
    'アイデア模索中',
    'コミュニティ形成',
    'まずは話してみたい',
    '起業に興味あり',
    '壁打ち相手募集',
];

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (criteria: FilterCriteria) => void;
    initialCriteria?: FilterCriteria;
}

export function FilterModal({ visible, onClose, onApply, initialCriteria }: FilterModalProps) {
    const [keyword, setKeyword] = useState(initialCriteria?.keyword || '');
    const [ageMin, setAgeMin] = useState(initialCriteria?.ageMin || '18');
    const [ageMax, setAgeMax] = useState(initialCriteria?.ageMax || '25');
    const [location, setLocation] = useState(initialCriteria?.location || '');
    const [isStudentOnly, setIsStudentOnly] = useState(initialCriteria?.isStudentOnly || false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialCriteria?.statuses || []);

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        setKeyword('');
        setAgeMin('18');
        setAgeMax('25');
        setLocation('');
        setIsStudentOnly(false);
        setSelectedStatuses([]);
        setShowResetConfirm(false);
    };

    const handleApply = () => {
        onApply({
            keyword,
            ageMin,
            ageMax,
            location,
            isStudentOnly,
            statuses: selectedStatuses,
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>絞り込み</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#4b5563" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                        {/* Status/Purpose Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionBar} />
                                <Text style={styles.sectionTitle}>🚩 ステータス・目的</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {STATUS_OPTIONS.map((status) => {
                                    const isSelected = selectedStatuses.includes(status);
                                    return (
                                        <TouchableOpacity
                                            key={status}
                                            style={[styles.chip, isSelected && styles.chipSelected]}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedStatuses(prev => prev.filter(s => s !== status));
                                                } else {
                                                    setSelectedStatuses(prev => [...prev, status]);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                {status}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Basic Attributes Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionBar} />
                                <Text style={styles.sectionTitle}>基本属性</Text>
                            </View>

                            {/* Age Range */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>年齢</Text>
                                <View style={styles.row}>
                                    <TextInput
                                        style={styles.numberInput}
                                        value={ageMin}
                                        onChangeText={setAgeMin}
                                        keyboardType="numeric"
                                        placeholder="18"
                                    />
                                    <Text style={styles.tilde}>〜</Text>
                                    <TextInput
                                        style={styles.numberInput}
                                        value={ageMax}
                                        onChangeText={setAgeMax}
                                        keyboardType="numeric"
                                        placeholder="25"
                                    />
                                </View>
                            </View>

                            {/* Location */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>地域</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="例: 東京"
                                />
                            </View>

                            {/* Student Only Switch */}
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>学生のみ表示</Text>
                                <Switch
                                    value={isStudentOnly}
                                    onValueChange={setIsStudentOnly}
                                    trackColor={{ false: '#d1d5db', true: '#0d9488' }}
                                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#f4f3f4'}
                                />
                            </View>
                        </View>

                        {/* Keyword Search Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionBar} />
                                <Text style={styles.sectionTitle}>キーワード検索</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.searchContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        value={keyword}
                                        onChangeText={setKeyword}
                                        placeholder="キーワードを入力"
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerButtons}>
                            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                                <Text style={styles.resetButtonText}>リセット</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleApply} style={styles.applyButtonContainer}>
                                <LinearGradient
                                    colors={['#0d9488', '#2563eb']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.applyButton}
                                >
                                    <Text style={styles.applyButtonText}>適用する</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Reset Confirmation Modal */}
            <Modal
                visible={showResetConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResetConfirm(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <Text style={styles.confirmTitle}>検索条件をリセット</Text>
                        <Text style={styles.confirmMessage}>全てリセットしてもよろしいですか？</Text>
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
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionBar: {
        width: 4,
        height: 20,
        backgroundColor: '#f97316', // orange-500
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ea580c', // orange-600
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        color: '#374151',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    numberInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    tilde: {
        color: '#6b7280',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    switchLabel: {
        fontSize: 14,
        color: '#374151',
    },
    searchContainer: {
        position: 'relative',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: 'white',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#0d9488', // teal-600
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButtonText: {
        color: '#0d9488',
        fontWeight: 'bold',
        fontSize: 14,
    },
    applyButtonContainer: {
        flex: 1,
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmDialog: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '80%',
        alignItems: 'center',
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 24,
        textAlign: 'center',
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelButton: {
        flex: 1,
        backgroundColor: '#9ca3af', // gray-400
        paddingVertical: 12,
        borderRadius: 24,
        alignItems: 'center',
    },
    confirmCancelText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    confirmResetButton: {
        flex: 1,
        backgroundColor: '#ef4444', // red-500
        paddingVertical: 12,
        borderRadius: 24,
        alignItems: 'center',
    },
    confirmResetText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    chipSelected: {
        backgroundColor: '#ccfbf1', // teal-100
        borderColor: '#0d9488', // teal-600
    },
    chipText: {
        fontSize: 13,
        color: '#4b5563',
    },
    chipTextSelected: {
        color: '#0f766e', // teal-700
        fontWeight: 'bold',
    },
});
