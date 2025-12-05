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

    const [themes, setThemes] = useState<Theme[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(project?.required_roles || []);
    const [selectedThemes, setSelectedThemes] = useState<string[]>(project?.tags || []);

    const ROLES = ['エンジニア', 'デザイナー', 'マーケター', 'アイディアマン'];

    useEffect(() => {
        fetchThemes();
    }, []);

    const fetchThemes = async () => {
        try {
            const { data, error } = await supabase.from('themes').select('*');
            if (error) throw error;
            if (data) setThemes(data);
        } catch (error) {
            console.error('Error fetching themes:', error);
        }
    };

    const toggleRole = (role: string) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    const toggleTheme = (themeTitle: string) => {
        if (selectedThemes.includes(themeTitle)) {
            setSelectedThemes(selectedThemes.filter(t => t !== themeTitle));
        } else {
            setSelectedThemes([...selectedThemes, themeTitle]);
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
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            setDeadline(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.cancelText}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{project ? 'プロジェクト編集' : 'プロジェクト作成'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#009688" />
                    ) : (
                        <Text style={styles.createText}>{project ? '保存' : '作成'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.content}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>プロジェクト名</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例: AIを使った英語学習アプリ開発"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>募集するメンバー</Text>
                        <View style={styles.chipContainer}>
                            {ROLES.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.chip,
                                        selectedRoles.includes(role) && styles.chipActive
                                    ]}
                                    onPress={() => toggleRole(role)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedRoles.includes(role) && styles.chipTextActive
                                    ]}>{role}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>プロジェクトのテーマ</Text>
                        <View style={styles.chipContainer}>
                            {themes.map((theme) => (
                                <TouchableOpacity
                                    key={theme.id}
                                    style={[
                                        styles.chip,
                                        selectedThemes.includes(theme.title) && styles.chipActive
                                    ]}
                                    onPress={() => toggleTheme(theme.title)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedThemes.includes(theme.title) && styles.chipTextActive
                                    ]}>{theme.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>募集期限 (任意)</Text>
                        <View style={styles.dateInputContainer}>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#374151" />
                                <Text style={styles.dateButtonText}>
                                    {deadline ? deadline.toLocaleDateString() : '期限を設定する'}
                                </Text>
                            </TouchableOpacity>

                            {deadline && (
                                <TouchableOpacity
                                    style={styles.clearDateButton}
                                    onPress={() => setDeadline(null)}
                                >
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={deadline || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={onDateChange}
                                minimumDate={new Date()}
                                accentColor="#009688"
                            />
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>詳細</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="プロジェクトの目的や募集する役割などを詳しく書きましょう"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    cancelText: {
        fontSize: 16,
        color: '#6B7280',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    createText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#009688',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 150,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        flex: 1,
        gap: 8,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#374151',
    },
    clearDateButton: {
        padding: 8,
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
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipActive: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    chipText: {
        fontSize: 14,
        color: '#374151',
    },
    chipTextActive: {
        color: '#009688',
        fontWeight: 'bold',
    },
});
