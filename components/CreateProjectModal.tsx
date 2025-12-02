import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface CreateProjectModalProps {
    currentUser: Profile;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateProjectModal({ currentUser, onClose, onCreated }: CreateProjectModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string): Promise<string | null> => {
        try {
            const ext = uri.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type: `image/${ext}`,
            } as any);

            const { error } = await supabase.storage
                .from('project-images')
                .upload(filePath, formData, {
                    upsert: false,
                });

            if (error) throw error;

            const { data } = supabase.storage
                .from('project-images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('エラー', 'タイトルを入力してください');
            return;
        }

        setLoading(true);
        try {
            let imageUrl = null;
            if (image) {
                imageUrl = await uploadImage(image);
            }

            const { error } = await supabase
                .from('projects')
                .insert({
                    owner_id: currentUser.id,
                    title: title.trim(),
                    description: description.trim(),
                    image_url: imageUrl,
                    deadline: deadline ? deadline.toISOString() : null,
                });

            if (error) throw error;

            Alert.alert('完了', 'プロジェクトを作成しました！');
            onCreated();
        } catch (error) {
            console.error('Error creating project:', error);
            Alert.alert('エラー', 'プロジェクトの作成に失敗しました');
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
                <Text style={styles.headerTitle}>プロジェクト作成</Text>
                <TouchableOpacity onPress={handleCreate} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#009688" />
                    ) : (
                        <Text style={styles.createText}>作成</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.content}>
                    <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.image} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                                <Text style={styles.placeholderText}>カバー画像を追加</Text>
                            </View>
                        )}
                    </TouchableOpacity>

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
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#9CA3AF',
        fontSize: 14,
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
