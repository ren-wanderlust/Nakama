import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';

interface ProfileEditProps {
    initialProfile: Profile;
    onSave: (profile: Profile) => void;
    onCancel: () => void;
}

export function ProfileEdit({ initialProfile, onSave, onCancel }: ProfileEditProps) {
    const [name, setName] = useState(initialProfile.name);
    const [age, setAge] = useState(initialProfile.age.toString());
    const [university, setUniversity] = useState(initialProfile.university || initialProfile.company || '');
    const [bio, setBio] = useState(initialProfile.bio);
    const [seekingFor, setSeekingFor] = useState<string[]>(initialProfile.seekingFor || []);
    const [skills, setSkills] = useState<string[]>(initialProfile.skills || []);
    const [seekingRoles, setSeekingRoles] = useState<string[]>(initialProfile.seekingRoles || []);
    const [image, setImage] = useState(initialProfile.image);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const seekingForOptions = ['起業に興味あり', 'ビジネスメンバー探し', 'アイデア模索中', 'まずは話してみたい', 'コミュニティ形成', '壁打ち相手募集'];

    const skillCategories = [
        { title: '開発・技術', skills: ['フロントエンド', 'バックエンド', 'モバイルアプリ', 'AI / データ', 'インフラ / クラウド', 'ブロックチェーン', 'ゲーム開発'] },
        { title: 'デザイン', skills: ['UI / UXデザイン', 'グラフィック / イラスト', 'Webデザイン'] },
        { title: 'ビジネス', skills: ['マーケティング', 'セールス / BizDev', 'PM / ディレクター', '広報 / PR', 'ファイナンス / 経理'] },
        { title: 'その他', skills: ['動画 / クリエイター', 'ライティング'] }
    ];

    const seekingOptions = ['💻 エンジニア', '🎨 デザイナー', '📣 マーケ / 広報', '💼 セールス / BizDev', '1️⃣ PM / ディレクター', '💰 ファイナンス', '🗣️ 壁打ち相手', '🤔 まだ分からない'];

    const handleImageChange = () => {
        // Placeholder for image change functionality
        alert('画像変更機能は未実装です');
    };

    const handleToggle = (item: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = () => {
        setIsSubmitting(true);
        // Simulate network request
        setTimeout(() => {
            const updatedProfile: Profile = {
                ...initialProfile,
                name,
                age: parseInt(age) || 0,
                university: university, // Simplified: assuming university field for now
                bio,
                seekingFor,
                skills,
                seekingRoles,
                image
            };
            setIsSubmitting(false);
            onSave(updatedProfile);
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel} style={styles.headerButton} disabled={isSubmitting}>
                        <Text style={styles.cancelText}>キャンセル</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>プロフィール編集</Text>
                    <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#009688" />
                        ) : (
                            <Text style={styles.saveText}>保存</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>
                            {/* Basic Info */}
                            <View style={styles.section}>
                                <View style={styles.imageEditContainer}>
                                    <Image source={{ uri: image }} style={styles.profileImage} />
                                    <TouchableOpacity style={styles.changeImageButton} onPress={handleImageChange}>
                                        <Ionicons name="camera" size={20} color="white" />
                                        <Text style={styles.changeImageText}>写真を変更</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.sectionTitle}>基本情報</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>ニックネーム</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="例: タロウ"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>年齢</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={age}
                                        onChangeText={setAge}
                                        placeholder="例: 20"
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>職種 / 大学名</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={university}
                                        onChangeText={setUniversity}
                                        placeholder="例: 東京大学 / 株式会社〇〇"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>自己紹介文</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={bio}
                                        onChangeText={setBio}
                                        placeholder="自己紹介を入力してください"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>

                            {/* Tags Section A */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="flag-outline" size={20} color="#0d9488" />
                                    <Text style={styles.sectionTitle}>現在のステータス・目的</Text>
                                </View>
                                <View style={styles.chipContainer}>
                                    {seekingForOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            onPress={() => handleToggle(option, seekingFor, setSeekingFor)}
                                            style={[
                                                styles.chip,
                                                seekingFor.includes(option) ? styles.chipSelected : styles.chipUnselected
                                            ]}
                                        >
                                            <Text style={seekingFor.includes(option) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Tags Section B */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="flash-outline" size={20} color="#0d9488" />
                                    <Text style={styles.sectionTitle}>持っているスキル</Text>
                                </View>
                                {skillCategories.map((category, categoryIndex) => (
                                    <View key={categoryIndex}>
                                        <Text style={styles.categoryTitle}>{category.title}</Text>
                                        <View style={styles.chipContainer}>
                                            {category.skills.map((skill) => (
                                                <TouchableOpacity
                                                    key={skill}
                                                    onPress={() => handleToggle(skill, skills, setSkills)}
                                                    style={[
                                                        styles.chip,
                                                        skills.includes(skill) ? styles.chipSelected : styles.chipUnselected
                                                    ]}
                                                >
                                                    <Text style={skills.includes(skill) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                                        {skill}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Tags Section C */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="people-outline" size={20} color="#0d9488" />
                                    <Text style={styles.sectionTitle}>求める仲間や条件等</Text>
                                </View>
                                <View style={styles.chipContainer}>
                                    {seekingOptions.map((role) => (
                                        <TouchableOpacity
                                            key={role}
                                            onPress={() => handleToggle(role, seekingRoles, setSeekingRoles)}
                                            style={[
                                                styles.chip,
                                                seekingRoles.includes(role) ? styles.chipSelected : styles.chipUnselected
                                            ]}
                                        >
                                            <Text style={seekingRoles.includes(role) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                                {role}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    cancelText: {
        fontSize: 16,
        color: '#6b7280',
    },
    saveText: {
        fontSize: 16,
        color: '#0d9488',
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipUnselected: {
        backgroundColor: 'white',
        borderColor: '#d1d5db',
    },
    chipSelected: {
        backgroundColor: '#f0fdfa',
        borderColor: '#0d9488',
    },
    chipTextUnselected: {
        color: '#374151',
        fontSize: 14,
    },
    chipTextSelected: {
        color: '#0d9488',
        fontSize: 14,
        fontWeight: 'bold',
    },
    categoryTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 8,
    },
    imageEditContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
        backgroundColor: '#e5e7eb',
    },
    changeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4b5563',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    changeImageText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
