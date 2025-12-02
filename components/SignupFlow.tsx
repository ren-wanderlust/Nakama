import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    Image,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import universitiesData from '../assets/japanese_universities.json';

interface SignupFlowProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Account info
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [nickname, setNickname] = useState('');

    // Step 2: Profile info
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [age, setAge] = useState('');
    const [university, setUniversity] = useState('');
    const [bio, setBio] = useState('');
    const [showUniversityModal, setShowUniversityModal] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);
    const [allUniversities, setAllUniversities] = useState<string[]>([]);
    const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load universities from JSON
    useEffect(() => {
        const loadUniversities = () => {
            setIsLoadingUniversities(true);
            try {
                // Load from JSON file (converted from CSV)
                const universities = universitiesData as string[];
                if (universities && universities.length > 0) {
                    setAllUniversities(universities);
                    setFilteredUniversities(universities);
                } else {
                    throw new Error('Universities data is empty');
                }
            } catch (error) {
                console.error('Error loading universities:', error);
                // Fallback to empty list instead of alert to avoid blocking the flow
                setAllUniversities([]);
                setFilteredUniversities([]);
            } finally {
                setIsLoadingUniversities(false);
            }
        };
        
        loadUniversities();
    }, []);

    // Filter universities by search input (partial match)
    useEffect(() => {
        if (!searchInput.trim()) {
            setFilteredUniversities(allUniversities);
            return;
        }

        const searchTerm = searchInput.trim().toLowerCase();
        const filtered = allUniversities.filter(uni => {
            // Check if search term is included in university name (case-insensitive)
            return uni.toLowerCase().includes(searchTerm);
        });
        
        setFilteredUniversities(filtered);
    }, [searchInput, allUniversities]);

    // Step 3: Tags (same as ProfileEdit)
    const [seekingFor, setSeekingFor] = useState<string[]>([]);
    const [skills, setSkills] = useState<string[]>([]);
    const [seekingRoles, setSeekingRoles] = useState<string[]>([]);

    // Validation errors state
    const [errors, setErrors] = useState({
        nickname: false,
        email: false,
        password: false,
        passwordConfirm: false,
        image: false,
        age: false,
        university: false,
        bio: false,
        seekingFor: false,
        skills: false,
        seekingRoles: false,
    });

    // Tag data (copied from ProfileEdit)
    const skillCategories = [
        {
            title: '💻 エンジニア',
            skills: ['フロントエンド', 'バックエンド', 'モバイルアプリ', 'ゲーム開発', 'AI / データ', 'ノーコード']
        },
        {
            title: '🎨 デザイナー',
            skills: ['UI / UXデザイン', 'グラフィック / イラスト']
        },
        {
            title: '📣 マーケ / 広報',
            skills: ['マーケティング', 'SNS運用', 'ライター']
        },
        {
            title: '💼 セールス / BizDev',
            skills: ['セールス (営業)', '事業開発 (BizDev)']
        },
        {
            title: '🎥 動画 / クリエイター',
            skills: ['動画編集', '3D / CG']
        },
        {
            title: '1️⃣ PM / ディレクター',
            skills: ['PM / ディレクター', 'コミュニティ運営']
        },
        {
            title: '💰 財務 / 専門職',
            skills: ['財務 / 会計', '法務 / 知財']
        },
        {
            title: '🌏 その他 / 語学',
            skills: ['英語 / 語学']
        }
    ];

    const seekingOptions = [
        '💻 エンジニア',
        '🎨 デザイナー',
        '📣 マーケ / 広報',
        '💼 セールス / BizDev',
        '🎥 動画 / クリエイター',
        '1️⃣ PM / ディレクター',
        '💰 財務 / 専門職',
        '🌏 その他 / 語学',
        '🗣️ 壁打ち相手',
        '🤔 まだ分からない',
    ];

    const seekingForOptions = [
        'ビジネスメンバー探し',
        'アイデア模索中',
        'コミュニティ形成',
        'まずは話してみたい',
        '起業に興味あり',
        '壁打ち相手募集',
    ];

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            if (errors.image) setErrors({ ...errors, image: false });
        }
    };

    const handleToggle = (
        item: string,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (list.includes(item)) {
            setList(list.filter((i) => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const validateStep1 = () => {
        let isValid = true;
        const newErrors = { ...errors };
        let errorMessage = '';

        if (!nickname.trim()) {
            newErrors.nickname = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'ニックネームを入力してください。';
        } else {
            newErrors.nickname = false;
        }

        if (!email.trim()) {
            newErrors.email = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'メールアドレスを入力してください。';
        } else if (!email.includes('@')) {
            newErrors.email = true;
            isValid = false;
            if (!errorMessage) errorMessage = '正しいメールアドレスを入力してください。';
        } else {
            newErrors.email = false;
        }

        if (password.length < 8) {
            newErrors.password = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'パスワードは8文字以上で設定してください。';
        } else {
            newErrors.password = false;
        }

        if (password !== passwordConfirm) {
            newErrors.passwordConfirm = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'パスワードが一致しません。';
        } else {
            newErrors.passwordConfirm = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            Alert.alert('エラー', errorMessage || '入力内容を確認してください。');
        }
        return isValid;
    };

    const validateStep2 = () => {
        let isValid = true;
        const newErrors = { ...errors };
        let errorMessage = '';

        if (!imageUri) {
            newErrors.image = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'プロフィール画像を設定してください。';
        } else {
            newErrors.image = false;
        }

        if (!age.trim()) {
            newErrors.age = true;
            isValid = false;
            if (!errorMessage) errorMessage = '年齢を入力してください。';
        } else if (isNaN(Number(age))) {
            newErrors.age = true;
            isValid = false;
            if (!errorMessage) errorMessage = '年齢は半角数字で入力してください。';
        } else {
            newErrors.age = false;
        }

        if (!university.trim()) {
            newErrors.university = true;
            isValid = false;
            if (!errorMessage) errorMessage = '大学名を入力してください。';
        } else {
            newErrors.university = false;
        }

        if (!bio.trim()) {
            newErrors.bio = true;
            isValid = false;
            if (!errorMessage) errorMessage = '自己紹介文を入力してください。';
        } else {
            newErrors.bio = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            Alert.alert('エラー', errorMessage || '入力内容を確認してください。');
        }
        return isValid;
    };

    const validateStep3 = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (seekingFor.length === 0) newErrors.seekingFor = true;
        else newErrors.seekingFor = false;

        if (skills.length === 0) newErrors.skills = true;
        else newErrors.skills = false;

        if (seekingRoles.length === 0) newErrors.seekingRoles = true;
        else newErrors.seekingRoles = false;

        setErrors(newErrors);

        if (seekingFor.length === 0 || skills.length === 0 || seekingRoles.length === 0) {
            Alert.alert('エラー', 'すべての項目で少なくとも1つのタグを選択してください。');
            isValid = false;
        }
        return isValid;
    };

    const handleNext = () => {
        if (step === 1) {
            if (validateStep1()) setStep(2);
        } else if (step === 2) {
            if (validateStep2()) setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as 1 | 2 | 3);
        } else {
            onCancel();
        }
    };

    const handleComplete = async () => {
        if (validateStep3()) {
            setIsSubmitting(true);
            try {
                // 1. Sign up
                const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;

                if (user) {
                    let uploadedImageUrl = imageUri;

                    // 2. Upload image if exists
                    if (imageUri) {
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
                                xhr.open('GET', imageUri, true);
                                xhr.send(null);
                            });

                            const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
                            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                            const filePath = `${fileName}`;

                            const { error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(filePath, arrayBuffer, {
                                    contentType: `image/${fileExt}`,
                                    upsert: true,
                                });

                            if (uploadError) {
                                console.log('Image upload warning (RLS policy):', uploadError.message);
                                // Upload failed, use a default avatar or the local one (though local won't work for others)
                                // For now, let's use a placeholder to ensure the profile is created successfully
                                uploadedImageUrl = 'https://placehold.co/400x400/png';
                            } else {
                                const { data: { publicUrl } } = supabase.storage
                                    .from('avatars')
                                    .getPublicUrl(filePath);
                                uploadedImageUrl = publicUrl;
                            }
                        } catch (uploadErr) {
                            console.log('Image upload exception:', uploadErr);
                            uploadedImageUrl = 'https://placehold.co/400x400/png';
                        }
                    }

                    // 3. Insert profile
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: user.id,
                                name: nickname,
                                age: parseInt(age, 10),
                                university: university, // or company
                                bio: bio,
                                image: uploadedImageUrl,
                                skills: skills,
                                seeking_for: seekingFor,
                                seeking_roles: seekingRoles,
                                is_student: true, // Defaulting to true for now
                                created_at: new Date().toISOString(),
                            }
                        ]);

                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                        Alert.alert('注意', 'ユーザー登録は完了しましたが、プロフィールの保存に失敗しました。');
                    }
                }

                onComplete();
            } catch (error: any) {
                Alert.alert('登録エラー', error.message || '登録に失敗しました');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.progressContainer}>
                <Text style={styles.headerTitle}>アカウント作成</Text>
                <Text style={styles.stepText}>Step {step}/3</Text>
            </View>
            <View style={styles.placeholder} />
        </View>
    );

    const renderProgressBar = () => (
        <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>アカウント情報</Text>
            <Text style={styles.stepSubtitle}>メールアドレスとパスワードを設定してください</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>ニックネーム</Text>
                <TextInput
                    value={nickname}
                    onChangeText={(text) => {
                        setNickname(text);
                        if (errors.nickname) setErrors({ ...errors, nickname: false });
                    }}
                    placeholder="例: タロウ"
                    autoCapitalize="none"
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        { backgroundColor: '#ffffff' },
                        errors.nickname && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors({ ...errors, email: false });
                    }}
                    placeholder="example@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textContentType="emailAddress"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        { backgroundColor: '#ffffff' },
                        errors.email && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>パスワード</Text>
                <TextInput
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors({ ...errors, password: false });
                    }}
                    placeholder="8文字以上"
                    secureTextEntry={true}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        { backgroundColor: '#ffffff' },
                        errors.password && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>パスワード（確認）</Text>
                <TextInput
                    value={passwordConfirm}
                    onChangeText={(text) => {
                        setPasswordConfirm(text);
                        if (errors.passwordConfirm) setErrors({ ...errors, passwordConfirm: false });
                    }}
                    placeholder="もう一度入力してください"
                    secureTextEntry={true}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        { backgroundColor: '#ffffff' },
                        errors.passwordConfirm && styles.inputError
                    ]}
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>基本プロフィール</Text>
            <Text style={styles.stepSubtitle}>あなたの基本情報を入力してください</Text>

            <View style={styles.imagePickerContainer}>
                <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, errors.image && styles.imagePickerError]}>
                    {imageUri ? (
                        <>
                            <Image source={{ uri: imageUri }} style={styles.profileImage} />
                            <View style={styles.editIconContainer}>
                                <Ionicons name="pencil" size={12} color="white" />
                            </View>
                        </>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera" size={32} color="#9ca3af" />
                            <Text style={styles.imagePlaceholderText}>写真を追加</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.image && <Text style={styles.errorText}>必須です</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>年齢</Text>
                <TextInput
                    value={age}
                    onChangeText={(text) => {
                        setAge(text);
                        if (errors.age) setErrors({ ...errors, age: false });
                    }}
                    placeholder="例: 20"
                    keyboardType="numeric"
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        { backgroundColor: '#ffffff' },
                        errors.age && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>大学名</Text>
                <TouchableOpacity
                    onPress={() => setShowUniversityModal(true)}
                    style={[
                        styles.input,
                        styles.dropdownButton,
                        { backgroundColor: '#ffffff' },
                        errors.university && styles.inputError
                    ]}
                >
                    <Text style={[styles.dropdownText, !university && styles.dropdownPlaceholder]}>
                        {university || '大学名を選択してください'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
                
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
                            
                            {/* Search Input */}
                            <View style={styles.hiraganaInputContainer}>
                                <Text style={styles.hiraganaLabel}>大学名を検索</Text>
                                <TextInput
                                    value={searchInput}
                                    onChangeText={(text) => {
                                        setSearchInput(text);
                                    }}
                                    placeholder="例: 東京、けいおう、とうきょう"
                                    style={styles.hiraganaInput}
                                    autoFocus={true}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {searchInput && (
                                    <TouchableOpacity
                                        onPress={() => setSearchInput('')}
                                        style={styles.clearButton}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* University List */}
                            {isLoadingUniversities ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#0d9488" />
                                    <Text style={styles.loadingText}>読み込み中...</Text>
                                </View>
                            ) : (
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
                                        filteredUniversities.map((uni, index) => (
                                            <TouchableOpacity
                                                key={`${uni}-${index}`}
                                                style={styles.modalOption}
                                                onPress={() => {
                                                    setUniversity(uni);
                                                    if (errors.university) {
                                                        setErrors({ ...errors, university: false });
                                                    }
                                                    setShowUniversityModal(false);
                                                    setSearchInput('');
                                                }}
                                            >
                                                <Text style={styles.modalOptionText}>{uni}</Text>
                                                {university === uni && (
                                                    <Ionicons name="checkmark" size={20} color="#0d9488" />
                                                )}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>自己紹介文</Text>
                <TextInput
                    value={bio}
                    onChangeText={(text) => {
                        setBio(text);
                        if (errors.bio) setErrors({ ...errors, bio: false });
                    }}
                    placeholder="自己紹介を入力してください"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        styles.textArea,
                        { backgroundColor: '#ffffff' },
                        errors.bio && styles.inputError
                    ]}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>タグ設定</Text>
            <Text style={styles.stepSubtitle}>あなたのスキルや目的を選択してください</Text>

            {/* Status/Purpose */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="flag-outline" size={20} color={errors.seekingFor ? "#ef4444" : "#0d9488"} />
                    <Text style={[styles.sectionTitle, errors.seekingFor && styles.sectionTitleError]}>🌱 現在のステータス・目的</Text>
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

            {/* Skills */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="flash-outline" size={20} color={errors.skills ? "#ef4444" : "#0d9488"} />
                    <Text style={[styles.sectionTitle, errors.skills && styles.sectionTitleError]}>⚡️ 持っているスキル</Text>
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

            {/* Seeking Roles */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={20} color={errors.seekingRoles ? "#ef4444" : "#0d9488"} />
                    <Text style={[styles.sectionTitle, errors.seekingRoles && styles.sectionTitleError]}>🤝 求める仲間・条件</Text>
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
    );



    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {renderHeader()}
                {renderProgressBar()}

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={step === 3 ? handleComplete : handleNext}
                        activeOpacity={0.9}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={['#0d9488', '#14b8a6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextButton}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.nextButtonText}>
                                        {step === 3 ? '登録してはじめる' : '次へ'}
                                    </Text>
                                    {step < 3 && <Ionicons name="arrow-forward" size={20} color="white" />}
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
    backButton: {
        padding: 8,
    },
    progressContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    stepText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    placeholder: {
        width: 40,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#e5e7eb',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#0d9488',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    stepContainer: {
        marginBottom: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#000',
    },
    inputError: {
        backgroundColor: '#fef2f2',
        borderColor: '#ef4444',
    },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f3f4f6',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    imagePickerError: {
        borderColor: '#ef4444',
        borderWidth: 2,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0d9488',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    sectionTitleError: {
        color: '#ef4444',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
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
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
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
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 12,
    },
    dropdownText: {
        fontSize: 16,
        color: '#000',
    },
    dropdownPlaceholder: {
        color: '#9ca3af',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '90%',
        maxHeight: '70%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#374151',
    },
    modalInputContainer: {
        padding: 16,
    },
    modalTextInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#000',
        marginTop: 8,
        marginBottom: 16,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#f3f4f6',
    },
    modalButtonCancelText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '500',
    },
    modalButtonConfirm: {
        backgroundColor: '#0d9488',
    },
    modalButtonConfirmText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    hiraganaInputContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    hiraganaLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        minWidth: 120,
    },
    hiraganaInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        textAlign: 'center',
        color: '#000',
    },
    clearButton: {
        padding: 4,
    },
    universityList: {
        maxHeight: 400,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
});
