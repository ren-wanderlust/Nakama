import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SignupFlowProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
    const [step, setStep] = useState<'auth' | 'profile' | 'complete'>('auth');

    // Step 1: Auth data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Step 2: Profile data
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState('');
    const [university, setUniversity] = useState('');
    const [grade, setGrade] = useState('');
    const [seekingFor, setSeekingFor] = useState<string[]>([]);
    const [skills, setSkills] = useState<string[]>([]);
    const [skillDetails, setSkillDetails] = useState('');
    const [seekingRoles, setSeekingRoles] = useState<string[]>([]);
    const [requirementDetails, setRequirementDetails] = useState('');

    const skillOptions = [
        'エンジニア', 'デザイナー', 'マーケター', 'セールス',
        'ライター', 'プランナー', '財務/会計', '法務',
    ];

    const seekingOptions = [
        'エンジニア', 'デザイナー', 'マーケター', 'セールス',
        'ライター', 'プランナー', '財務/会計', '法務',
        'メンター', '投資家',
    ];

    const seekingForOptions = [
        'ビジネスパートナーを探す',
        'ビジネスメンバーを探す',
        '仕事を探したい',
        '情報収集',
        'その他',
    ];

    const handleSkillToggle = (skill: string) => {
        setSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    const handleSeekingToggle = (role: string) => {
        setSeekingRoles((prev) =>
            prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
        );
    };

    const handleSeekingForToggle = (option: string) => {
        setSeekingFor((prev) =>
            prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
        );
    };

    const handleAuthSubmit = () => {
        if (email && password && password === passwordConfirm && agreedToTerms) {
            setStep('profile');
        }
    };

    const handleProfileSubmit = () => {
        if (nickname && age && seekingFor.length > 0 && skills.length > 0 && seekingRoles.length > 0) {
            setStep('complete');
        }
    };

    if (step === 'auth') {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.headerTitle}>アカウント作成</Text>
                                <Text style={styles.stepText}>Step 1/2</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <LinearGradient
                                    colors={['#0d9488', '#2563eb']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressBarFill, { width: '50%' }]}
                                />
                            </View>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>メールアドレス</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="example@bizyou.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>パスワード</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="8文字以上"
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>パスワード（確認）</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={passwordConfirm}
                                    onChangeText={setPasswordConfirm}
                                    placeholder="もう一度入力してください"
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                        >
                            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                                {agreedToTerms && <Ionicons name="checkmark" size={16} color="white" />}
                            </View>
                            <Text style={styles.termsText}>
                                <Text style={styles.linkText}>利用規約</Text>と
                                <Text style={styles.linkText}>プライバシーポリシー</Text>に同意します
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={handleAuthSubmit}
                            disabled={!email || !password || password !== passwordConfirm || !agreedToTerms}
                            style={[
                                styles.nextButtonContainer,
                                (!email || !password || password !== passwordConfirm || !agreedToTerms) && styles.disabledButton
                            ]}
                        >
                            <LinearGradient
                                colors={['#0d9488', '#2563eb']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextButton}
                            >
                                <Text style={styles.nextButtonText}>次へ</Text>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    if (step === 'profile') {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setStep('auth')} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.headerTitle}>プロフィール基本情報</Text>
                                <Text style={styles.stepText}>Step 2/2</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <LinearGradient
                                    colors={['#0d9488', '#2563eb']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressBarFill, { width: '100%' }]}
                                />
                            </View>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>ニックネーム</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    placeholder="例: タロウ"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>年齢</Text>
                            <TextInput
                                style={[styles.input, { paddingLeft: 16 }]}
                                value={age}
                                onChangeText={setAge}
                                placeholder="例: 20"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>所属大学名 <Text style={styles.optionalText}>（任意）</Text></Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="school-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={university}
                                    onChangeText={setUniversity}
                                    placeholder="例: 東京大学"
                                />
                            </View>
                        </View>

                        <View style={styles.sectionBox}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="search" size={20} color="#0d9488" />
                                <Text style={styles.sectionTitle}>今、何を探していますか？</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {seekingForOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => handleSeekingForToggle(option)}
                                        style={[
                                            styles.chip,
                                            seekingFor.includes(option) ? styles.chipSelected : styles.chipUnselected
                                        ]}
                                    >
                                        {seekingFor.includes(option) && (
                                            <Ionicons name="checkmark" size={14} color="white" style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={seekingFor.includes(option) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="flash-outline" size={20} color="#0d9488" />
                                <Text style={styles.label}>持っているスキル</Text>
                            </View>
                            <Text style={styles.helperText}>あなたが提供できる役割を選んでください</Text>
                            <View style={styles.chipContainer}>
                                {skillOptions.map((skill) => (
                                    <TouchableOpacity
                                        key={skill}
                                        onPress={() => handleSkillToggle(skill)}
                                        style={[
                                            styles.chip,
                                            skills.includes(skill) ? styles.chipSelected : styles.chipUnselected
                                        ]}
                                    >
                                        {skills.includes(skill) && (
                                            <Ionicons name="checkmark" size={14} color="white" style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={skills.includes(skill) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                            {skill}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="people-outline" size={20} color="#0d9488" />
                                <Text style={styles.label}>求める仲間や条件等</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {seekingOptions.map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        onPress={() => handleSeekingToggle(role)}
                                        style={[
                                            styles.chip,
                                            seekingRoles.includes(role) ? styles.chipOrangeSelected : styles.chipUnselected
                                        ]}
                                    >
                                        {seekingRoles.includes(role) && (
                                            <Ionicons name="checkmark" size={14} color="white" style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={seekingRoles.includes(role) ? styles.chipTextSelected : styles.chipTextUnselected}>
                                            {role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={handleProfileSubmit}
                            disabled={!nickname || !age || seekingFor.length === 0 || skills.length === 0 || seekingRoles.length === 0}
                            style={[
                                styles.nextButtonContainer,
                                (!nickname || !age || seekingFor.length === 0 || skills.length === 0 || seekingRoles.length === 0) && styles.disabledButton
                            ]}
                        >
                            <LinearGradient
                                colors={['#f97316', '#ea580c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextButton}
                            >
                                <Text style={styles.nextButtonText}>BizYouを始める</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, styles.centerContent]}>
            <View style={styles.successIconContainer}>
                <LinearGradient
                    colors={['#0d9488', '#2563eb']}
                    style={styles.successIconGradient}
                >
                    <Ionicons name="checkmark" size={40} color="white" />
                </LinearGradient>
            </View>

            <Text style={styles.successTitle}>登録完了！</Text>
            <Text style={styles.successText}>すぐに仲間を探しに行きましょう</Text>

            <TouchableOpacity
                onPress={onComplete}
                style={styles.completeButtonContainer}
            >
                <LinearGradient
                    colors={['#0d9488', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextButton}
                >
                    <Text style={styles.nextButtonText}>ホーム画面へ</Text>
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    progressContainer: {
        flex: 1,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    stepText: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
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
    inputWrapper: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 1,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        paddingLeft: 40,
        fontSize: 16,
        color: '#111827',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 20,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: 'white',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0d9488', // teal-600
        borderColor: '#0d9488',
    },
    termsText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    linkText: {
        color: '#0d9488',
        textDecorationLine: 'underline',
    },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    nextButtonContainer: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    optionalText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'normal',
    },
    sectionBox: {
        backgroundColor: '#f0fdfa', // teal-50
        borderWidth: 1,
        borderColor: '#ccfbf1', // teal-200
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
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
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    chipUnselected: {
        backgroundColor: 'white',
        borderColor: '#d1d5db',
    },
    chipSelected: {
        backgroundColor: '#0d9488', // teal-600
        borderColor: '#0d9488',
    },
    chipOrangeSelected: {
        backgroundColor: '#f97316', // orange-500
        borderColor: '#f97316',
    },
    chipTextUnselected: {
        color: '#374151',
        fontSize: 14,
    },
    chipTextSelected: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    successIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 24,
    },
    successIconGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: '#4b5563',
        marginBottom: 32,
    },
    completeButtonContainer: {
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
    },
});
