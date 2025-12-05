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
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import universitiesData from '../assets/japanese_universities.json';

interface SignupFlowProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

    // Step 1: Email and Password
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    // Step 2: Nickname
    const [nickname, setNickname] = useState('');

    // Step 3: Icon
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Step 4: University and Grade
    const [university, setUniversity] = useState('');
    const [grade, setGrade] = useState('');
    const [showUniversityModal, setShowUniversityModal] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);
    const [allUniversities, setAllUniversities] = useState<string[]>([]);
    const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);

    // Step 5: Your Role
    const [skills, setSkills] = useState<string[]>([]);
    const [otherRoleText, setOtherRoleText] = useState('');

    // Step 6: Seeking Teammates
    const [seekingRoles, setSeekingRoles] = useState<string[]>([]);
    const [otherSeekingText, setOtherSeekingText] = useState('');

    // Step 7: Bio
    const [bio, setBio] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Load universities from JSON
    useEffect(() => {
        const loadUniversities = () => {
            setIsLoadingUniversities(true);
            try {
                const universities = universitiesData as string[];
                if (universities && universities.length > 0) {
                    setAllUniversities(universities);
                    setFilteredUniversities(universities);
                } else {
                    throw new Error('Universities data is empty');
                }
            } catch (error) {
                console.error('Error loading universities:', error);
                setAllUniversities([]);
                setFilteredUniversities([]);
            } finally {
                setIsLoadingUniversities(false);
            }
        };
        
        loadUniversities();
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

    // Validation errors state
    const [errors, setErrors] = useState({
        email: false,
        password: false,
        passwordConfirm: false,
        nickname: false,
        image: false,
        university: false,
        grade: false,
        skills: false,
        seekingRoles: false,
        bio: false,
    });

    // Tag data
    const skillCategories = [
        {
            title: '開発技術',
            skills: ['Webアプリ', 'モバイルアプリ', 'ゲーム開発', '機械学習']
        },
        {
            title: 'ビジネス',
            skills: ['アイディアマン', 'マーケティング/SNS運用', '英語力']
        },
        {
            title: 'その他',
            skills: ['デザイナー', '動画編集/クリエイター']
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

    const gradeOptions = [
        { value: 'B1', label: 'B1' },
        { value: 'B2', label: 'B2' },
        { value: 'B3', label: 'B3' },
        { value: 'B4', label: 'B4' },
        { value: 'M1', label: 'M1' },
        { value: 'M2', label: 'M2' },
    ];

    const pickImage = async () => {
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

    const validateEmailFormat = (emailToValidate: string): boolean => {
        // Supabaseと同様のメールアドレスフォーマット検証
        // RFC 5322に準拠した簡易的な正規表現
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        // より厳密な検証（Supabaseの検証に近い）
        // - ローカル部分（@の前）: 1文字以上、スペースなし
        // - ドメイン部分（@の後）: ドットを含む、TLD（トップレベルドメイン）が存在
        // - 全体的にスペースが含まれていない
        if (!emailRegex.test(emailToValidate)) {
            return false;
        }
        
        // 追加の検証
        const parts = emailToValidate.split('@');
        if (parts.length !== 2) {
            return false;
        }
        
        const [localPart, domain] = parts;
        
        // ローカル部分の検証
        if (localPart.length === 0 || localPart.length > 64) {
            return false;
        }
        
        // ドメイン部分の検証
        if (domain.length === 0 || domain.length > 255) {
            return false;
        }
        
        // ドメインにドットが含まれているか
        if (!domain.includes('.')) {
            return false;
        }
        
        // ドメインの最後がドットでないか
        if (domain.endsWith('.')) {
            return false;
        }
        
        // 連続するドットがないか
        if (domain.includes('..')) {
            return false;
        }
        
        // TLD（最後の部分）が2文字以上か
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2) {
            return false;
        }
        
        return true;
    };

    const validateStep1 = () => {
        let isValid = true;
        const newErrors = { ...errors };
        let errorMessage = '';

        if (!email.trim()) {
            newErrors.email = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'メールアドレスを入力してください。';
        } else if (!validateEmailFormat(email.trim())) {
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

        if (!nickname.trim()) {
            newErrors.nickname = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'ニックネームを入力してください。';
        } else {
            newErrors.nickname = false;
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
        let errorMessage = '';

        if (!imageUri) {
            newErrors.image = true;
            isValid = false;
            if (!errorMessage) errorMessage = 'プロフィール画像を設定してください。';
        } else {
            newErrors.image = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            Alert.alert('エラー', errorMessage || '入力内容を確認してください。');
        }
        return isValid;
    };

    const validateStep4 = () => {
        let isValid = true;
        const newErrors = { ...errors };
        let errorMessage = '';

        if (!university.trim()) {
            newErrors.university = true;
            isValid = false;
            if (!errorMessage) errorMessage = '大学名を入力してください。';
        } else {
            newErrors.university = false;
        }

        if (!grade) {
            newErrors.grade = true;
            isValid = false;
            if (!errorMessage) errorMessage = '学年を選択してください。';
        } else {
            newErrors.grade = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            Alert.alert('エラー', errorMessage || '入力内容を確認してください。');
        }
        return isValid;
    };

    const validateStep5 = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (skills.length === 0) {
            newErrors.skills = true;
            isValid = false;
        } else if (skills.includes('other') && !otherRoleText.trim()) {
            newErrors.skills = true;
            isValid = false;
        } else {
            newErrors.skills = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            if (skills.includes('other') && !otherRoleText.trim()) {
                Alert.alert('エラー', '「その他」を選択した場合は、内容を記入してください。');
            } else {
                Alert.alert('エラー', '少なくとも1つの役割を選択してください。');
            }
        }
        return isValid;
    };

    const validateStep6 = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (seekingRoles.length === 0) {
            newErrors.seekingRoles = true;
            isValid = false;
        } else if (seekingRoles.includes('other') && !otherSeekingText.trim()) {
            newErrors.seekingRoles = true;
            isValid = false;
        } else {
            newErrors.seekingRoles = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            if (seekingRoles.includes('other') && !otherSeekingText.trim()) {
                Alert.alert('エラー', '「その他」を選択した場合は、内容を記入してください。');
            } else {
                Alert.alert('エラー', '少なくとも1つの探している仲間を選択してください。');
            }
        }
        return isValid;
    };

    const validateStep7 = () => {
        // Step7は任意入力なので、常にtrueを返す
        // ただし、20字以内のチェックは行う
        const newErrors = { ...errors };
        
        if (bio.trim().length > 20) {
            newErrors.bio = true;
            Alert.alert('エラー', '一言アピールは20字以内で入力してください。');
            return false;
        } else {
            newErrors.bio = false;
        }

        setErrors(newErrors);
        return true;
    };

    const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
        try {
            // メールアドレスの重複チェック
            // signInWithPasswordで試行して、メールアドレスが存在するか確認
            // 注意: signUpを試行するとダミーユーザーが作成される可能性があるため、使用しない
            
            // signInWithPasswordで試行
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: emailToCheck,
                password: 'dummy_password_for_check_12345678', // ダミーパスワード
            });

            // エラーがない場合は、メールアドレスが存在し、パスワードが正しい（非常に稀なケース）
            // この場合は重複とみなす
            if (!signInError) {
                // セッションをクリア
                await supabase.auth.signOut();
                return true;
            }

            // エラーメッセージから判定
            const errorMessage = signInError.message?.toLowerCase() || '';

            // "Email not confirmed" の場合は、メールアドレスが存在する（確認されていないユーザー）
            if (
                errorMessage.includes('email not confirmed') ||
                errorMessage.includes('email_not_confirmed') ||
                errorMessage.includes('email address not confirmed')
            ) {
                return true;
            }

            // "Invalid login credentials" の場合は、メールアドレスが存在する可能性が高い
            // ただし、パスワードが間違っている場合も同じエラーになる
            // メールアドレスが存在しない場合は、通常 "Invalid login credentials" が返される
            // しかし、確実に判定するのは難しいため、この場合は重複なしとみなす
            // （実際の登録時にエラーが発生した場合は、step7で適切に処理される）
            
            // その他のエラーの場合は重複なしとみなす
            return false;
        } catch (error) {
            // エラーが発生した場合は重複なしとみなす（後で登録時にエラーが表示される）
            console.error('Email check error:', error);
            return false;
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (validateStep1()) {
                // メールアドレスの重複チェック
                setIsCheckingEmail(true);
                const emailExists = await checkEmailExists(email);
                setIsCheckingEmail(false);

                if (emailExists) {
                    setShowEmailExistsModal(true);
                } else {
                    setStep(2);
                }
            }
        } else if (step === 2) {
            if (validateStep2()) setStep(3);
        } else if (step === 3) {
            if (validateStep3()) setStep(4);
        } else if (step === 4) {
            if (validateStep4()) setStep(5);
        } else if (step === 5) {
            if (validateStep5()) setStep(6);
        } else if (step === 6) {
            if (validateStep6()) setStep(7);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
        } else {
            onCancel();
        }
    };

    const handleComplete = async () => {
        if (validateStep7()) {
            setIsSubmitting(true);
            try {
                // 0. 既存のセッションをクリア（過去にログインしていたアカウントのセッションを削除）
                await supabase.auth.signOut();
                
                // SecureStoreから直接セッションを削除（Supabaseが使用するキーを直接削除）
                if (Platform.OS !== 'web') {
                    try {
                        // Supabaseが使用するキー名の形式: sb-{project-ref}-auth-token
                        const projectRef = 'qexnfdidlqewfxskkqow';
                        const authKey = `sb-${projectRef}-auth-token`;
                        await SecureStore.deleteItemAsync(authKey);
                        
                        // 念のため、他の可能性のあるキーも削除
                        await SecureStore.deleteItemAsync(`sb-${projectRef}-auth-token-code-verifier`);
                    } catch (secureStoreError) {
                        console.log('SecureStore削除エラー（無視可能）:', secureStoreError);
                    }
                }
                
                // signOutの完了を確実にするため、少し待機
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // セッションが確実に削除されたことを確認
                const { data: { session: checkSession } } = await supabase.auth.getSession();
                if (checkSession) {
                    // セッションが残っている場合、再度signOutを試行
                    await supabase.auth.signOut();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // 1. Sign up
                const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) {
                    // エラーメッセージから重複を判定
                    const errorMessage = signUpError.message?.toLowerCase() || '';
                    if (
                        errorMessage.includes('already registered') ||
                        errorMessage.includes('user already exists') ||
                        errorMessage.includes('email already') ||
                        errorMessage.includes('already exists') ||
                        errorMessage.includes('user with this email already exists') ||
                        errorMessage.includes('email address already registered')
                    ) {
                        // メールアドレスが既に登録されている場合
                        Alert.alert(
                            '登録エラー',
                            'このメールアドレスは既に登録されています。',
                            [
                                {
                                    text: '閉じる',
                                    style: 'cancel',
                                },
                                {
                                    text: 'ログインへ',
                                    onPress: () => {
                                        onCancel();
                                    },
                                },
                            ]
                        );
                        setIsSubmitting(false);
                        return;
                    }
                    // その他のエラーの場合は通常通りエラーをthrow
                    throw signUpError;
                }

                if (!user) {
                    throw new Error('ユーザーの作成に失敗しました');
                }

                // 2. 確実にサインインする
                const { data: { session: signInSession }, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    throw new Error(`サインインに失敗しました: ${signInError.message}`);
                }

                if (!signInSession) {
                    throw new Error('セッションの取得に失敗しました');
                }

                // セッションが確実に設定されるまで待機（最大3秒）
                let currentSession: Session | null = signInSession;
                let attempts = 0;
                while (!currentSession && attempts < 6) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const { data: { session: checkSession } } = await supabase.auth.getSession();
                    currentSession = checkSession;
                    attempts++;
                }

                if (!currentSession) {
                    throw new Error('セッションの設定に失敗しました。もう一度お試しください。');
                }

                let uploadedImageUrl = imageUri;

                // 3. Upload image if exists
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

                // 4. Insert profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            name: nickname,
                            university: university,
                            bio: bio,
                            image: uploadedImageUrl,
                            skills: skills.includes('other') && otherRoleText.trim()
                                ? [...skills.filter(s => s !== 'other'), otherRoleText.trim()]
                                : skills,
                            seeking_roles: seekingRoles.includes('other') && otherSeekingText.trim()
                                ? [...seekingRoles.filter(s => s !== 'other'), otherSeekingText.trim()]
                                : seekingRoles,
                            is_student: true,
                            created_at: new Date().toISOString(),
                        }
                    ]);

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    Alert.alert('注意', 'ユーザー登録は完了しましたが、プロフィールの保存に失敗しました。');
                }

                // セッションが確実に設定されていることを再確認
                const { data: { session: finalSession } } = await supabase.auth.getSession();
                if (!finalSession) {
                    throw new Error('セッションの確認に失敗しました。もう一度お試しください。');
                }

                onComplete();
            } catch (error: any) {
                Alert.alert('登録エラー', error.message || '登録に失敗しました');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderProgressBar = () => (
        <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(step / 7) * 100}%` }]} />
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>メールアドレスとパスワードを設定</Text>
            <Text style={styles.stepSubtitle}>
                アカウント作成に必要な情報を入力してください
            </Text>

            <View style={styles.formGroup}>
                <TextInput
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors({ ...errors, email: false });
                    }}
                    placeholder="メールアドレス"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textContentType="emailAddress"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        errors.email && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <TextInput
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors({ ...errors, password: false });
                    }}
                    placeholder="パスワード（8文字以上）"
                    secureTextEntry={true}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        errors.password && styles.inputError
                    ]}
                />
            </View>

            <View style={styles.formGroup}>
                <TextInput
                    value={passwordConfirm}
                    onChangeText={(text) => {
                        setPasswordConfirm(text);
                        if (errors.passwordConfirm) setErrors({ ...errors, passwordConfirm: false });
                    }}
                    placeholder="パスワード（確認）"
                    secureTextEntry={true}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        errors.passwordConfirm && styles.inputError
                    ]}
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>ニックネームを入力</Text>
            <Text style={styles.stepSubtitle}>
                他のユーザーに表示される名前を入力してください
            </Text>

            <View style={styles.formGroup}>
                <TextInput
                    value={nickname}
                    onChangeText={(text) => {
                        setNickname(text);
                        if (errors.nickname) setErrors({ ...errors, nickname: false });
                    }}
                    placeholder="ニックネーム"
                    autoCapitalize="none"
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    style={[
                        styles.input,
                        errors.nickname && styles.inputError
                    ]}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>プロフィール画像を設定</Text>
            <Text style={styles.stepSubtitle}>
                あなたのプロフィール画像を選択してください
            </Text>

            <View style={styles.imagePickerContainer}>
                <TouchableOpacity 
                    onPress={pickImage} 
                    style={[
                        styles.imagePicker,
                        errors.image && styles.imagePickerError
                    ]}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera" size={40} color="#9ca3af" />
                            <Text style={styles.imagePlaceholderText}>画像を選択</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.image && (
                    <Text style={styles.errorText}>プロフィール画像を選択してください</Text>
                )}
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>大学と学年を選択</Text>
            <Text style={styles.stepSubtitle}>
                あなたの所属する大学と学年を選択してください
            </Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>大学名</Text>
                <TouchableOpacity
                    onPress={() => setShowUniversityModal(true)}
                    style={[
                        styles.input,
                        styles.dropdownButton,
                        errors.university && styles.inputError
                    ]}
                >
                    <Text style={[styles.dropdownText, !university && styles.dropdownPlaceholder]}>
                        {university || '大学名を選択してください'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>学年</Text>
                <TouchableOpacity
                    onPress={() => setShowGradeModal(true)}
                    style={[
                        styles.input,
                        styles.dropdownButton,
                        errors.grade && styles.inputError
                    ]}
                >
                    <Text style={[styles.dropdownText, !grade && styles.dropdownPlaceholder]}>
                        {grade ? gradeOptions.find(opt => opt.value === grade)?.label : '学年を選択してください'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
            </View>

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
                            <TextInput
                                value={searchInput}
                                onChangeText={(text) => {
                                    setSearchInput(text);
                                }}
                                placeholder="例: 東京、けいおう、とうきょう"
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
                                    <Ionicons name="close-circle" size={20} color="#6b7280" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoadingUniversities ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#2563eb" />
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
                                    setSearchInput('');
                                    setShowUniversityModal(false);
                                }}
                                        >
                                            <Text style={styles.modalOptionText}>{uni}</Text>
                                            {university === uni && (
                                                <Ionicons name="checkmark" size={20} color="#FFD700" />
                                            )}
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        )}
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
                                        if (errors.grade) {
                                            setErrors({ ...errors, grade: false });
                                        }
                                        setShowGradeModal(false);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{option.label}</Text>
                                    {grade === option.value && (
                                        <Ionicons name="checkmark" size={20} color="#FFD700" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );

    const renderStep5 = () => {
        const roleOptions = [
            { id: 'engineer', label: 'エンジニア' },
            { id: 'ideaman', label: 'アイディアマン' },
            { id: 'marketer', label: 'マーケター' },
            { id: 'creator', label: 'クリエイター' },
            { id: 'other', label: 'その他' },
        ];

        const handleRoleToggle = (roleId: string) => {
            if (skills.includes(roleId)) {
                setSkills(skills.filter(s => s !== roleId));
                if (roleId === 'other') {
                    setOtherRoleText('');
                }
            } else {
                setSkills([...skills, roleId]);
            }
            if (errors.skills) {
                setErrors({ ...errors, skills: false });
            }
        };

        const isOtherSelected = skills.includes('other');

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>あなたの役割を選択</Text>
                <Text style={styles.stepSubtitle}>
                    あなたが提供できる役割を選択してください（複数選択可能）
                </Text>

                <View style={styles.roleContainer}>
                    {roleOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            onPress={() => handleRoleToggle(option.id)}
                            style={[
                                styles.roleBox,
                                skills.includes(option.id) && styles.roleBoxSelected
                            ]}
                        >
                            <Text style={[
                                styles.roleBoxText,
                                skills.includes(option.id) && styles.roleBoxTextSelected
                            ]}>
                                {option.label}
                            </Text>
                            {skills.includes(option.id) && (
                                <Ionicons name="checkmark-circle" size={20} color="#FFD700" style={styles.checkIcon} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {isOtherSelected && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>その他の内容を記入</Text>
                        <TextInput
                            value={otherRoleText}
                            onChangeText={(text) => {
                                setOtherRoleText(text);
                            }}
                            placeholder="例: 財務、法務、PMなど"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            style={styles.textArea}
                        />
                    </View>
                )}

                {errors.skills && (
                    <Text style={styles.errorText}>少なくとも1つの役割を選択してください</Text>
                )}
            </View>
        );
    };

    const renderStep6 = () => {
        const seekingOptions = [
            { id: 'engineer', label: 'エンジニア' },
            { id: 'designer', label: 'デザイナー' },
            { id: 'marketer', label: 'マーケター' },
            { id: 'creator', label: 'クリエイター' },
            { id: 'other', label: 'その他' },
        ];

        const handleSeekingToggle = (optionId: string) => {
            if (seekingRoles.includes(optionId)) {
                setSeekingRoles(seekingRoles.filter(s => s !== optionId));
                if (optionId === 'other') {
                    setOtherSeekingText('');
                }
            } else {
                setSeekingRoles([...seekingRoles, optionId]);
            }
            if (errors.seekingRoles) {
                setErrors({ ...errors, seekingRoles: false });
            }
        };

        const isOtherSelected = seekingRoles.includes('other');

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>探している仲間を選択</Text>
                <Text style={styles.stepSubtitle}>
                    あなたが探している仲間を選択してください（複数選択可能）
                </Text>

                <View style={styles.roleContainer}>
                    {seekingOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            onPress={() => handleSeekingToggle(option.id)}
                            style={[
                                styles.roleBox,
                                seekingRoles.includes(option.id) && styles.roleBoxSelected
                            ]}
                        >
                            <Text style={[
                                styles.roleBoxText,
                                seekingRoles.includes(option.id) && styles.roleBoxTextSelected
                            ]}>
                                {option.label}
                            </Text>
                            {seekingRoles.includes(option.id) && (
                                <Ionicons name="checkmark-circle" size={20} color="#FFD700" style={styles.checkIcon} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {isOtherSelected && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>その他の内容を記入</Text>
                        <TextInput
                            value={otherSeekingText}
                            onChangeText={(text) => {
                                setOtherSeekingText(text);
                            }}
                            placeholder="例: PM、財務、法務など"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            style={styles.textArea}
                        />
                    </View>
                )}

                {errors.seekingRoles && (
                    <Text style={styles.errorText}>少なくとも1つの仲間を選択してください</Text>
                )}
            </View>
        );
    };

    const renderStep7 = () => {
        const characterCount = bio.length;
        const maxLength = 20;

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>一言アピール</Text>
                <Text style={styles.stepSubtitle}>
                    あなたの魅力を最大限に伝えるメッセージを入力してください
                </Text>

                <View style={styles.formGroup}>
                    <TextInput
                        value={bio}
                        onChangeText={(text) => {
                            if (text.length <= maxLength) {
                                setBio(text);
                                if (errors.bio) setErrors({ ...errors, bio: false });
                            }
                        }}
                        placeholder="例: スタートアップでエンジニアとして3年の経験があります"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={[
                            styles.bioInput,
                            errors.bio && styles.inputError
                        ]}
                        maxLength={maxLength}
                    />
                    <View style={styles.characterCountContainer}>
                        <Text style={[
                            styles.characterCount,
                            characterCount > maxLength * 0.8 && styles.characterCountWarning
                        ]}>
                            {characterCount} / {maxLength}
                        </Text>
                    </View>
                    <Text style={styles.optionalText}>
                        ※記入は任意です。後から設定することもできます。
                    </Text>
                </View>

                {errors.bio && (
                    <Text style={styles.errorText}>20字以内で入力してください</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Back, Progress Bar, and Next Button */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                
                <View style={styles.headerCenter}>
                    {renderProgressBar()}
                </View>
                
                <TouchableOpacity
                    onPress={step === 7 ? handleComplete : handleNext}
                    activeOpacity={0.7}
                    disabled={isSubmitting || isCheckingEmail}
                    style={styles.nextButtonHeader}
                >
                    {isSubmitting || isCheckingEmail ? (
                        <ActivityIndicator color="#FF8C00" size="small" />
                    ) : (
                        <Text style={styles.nextButtonText}>
                            {step === 7 ? '登録' : '次へ'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                        {step === 5 && renderStep5()}
                        {step === 6 && renderStep6()}
                        {step === 7 && renderStep7()}
                    </View>
                </TouchableWithoutFeedback>
            </ScrollView>

                {/* Email Exists Modal */}
                <Modal
                    visible={showEmailExistsModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowEmailExistsModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.emailExistsModalContent}>
                            <Text style={styles.emailExistsModalTitle}>
                                すでに登録されています
                            </Text>
                            <Text style={styles.emailExistsModalMessage}>
                                このメールアドレスは既に登録されています。
                            </Text>
                            <View style={styles.emailExistsModalButtons}>
                                <TouchableOpacity
                                    onPress={() => setShowEmailExistsModal(false)}
                                    style={[styles.emailExistsModalButton, styles.emailExistsModalButtonClose]}
                                >
                                    <Text style={styles.emailExistsModalButtonCloseText}>閉じる</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowEmailExistsModal(false);
                                        onCancel();
                                    }}
                                    style={[styles.emailExistsModalButton, styles.emailExistsModalButtonLogin]}
                                >
                                    <Text style={styles.emailExistsModalButtonLoginText}>ログインへ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        justifyContent: 'flex-start',
    },
    stepContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
        lineHeight: 36,
    },
    stepSubtitle: {
        fontSize: 15,
        color: '#6b7280',
        marginBottom: 40,
        lineHeight: 22,
    },
    formGroup: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 8,
        minWidth: 40,
    },
    headerCenter: {
        flex: 1,
        paddingHorizontal: 16,
    },
    progressBarContainer: {
        marginBottom: 0,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#e5e7eb',
        width: '100%',
        borderRadius: 2,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },
    nextButtonHeader: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonText: {
        color: '#FF8C00',
        fontSize: 16,
        fontWeight: '600',
    },
    imagePickerContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    imagePicker: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#f9fafb',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
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
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 12,
    },
    dropdownText: {
        fontSize: 16,
        color: '#111827',
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
        height: 500,
        maxHeight: 500,
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
    searchInputContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        maxHeight: 60,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
        height: 40,
    },
    clearButton: {
        padding: 4,
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
    universityList: {
        flex: 1,
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
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 20,
    },
    roleBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    roleBoxSelected: {
        borderColor: '#FFD700',
        backgroundColor: '#FFF9E6',
    },
    roleBoxText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    roleBoxTextSelected: {
        color: '#FF8C00',
        fontWeight: '600',
    },
    checkIcon: {
        marginLeft: 4,
    },
    textArea: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    optionalText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 8,
        fontStyle: 'italic',
    },
    bioInput: {
        backgroundColor: '#FFF9E6',
        borderWidth: 2,
        borderColor: '#FFD700',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
        minHeight: 120,
        textAlignVertical: 'top',
        shadowColor: '#FFD700',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    characterCountContainer: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    characterCount: {
        fontSize: 13,
        color: '#6b7280',
    },
    characterCountWarning: {
        color: '#f59e0b',
    },
    emailExistsModalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    emailExistsModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    emailExistsModalMessage: {
        fontSize: 15,
        color: '#6b7280',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    emailExistsModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    emailExistsModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emailExistsModalButtonClose: {
        backgroundColor: '#f3f4f6',
    },
    emailExistsModalButtonCloseText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    emailExistsModalButtonLogin: {
        backgroundColor: '#2563eb',
    },
    emailExistsModalButtonLoginText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});
