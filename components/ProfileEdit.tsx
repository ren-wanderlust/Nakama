import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { SHADOWS } from '../constants/DesignSystem';
import universitiesData from '../assets/japanese_universities.json';
import { getRoleColors, getRoleIcon } from '../constants/RoleConstants';

interface ProfileEditProps {
    initialProfile: Profile;
    onSave: (profile: Profile) => void;
    onCancel: () => void;
}

export function ProfileEdit({ initialProfile, onSave, onCancel }: ProfileEditProps) {
    const [name, setName] = useState(initialProfile.name || '');
    const [university, setUniversity] = useState(initialProfile.university || initialProfile.company || '');
    const [grade, setGrade] = useState(initialProfile.grade || '');
    const [bio, setBio] = useState(initialProfile.bio || '');
    const [skills, setSkills] = useState<string[]>(initialProfile.skills || []);
    const [seekingRoles, setSeekingRoles] = useState<string[]>(initialProfile.seekingRoles || []);
    const [image, setImage] = useState(initialProfile.image || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal states
    const [showUniversityModal, setShowUniversityModal] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);
    const [allUniversities, setAllUniversities] = useState<string[]>([]);

    // その他テキスト
    const [otherRoleText, setOtherRoleText] = useState('');
    const [otherSeekingText, setOtherSeekingText] = useState('');

    // 役割オプション（RoleConstantsと統一）
    const roleOptions = [
        { id: 'エンジニア', label: 'エンジニア' },
        { id: 'アイディアマン', label: 'アイディアマン' },
        { id: 'マーケター', label: 'マーケター' },
        { id: 'クリエイター', label: 'クリエイター' },
        { id: 'その他', label: 'その他' },
    ];

    // 探している仲間オプション（RoleConstantsと統一）
    const seekingOptions = [
        { id: 'エンジニア', label: 'エンジニア' },
        { id: 'デザイナー', label: 'デザイナー' },
        { id: 'マーケター', label: 'マーケター' },
        { id: 'クリエイター', label: 'クリエイター' },
        { id: 'その他', label: 'その他' },
    ];

    // 学年オプション
    const gradeOptions = [
        { value: 'B1', label: 'B1' },
        { value: 'B2', label: 'B2' },
        { value: 'B3', label: 'B3' },
        { value: 'B4', label: 'B4' },
        { value: 'M1', label: 'M1' },
        { value: 'M2', label: 'M2' },
    ];

    // Load universities from JSON
    useEffect(() => {
        try {
            const universities = universitiesData as string[];
            if (universities && universities.length > 0) {
                setAllUniversities(universities);
                setFilteredUniversities(universities);
            }
        } catch (error) {
            console.error('Error loading universities:', error);
        }
    }, []);

    // Filter universities by search input
    useEffect(() => {
        if (!searchInput.trim()) {
            setFilteredUniversities(allUniversities);
            return;
        }

        const searchTerm = searchInput.trim().toLowerCase();
        const filtered = allUniversities.filter(uni => {
            return uni.toLowerCase().includes(searchTerm);
        });

        setFilteredUniversities(filtered);
    }, [searchInput, allUniversities]);

    const handleImageChange = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleToggle = (item: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('エラー', 'ニックネームを入力してください');
            return;
        }
        if (!university.trim()) {
            Alert.alert('エラー', '大学名を入力してください');
            return;
        }

        setIsSubmitting(true);
        try {
            let uploadedImageUrl = image;

            // Upload image if it's a local URI
            if (image && image.startsWith('file://')) {
                try {
                    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.onload = function () {
                            resolve(xhr.response);
                        };
                        xhr.onerror = function (e) {
                            console.log(e);
                            reject(new TypeError('Network request failed'));
                        };
                        xhr.responseType = 'arraybuffer';
                        xhr.open('GET', image, true);
                        xhr.send(null);
                    });

                    const fileExt = image.split('.').pop()?.toLowerCase() ?? 'jpg';
                    const fileName = `${initialProfile.id}/${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, arrayBuffer, {
                            contentType: `image/${fileExt}`,
                            upsert: true,
                        });

                    if (uploadError) {
                        console.log('Image upload warning:', uploadError.message);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath);
                        uploadedImageUrl = publicUrl;
                    }
                } catch (uploadErr) {
                    console.log('Image upload exception:', uploadErr);
                }
            }

            // Prepare skills array
            const finalSkills = skills.includes('その他') && otherRoleText.trim()
                ? [...skills.filter(s => s !== 'その他'), otherRoleText.trim()]
                : skills;

            // Prepare seeking roles array
            const finalSeekingRoles = seekingRoles.includes('その他') && otherSeekingText.trim()
                ? [...seekingRoles.filter(s => s !== 'その他'), otherSeekingText.trim()]
                : seekingRoles;

            const { error } = await supabase
                .from('profiles')
                .update({
                    name: name,
                    university: university,
                    grade: grade || null,
                    bio: bio,
                    skills: finalSkills,
                    seeking_roles: finalSeekingRoles,
                    image: uploadedImageUrl,
                })
                .eq('id', initialProfile.id);

            if (error) {
                throw error;
            }

            onSave({
                ...initialProfile,
                name,
                university,
                grade,
                bio,
                skills: finalSkills,
                seekingRoles: finalSeekingRoles,
                image: uploadedImageUrl,
            });
        } catch (error: any) {
            Alert.alert('エラー', 'プロフィールの保存に失敗しました: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = name.trim().length > 0 && university.trim().length > 0;
    const bioLength = bio.length;
    const maxBioLength = 100;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>プロフィール編集</Text>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={!isFormValid || isSubmitting}
                                style={[
                                    styles.saveButton,
                                    (!isFormValid || isSubmitting) && styles.saveButtonDisabled
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>保存</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Profile Image */}
                            <View style={styles.imageSection}>
                                <TouchableOpacity onPress={handleImageChange} style={styles.imagePickerContainer}>
                                    {image ? (
                                        <Image
                                            source={{ uri: image }}
                                            style={styles.profileImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={200}
                                        />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="person" size={50} color="#9CA3AF" />
                                        </View>
                                    )}
                                    <View style={styles.cameraIconContainer}>
                                        <Ionicons name="camera" size={16} color="white" />
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleImageChange}>
                                    <Text style={styles.changePhotoText}>写真を変更</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Basic Info Card */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, { backgroundColor: '#DBEAFE' }]}>
                                        <Ionicons name="person" size={18} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.cardTitle}>基本情報</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.label}>ニックネーム</Text>
                                        <View style={styles.requiredBadge}>
                                            <Text style={styles.requiredText}>必須</Text>
                                        </View>
                                    </View>
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="ニックネームを入力"
                                        placeholderTextColor="#9CA3AF"
                                        style={styles.input}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.label}>大学名</Text>
                                        <View style={styles.requiredBadge}>
                                            <Text style={styles.requiredText}>必須</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setShowUniversityModal(true)}
                                        style={styles.dropdownButton}
                                    >
                                        <Text style={[styles.dropdownText, !university && styles.dropdownPlaceholder]}>
                                            {university || '大学名を選択してください'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>学年</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowGradeModal(true)}
                                        style={styles.dropdownButton}
                                    >
                                        <Text style={[styles.dropdownText, !grade && styles.dropdownPlaceholder]}>
                                            {grade ? gradeOptions.find(opt => opt.value === grade)?.label : '学年を選択してください'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Bio Card */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="chatbubble" size={18} color="#F59E0B" />
                                    </View>
                                    <Text style={styles.cardTitle}>自己紹介</Text>
                                    <View style={styles.optionalBadge}>
                                        <Text style={styles.optionalText}>任意</Text>
                                    </View>
                                </View>

                                <TextInput
                                    value={bio}
                                    onChangeText={(text) => {
                                        if (text.length <= maxBioLength) {
                                            setBio(text);
                                        }
                                    }}
                                    placeholder="例: スタートアップでエンジニア経験あり"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.bioInput}
                                    maxLength={maxBioLength}
                                    multiline={true}
                                    textAlignVertical="top"
                                    numberOfLines={4}
                                />
                                <Text style={styles.characterCount}>
                                    {bioLength} / {maxBioLength}
                                </Text>
                            </View>

                            {/* Your Role Card */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, { backgroundColor: '#E0F2F1' }]}>
                                        <Ionicons name="flash" size={18} color="#009688" />
                                    </View>
                                    <Text style={styles.cardTitle}>あなたの役割</Text>
                                </View>
                                <Text style={styles.cardDescription}>
                                    あなたが提供できる役割を選択してください（複数選択可能）
                                </Text>

                                <View style={styles.chipContainer}>
                                    {roleOptions.map((option) => {
                                        const isSelected = skills.includes(option.id);
                                        const roleColors = getRoleColors(option.label);
                                        const roleIcon = getRoleIcon(option.label);
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                onPress={() => handleToggle(option.id, skills, setSkills)}
                                                style={[
                                                    styles.chip,
                                                    isSelected && { backgroundColor: roleColors.bg, borderColor: roleColors.border }
                                                ]}
                                            >
                                                <View style={[styles.chipIconCircle, isSelected && { backgroundColor: roleColors.bg }]}>
                                                    <Ionicons name={roleIcon as any} size={16} color={isSelected ? roleColors.icon : '#6B7280'} />
                                                </View>
                                                <Text style={[
                                                    styles.chipText,
                                                    isSelected && { color: roleColors.icon, fontWeight: '600' }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={16} color={roleColors.icon} style={styles.chipCheck} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {skills.includes('その他') && (
                                    <View style={styles.otherInputContainer}>
                                        <TextInput
                                            value={otherRoleText}
                                            onChangeText={setOtherRoleText}
                                            placeholder="その他の役割を記入"
                                            placeholderTextColor="#9CA3AF"
                                            style={styles.otherInput}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Seeking Roles Card */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, { backgroundColor: '#FCE7F3' }]}>
                                        <Ionicons name="people" size={18} color="#EC4899" />
                                    </View>
                                    <Text style={styles.cardTitle}>探している仲間</Text>
                                </View>
                                <Text style={styles.cardDescription}>
                                    あなたが探している仲間を選択してください（複数選択可能）
                                </Text>

                                <View style={styles.chipContainer}>
                                    {seekingOptions.map((option) => {
                                        const isSelected = seekingRoles.includes(option.id);
                                        const roleColors = getRoleColors(option.label);
                                        const roleIcon = getRoleIcon(option.label);
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                onPress={() => handleToggle(option.id, seekingRoles, setSeekingRoles)}
                                                style={[
                                                    styles.chip,
                                                    isSelected && { backgroundColor: roleColors.bg, borderColor: roleColors.border }
                                                ]}
                                            >
                                                <View style={[styles.chipIconCircle, isSelected && { backgroundColor: roleColors.bg }]}>
                                                    <Ionicons name={roleIcon as any} size={16} color={isSelected ? roleColors.icon : '#6B7280'} />
                                                </View>
                                                <Text style={[
                                                    styles.chipText,
                                                    isSelected && { color: roleColors.icon, fontWeight: '600' }
                                                ]}>
                                                    {option.label}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={16} color={roleColors.icon} style={styles.chipCheck} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {seekingRoles.includes('その他') && (
                                    <View style={styles.otherInputContainer}>
                                        <TextInput
                                            value={otherSeekingText}
                                            onChangeText={setOtherSeekingText}
                                            placeholder="その他の仲間を記入"
                                            placeholderTextColor="#9CA3AF"
                                            style={styles.otherInput}
                                        />
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* University Modal */}
            <Modal
                visible={showUniversityModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setShowUniversityModal(false);
                    setSearchInput('');
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setShowUniversityModal(false);
                        setSearchInput('');
                    }}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>大学名を選択</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowUniversityModal(false);
                                    setSearchInput('');
                                }}
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                value={searchInput}
                                onChangeText={setSearchInput}
                                placeholder="大学名を検索"
                                style={styles.searchInput}
                                autoFocus={true}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchInput && (
                                <TouchableOpacity
                                    onPress={() => setSearchInput('')}
                                    style={styles.clearButton}
                                >
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView style={styles.universityList}>
                            {filteredUniversities.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {searchInput.trim()
                                            ? `「${searchInput}」に一致する大学が見つかりませんでした`
                                            : '大学名を入力して検索してください'}
                                    </Text>
                                </View>
                            ) : (
                                filteredUniversities.slice(0, 50).map((uni, index) => (
                                    <TouchableOpacity
                                        key={`${uni}-${index}`}
                                        style={styles.modalOption}
                                        onPress={() => {
                                            setUniversity(uni);
                                            setSearchInput('');
                                            setShowUniversityModal(false);
                                        }}
                                    >
                                        <Text style={styles.modalOptionText}>{uni}</Text>
                                        {university === uni && (
                                            <Ionicons name="checkmark" size={20} color="#009688" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Grade Modal */}
            <Modal
                visible={showGradeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGradeModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowGradeModal(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>学年を選択</Text>
                            <TouchableOpacity
                                onPress={() => setShowGradeModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.universityList}>
                            {gradeOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        setGrade(option.value);
                                        setShowGradeModal(false);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{option.label}</Text>
                                    {grade === option.value && (
                                        <Ionicons name="checkmark" size={20} color="#009688" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111827',
    },
    saveButton: {
        backgroundColor: '#009688',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePickerContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: 'white',
        ...SHADOWS.md,
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#009688',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    changePhotoText: {
        color: '#009688',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    cardDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    requiredBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    requiredText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#EF4444',
    },
    optionalBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    optionalText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
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
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
    },
    dropdownText: {
        fontSize: 16,
        color: '#111827',
    },
    dropdownPlaceholder: {
        color: '#9CA3AF',
    },
    bioInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
        minHeight: 120,
    },
    characterCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipSelected: {
        backgroundColor: '#E0F2F1',
        borderColor: '#009688',
    },
    chipIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    chipText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#009688',
    },
    chipCheck: {
        marginLeft: 4,
    },
    chipIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    otherInputContainer: {
        marginTop: 12,
    },
    otherInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#111827',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '100%',
        maxHeight: '70%',
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    clearButton: {
        padding: 4,
    },
    universityList: {
        maxHeight: 300,
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#111827',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
