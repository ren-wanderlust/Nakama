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

interface SettingsPageProps {
    onBack: () => void;
    onLogout?: () => void;
    onOpenTerms?: () => void;
    onOpenPrivacy?: () => void;
}

export function SettingsPage({ onBack, onLogout, onOpenTerms, onOpenPrivacy }: SettingsPageProps) {
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

    const renderSectionHeader = (title: string) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const renderItem = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        rightElement: React.ReactNode,
        onPress?: () => void,
        isLast: boolean = false,
        iconColor: string = '#009688'
    ) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemLeft}>
                    <Ionicons name={icon} size={22} color={iconColor} style={styles.itemIcon} />
                    <Text style={styles.itemLabel}>{label}</Text>
                </View>
                {rightElement}
            </View>
            {!isLast && <View style={styles.separator} />}
        </TouchableOpacity>
    );

    const handleOpenURL = async (url: string) => {
        Alert.alert("外部リンク", `${url} を開きます`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>各種設定</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Notifications */}
                {renderSectionHeader('通知')}
                <View style={styles.sectionContainer}>
                    {renderItem('notifications-outline', 'プッシュ通知', (
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#34C759" }}
                            thumbColor={"#fff"}
                        />
                    ), undefined, true, '#FF9500')}
                </View>

                {/* Account Settings */}
                {renderSectionHeader('アカウント設定')}
                <View style={styles.sectionContainer}>
                    {renderItem('mail-outline', 'メールアドレス変更', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, () => setIsEmailModalVisible(true), false, '#007AFF')}
                    {renderItem('lock-closed-outline', 'パスワード変更', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, () => setIsPasswordModalVisible(true), true, '#007AFF')}
                </View>

                {/* Legal */}
                {renderSectionHeader('サポート・規約')}
                <View style={styles.sectionContainer}>
                    {renderItem('document-text-outline', '利用規約', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, onOpenTerms, false, '#8E8E93')}
                    {renderItem('shield-checkmark-outline', 'プライバシーポリシー', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, onOpenPrivacy, false, '#8E8E93')}
                    {renderItem('mail-outline', 'お問い合わせ', <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />, () => handleOpenURL('mailto:support@nakama-app.com'), true, '#007AFF')}
                </View>

                {/* Logout */}
                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>ログアウト</Text>
                    </TouchableOpacity>
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
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>メールアドレス変更</Text>
                                <TouchableOpacity onPress={() => setIsEmailModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>新しいメールアドレス</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    placeholder="example@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, isUpdatingEmail && styles.disabledButton]}
                                    onPress={handleUpdateEmail}
                                    disabled={isUpdatingEmail}
                                >
                                    {isUpdatingEmail ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>変更メールを送信</Text>
                                    )}
                                </TouchableOpacity>
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
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>パスワード変更</Text>
                                <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>新しいパスワード</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="8文字以上"
                                    secureTextEntry
                                />
                                <Text style={styles.inputLabel}>新しいパスワード（確認）</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="もう一度入力してください"
                                    secureTextEntry
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, isUpdatingPassword && styles.disabledButton]}
                                    onPress={handleUpdatePassword}
                                    disabled={isUpdatingPassword}
                                >
                                    {isUpdatingPassword ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>変更する</Text>
                                    )}
                                </TouchableOpacity>
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
        backgroundColor: '#F2F2F7',
    },
    header: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: 'white',
        borderBottomWidth: 0.5,
        borderBottomColor: '#C6C6C8',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 13,
        color: '#6D6D72',
        marginLeft: 16,
        marginBottom: 6,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    sectionContainer: {
        backgroundColor: 'white',
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#C6C6C8',
    },
    itemContainer: {
        backgroundColor: 'white',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    itemLabel: {
        fontSize: 17,
        color: '#000',
    },
    separator: {
        height: 0.5,
        backgroundColor: '#C6C6C8',
        marginLeft: 52,
    },
    logoutContainer: {
        marginTop: 32,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#C6C6C8',
    },
    logoutButton: {
        backgroundColor: 'white',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 17,
        color: '#FF3B30',
        fontWeight: '400',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#009688',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 32,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
