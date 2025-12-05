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
import { Profile } from '../types';

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
    };
}

export function CreateProjectModal({ currentUser, onClose, onCreated, project }: CreateProjectModalProps) {
    const [title, setTitle] = useState(project?.title || '');
    const [description, setDescription] = useState(project?.description || '');
    const [deadline, setDeadline] = useState<Date | null>(project?.deadline ? new Date(project.deadline) : null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

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
                image_url: null, // No image for now
                deadline: deadline ? deadline.toISOString() : null,
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
});
