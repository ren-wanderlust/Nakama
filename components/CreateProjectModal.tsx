import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Profile, Theme } from '../types';
import { HapticTouchable, triggerHaptic } from './HapticButton';
import { SHADOWS } from '../constants/DesignSystem';
import { ROLES, ANYONE_ROLE } from '../constants/RoleConstants';

interface CreateProjectModalProps {
    currentUser: Profile;
    onClose: () => void;
    onCreated: () => void;
    project?: {
        id: string;
        title: string;
        description: string;
        image_url: string | null;
        deadline?: string | null;
        required_roles?: string[];
        tags?: string[];
    };
}

export function CreateProjectModal({ currentUser, onClose, onCreated, project }: CreateProjectModalProps) {
    const [title, setTitle] = useState(project?.title || '');
    const [description, setDescription] = useState(project?.description || '');
    const [deadline, setDeadline] = useState<Date | null>(project?.deadline ? new Date(project.deadline) : null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [selectedRoles, setSelectedRoles] = useState<string[]>(project?.required_roles || []);
    const [selectedThemes, setSelectedThemes] = useState<string[]>(project?.tags || []);

    // Role to color mapping (matching UserProjectPage)
    const ROLE_COLORS: { [key: string]: { bg: string; icon: string } } = {
        'エンジニア': { bg: '#E3F2FD', icon: '#1976D2' },      // Blue
        'デザイナー': { bg: '#F3E5F5', icon: '#7B1FA2' },    // Purple
        'マーケター': { bg: '#FFF3E0', icon: '#E65100' },    // Orange
        'アイディアマン': { bg: '#FFF9C4', icon: '#F57F17' }, // Yellow
        '誰でも': { bg: '#E8F5E9', icon: '#388E3C' },        // Green
    };

    const THEMES = [
        { id: 'theme-1', title: '個人開発', color: '#3B82F6', bgColor: '#EFF6FF' },        // Blue
        { id: 'theme-2', title: '起業', color: '#8B5CF6', bgColor: '#F5F3FF' },            // Purple
        { id: 'theme-3', title: 'クリエイティブ', color: '#EC4899', bgColor: '#FDF2F8' },  // Pink
        { id: 'theme-4', title: 'コミュニティづくり', color: '#F97316', bgColor: '#FFF7ED' }, // Orange
        { id: 'theme-5', title: '教育', color: '#10B981', bgColor: '#ECFDF5' },            // Green
        { id: 'theme-6', title: 'コンテスト', color: '#EF4444', bgColor: '#FEF2F2' },      // Red
    ];

    const toggleRole = (role: string) => {
        if (role === '誰でも') {
            // If "誰でも" is selected, clear all others and toggle "誰でも"
            if (selectedRoles.includes('誰でも')) {
                setSelectedRoles([]);
            } else {
                setSelectedRoles(['誰でも']);
            }
        } else {
            // If other role is selected, remove "誰でも" if present
            if (selectedRoles.includes(role)) {
                setSelectedRoles(selectedRoles.filter(r => r !== role));
            } else {
                setSelectedRoles([...selectedRoles.filter(r => r !== '誰でも'), role]);
            }
        }
    };

    const isAnyoneSelected = selectedRoles.includes('誰でも');

    const handleThemeSelect = (themeTitle: string) => {
        // Enforce single selection
        if (selectedThemes.includes(themeTitle)) {
            setSelectedThemes([]); // Deselect if already selected
        } else {
            setSelectedThemes([themeTitle]); // Select new and clear others
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('エラー', 'タイトルを入力してください');
            return;
        }

        setLoading(true);
        try {
            const projectData = {
                owner_id: currentUser.id,
                title: title.trim(),
                description: description.trim(),
                image_url: null,
                deadline: deadline ? deadline.toISOString() : null,
                required_roles: selectedRoles,
                tags: selectedThemes,
            };

            let error;
            if (project) {
                // Update
                const { error: updateError } = await supabase
                    .from('projects')
                    .update(projectData)
                    .eq('id', project.id);
                error = updateError;
            } else {
                // Create
                const { error: insertError } = await supabase
                    .from('projects')
                    .insert(projectData);
                error = insertError;
            }

            if (error) throw error;

            Alert.alert(
                '完了',
                project ? 'プロジェクトを更新しました！' : 'プロジェクトを作成しました！',
                [{ text: 'OK', onPress: onCreated }]
            );
        } catch (error) {
            console.error('Error saving project:', error);
            Alert.alert('エラー', 'プロジェクトの保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setDeadline(selectedDate);
            setShowDatePicker(false);
        } else if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
    };

    const isFormValid = title.trim().length > 0;

    return (
        <View style={styles.container}>
            {/* Modern Header */}
            <View style={styles.header}>
                <HapticTouchable onPress={onClose} style={styles.headerButton} hapticType="light">
                    <Ionicons name="close" size={24} color="#6B7280" />
                </HapticTouchable>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{project ? 'プロジェクト編集' : 'プロジェクト作成'}</Text>
                </View>

                <HapticTouchable
                    onPress={handleSave}
                    disabled={loading || !isFormValid}
                    style={[
                        styles.createButton,
                        (!isFormValid) && styles.createButtonDisabled
                    ]}
                    hapticType="success"
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={[
                            styles.createButtonText,
                            (!isFormValid) && styles.createButtonTextDisabled
                        ]}>{project ? '保存' : '作成'}</Text>
                    )}
                </HapticTouchable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                >
                    {/* Project Title Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconContainer}>
                                <Ionicons name="rocket" size={18} color="#009688" />
                            </View>
                            <Text style={styles.sectionTitle}>プロジェクト名</Text>
                            <Text style={styles.requiredBadge}>必須</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="AIを使った英語学習アプリ開発"
                                placeholderTextColor="#9CA3AF"
                                value={title}
                                onChangeText={setTitle}
                                maxLength={50}
                            />
                            <Text style={styles.charCount}>{title.length}/50</Text>
                        </View>
                    </View>

                    {/* Roles Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconContainer}>
                                <Ionicons name="people" size={18} color="#009688" />
                            </View>
                            <Text style={styles.sectionTitle}>募集するメンバー</Text>
                        </View>
                        <View style={styles.rolesContainer}>
                            <View style={styles.rolesGrid}>
                                {ROLES.map((role) => {
                                    const isSelected = selectedRoles.includes(role.id);
                                    const colors = ROLE_COLORS[role.id] || { bg: '#F9FAFB', icon: '#6B7280' };
                                    return (
                                        <HapticTouchable
                                            key={role.id}
                                            style={[
                                                styles.roleCard,
                                                isSelected && { backgroundColor: colors.bg, borderColor: colors.icon }
                                            ]}
                                            onPress={() => toggleRole(role.id)}
                                            hapticType="selection"
                                            disabled={isAnyoneSelected}
                                        >
                                            <View style={[
                                                styles.roleIconContainer,
                                                isSelected && { backgroundColor: colors.bg }
                                            ]}>
                                                <Ionicons
                                                    name={role.icon as any}
                                                    size={20}
                                                    color={isSelected ? colors.icon : (isAnyoneSelected ? '#D1D5DB' : '#6B7280')}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.roleText,
                                                isSelected && { color: colors.icon, fontWeight: '600' },
                                                isAnyoneSelected && !isSelected && { color: '#D1D5DB' }
                                            ]}>{role.id}</Text>
                                            {isSelected && (
                                                <View style={styles.checkBadge}>
                                                    <Ionicons name="checkmark" size={12} color="white" />
                                                </View>
                                            )}
                                        </HapticTouchable>
                                    );
                                })}
                            </View>
                            <View style={styles.orContainer}>
                                <Text style={styles.orText}>or</Text>
                            </View>
                            <View style={styles.anyoneCardContainer}>
                                <HapticTouchable
                                    style={[
                                        styles.roleCard,
                                        isAnyoneSelected && { backgroundColor: ROLE_COLORS['誰でも'].bg, borderColor: ROLE_COLORS['誰でも'].icon }
                                    ]}
                                    onPress={() => toggleRole('誰でも')}
                                    hapticType="selection"
                                >
                                    <View style={[
                                        styles.roleIconContainer,
                                        isAnyoneSelected && { backgroundColor: ROLE_COLORS['誰でも'].bg }
                                    ]}>
                                        <Ionicons
                                            name={ANYONE_ROLE.icon as any}
                                            size={20}
                                            color={isAnyoneSelected ? ROLE_COLORS['誰でも'].icon : '#6B7280'}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.roleText,
                                        isAnyoneSelected && { color: ROLE_COLORS['誰でも'].icon, fontWeight: '600' }
                                    ]}>{ANYONE_ROLE.id}</Text>
                                    {isAnyoneSelected && (
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark" size={12} color="white" />
                                        </View>
                                    )}
                                </HapticTouchable>
                            </View>
                        </View>
                    </View>

                    {/* Theme Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconContainer}>
                                <Ionicons name="pricetag" size={18} color="#009688" />
                            </View>
                            <Text style={styles.sectionTitle}>プロジェクトのテーマ</Text>
                        </View>
                        <View style={styles.chipContainer}>
                            {THEMES.map((theme) => {
                                const isSelected = selectedThemes.includes(theme.title);
                                return (
                                    <HapticTouchable
                                        key={theme.id}
                                        style={[
                                            styles.chip,
                                            isSelected && {
                                                backgroundColor: theme.bgColor,
                                                borderColor: theme.color
                                            }
                                        ]}
                                        onPress={() => handleThemeSelect(theme.title)}
                                        hapticType="selection"
                                    >
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={16} color={theme.color} style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={[
                                            styles.chipText,
                                            isSelected && {
                                                color: theme.color,
                                                fontWeight: '600'
                                            }
                                        ]}>{theme.title}</Text>
                                    </HapticTouchable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Deadline Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconContainer}>
                                <Ionicons name="calendar" size={18} color="#009688" />
                            </View>
                            <Text style={styles.sectionTitle}>募集期限</Text>
                            <Text style={styles.optionalBadge}>任意</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.dateButton, deadline && styles.dateButtonActive]}
                            onPress={() => setShowDatePicker(!showDatePicker)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.dateButtonContent}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={deadline ? '#009688' : '#6B7280'}
                                />
                                <Text style={[styles.dateButtonText, deadline && styles.dateButtonTextActive]}>
                                    {deadline ? deadline.toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : '期限を設定する'}
                                </Text>
                            </View>
                            {deadline ? (
                                <TouchableOpacity onPress={() => setDeadline(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            )}
                        </TouchableOpacity>

                        {showDatePicker && (
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={deadline || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                    accentColor="#009688"
                                />
                            </View>
                        )}
                    </View>

                    {/* Description Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconContainer}>
                                <Ionicons name="document-text" size={18} color="#009688" />
                            </View>
                            <Text style={styles.sectionTitle}>詳細説明</Text>
                        </View>
                        <View style={styles.textAreaWrapper}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="プロジェクトの目的、背景、求める人物像などを詳しく書きましょう。&#10;&#10;例:&#10;• プロジェクトの目標&#10;• 開発予定の機能&#10;• 活動頻度やコミュニケーション方法"
                                placeholderTextColor="#9CA3AF"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111827',
    },
    createButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#009688',
    },
    createButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
    },
    createButtonTextDisabled: {
        color: '#9CA3AF',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...SHADOWS.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#E0F2F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    requiredBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#DC2626',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    optionalBadge: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
    },
    charCount: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        fontSize: 12,
        color: '#9CA3AF',
    },
    rolesContainer: {
        gap: 10,
    },
    rolesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    orContainer: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    orText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    roleCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    roleCardActive: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    anyoneCardContainer: {
        width: '100%',
        alignItems: 'center',
    },
    roleIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        flexShrink: 0,
    },
    roleIconContainerActive: {
        backgroundColor: '#B2DFDB',
    },
    roleText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        flex: 1,
        marginRight: 8,
    },
    roleTextActive: {
        color: '#009688',
        fontWeight: '600',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#009688',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    chipActive: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    chipText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#009688',
        fontWeight: '600',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    dateButtonActive: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    dateButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateButtonText: {
        fontSize: 15,
        color: '#6B7280',
    },
    dateButtonTextActive: {
        color: '#009688',
        fontWeight: '500',
    },
    datePickerContainer: {
        marginTop: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        overflow: 'hidden',
    },
    textAreaWrapper: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    textArea: {
        padding: 14,
        fontSize: 15,
        color: '#111827',
        minHeight: 180,
        lineHeight: 22,
    },
});
