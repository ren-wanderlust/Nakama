import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    SafeAreaView,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../constants/DesignSystem';

interface SettingsPageProps {
    onBack: () => void;
    onLogout?: () => void;
}

export function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Email Change State
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    // Password Change State
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            "ログアウト",
            "本当にログアウトしますか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "ログアウト",
                    style: "destructive",
                    onPress: onLogout
                }
            ]
        );
    };

    const handleUpdateEmail = async () => {
        if (!newEmail.trim() || !newEmail.includes('@')) {
            Alert.alert('エラー', '正しいメールアドレスを入力してください。');
            return;
        }
        setIsUpdatingEmail(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            Alert.alert('確認メール送信', '新しいメールアドレスに確認メールを送信しました。\nメール内のリンクをクリックして変更を完了してください。');
            setIsEmailModalVisible(false);
            setNewEmail('');
        } catch (error: any) {
            Alert.alert('エラー', 'メールアドレスの更新に失敗しました: ' + error.message);
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 8) {
            Alert.alert('エラー', 'パスワードは8文字以上で入力してください。');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('エラー', 'パスワードが一致しません。');
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            Alert.alert('完了', 'パスワードを変更しました。');
            setIsPasswordModalVisible(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            Alert.alert('エラー', 'パスワードの更新に失敗しました: ' + error.message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "アカウント削除",
            "アカウントを削除すると、メッセージやプロフィールなど全てのデータが完全に削除され、復元することはできません。\n\n本当に削除しますか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "削除する",
                    style: "destructive",
                    onPress: () => {
                        // Double confirmation
                        Alert.alert(
                            "最終確認",
                            "本当に削除してよろしいですか？この操作は取り消せません。",
                            [
                                { text: "キャンセル", style: "cancel" },
                                {
                                    text: "完全に削除する",
                                    style: "destructive",
                                    onPress: performAccountDeletion
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const performAccountDeletion = async () => {
        try {
            // Call the RPC function we defined
            const { error } = await supabase.rpc('delete_own_account');

            if (error) throw error;

            Alert.alert(
                "削除完了",
                "アカウントが削除されました。",
                [{
                    text: "OK",
                    onPress: () => {
                        if (onLogout) onLogout();
                    }
                }]
            );
        } catch (error: any) {
            console.error('Account deletion error:', error);
            Alert.alert('エラー', 'アカウントの削除に失敗しました。お問い合わせください。');
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            {/* Modern Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#009688" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>各種設定</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Notifications Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconContainer, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="notifications" size={18} color="#F59E0B" />
                        </View>
                        <Text style={styles.cardTitle}>通知設定</Text>
                    </View>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>プッシュ通知</Text>
                            <Text style={styles.settingDescription}>
                                メッセージやいいねの通知を受け取る
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#E5E7EB", true: "#009688" }}
                            thumbColor={"#fff"}
                            ios_backgroundColor="#E5E7EB"
                        />
                    </View>
                </View>

                {/* Account Settings Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconContainer, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="person" size={18} color="#3B82F6" />
                        </View>
                        <Text style={styles.cardTitle}>アカウント設定</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setIsEmailModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconContainer, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="mail" size={18} color="#6366F1" />
                            </View>
                            <View>
                                <Text style={styles.menuItemLabel}>メールアドレス変更</Text>
                                <Text style={styles.menuItemDescription}>ログイン用のメールアドレスを変更</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setIsPasswordModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="lock-closed" size={18} color="#F59E0B" />
                            </View>
                            <View>
                                <Text style={styles.menuItemLabel}>パスワード変更</Text>
                                <Text style={styles.menuItemDescription}>セキュリティのため定期的に変更を推奨</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>


                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={[styles.logoutText, { color: '#EF4444' }]}>ログアウト</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: '#FEE2E2', marginTop: 16 }]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={[styles.logoutText, { color: '#EF4444' }]}>アカウントを削除（退会）</Text>
                </TouchableOpacity>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Nakama v1.0.0</Text>
                </View>
            </ScrollView>

            {/* Email Change Modal */}
            <Modal
                visible={isEmailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEmailModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContainer}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />

                                <View style={styles.modalHeader}>
                                    <View style={styles.modalHeaderLeft}>
                                        <View style={[styles.modalIconContainer, { backgroundColor: '#EEF2FF' }]}>
                                            <Ionicons name="mail" size={24} color="#6366F1" />
                                        </View>
                                        <Text style={styles.modalTitle}>メールアドレス変更</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setIsEmailModalVisible(false)}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalBody}>
                                    <Text style={styles.modalDescription}>
                                        新しいメールアドレスに確認メールが送信されます。
                                        メール内のリンクをクリックして変更を完了してください。
                                    </Text>

                                    <Text style={styles.inputLabel}>新しいメールアドレス</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={newEmail}
                                            onChangeText={setNewEmail}
                                            placeholder="example@email.com"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, (!newEmail.includes('@') || isUpdatingEmail) && styles.saveButtonDisabled]}
                                        onPress={handleUpdateEmail}
                                        disabled={!newEmail.includes('@') || isUpdatingEmail}
                                    >
                                        {isUpdatingEmail ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={18} color="white" style={{ marginRight: 8 }} />
                                                <Text style={styles.saveButtonText}>確認メールを送信</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Password Change Modal */}
            <Modal
                visible={isPasswordModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsPasswordModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContainer}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />

                                <View style={styles.modalHeader}>
                                    <View style={styles.modalHeaderLeft}>
                                        <View style={[styles.modalIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                            <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.modalTitle}>パスワード変更</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setIsPasswordModalVisible(false)}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalBody}>
                                    <Text style={styles.inputLabel}>新しいパスワード</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            placeholder="8文字以上"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons
                                                name={showPassword ? "eye-off" : "eye"}
                                                size={20}
                                                color="#9CA3AF"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {newPassword.length > 0 && newPassword.length < 8 && (
                                        <Text style={styles.errorText}>8文字以上で入力してください</Text>
                                    )}

                                    <Text style={styles.inputLabel}>新しいパスワード（確認）</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="もう一度入力"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showConfirmPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            <Ionicons
                                                name={showConfirmPassword ? "eye-off" : "eye"}
                                                size={20}
                                                color="#9CA3AF"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                        <Text style={styles.errorText}>パスワードが一致しません</Text>
                                    )}

                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            (newPassword.length < 8 || newPassword !== confirmPassword || isUpdatingPassword) && styles.saveButtonDisabled
                                        ]}
                                        onPress={handleUpdatePassword}
                                        disabled={newPassword.length < 8 || newPassword !== confirmPassword || isUpdatingPassword}
                                    >
                                        {isUpdatingPassword ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle" size={18} color="white" style={{ marginRight: 8 }} />
                                                <Text style={styles.saveButtonText}>パスワードを変更</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
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
    backButton: {
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
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
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    settingDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuItemLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    menuItemDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 48,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
        marginLeft: 8,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
    },
    versionText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        padding: 20,
    },
    modalDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111827',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 6,
        marginLeft: 4,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#009688',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
