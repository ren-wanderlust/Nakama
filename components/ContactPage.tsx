import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    TextInput,
    Alert,
    Linking,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContactPageProps {
    onBack: () => void;
}

interface ContactOptionProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPress: () => void;
    color: string;
}

const ContactOption = ({ icon, title, description, onPress, color }: ContactOptionProps) => (
    <TouchableOpacity style={styles.contactOption} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
);

export function ContactPage({ onBack }: ContactPageProps) {
    const [inquiryType, setInquiryType] = useState<string>('');
    const [message, setMessage] = useState('');

    const inquiryTypes = [
        { id: 'bug', label: '不具合・バグ報告' },
        { id: 'feature', label: '機能に関するご要望' },
        { id: 'account', label: 'アカウントについて' },
        { id: 'report', label: 'ユーザー報告・通報' },
        { id: 'other', label: 'その他' },
    ];

    const handleEmailContact = () => {
        const subject = inquiryType
            ? `【${inquiryTypes.find(t => t.id === inquiryType)?.label || 'お問い合わせ'}】Poggアプリについて`
            : '【お問い合わせ】Poggアプリについて';
        const body = message || 'お問い合わせ内容をこちらにご記入ください。';

        Linking.openURL(`mailto:pogg.contact@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    const handleTwitter = () => {
        Linking.openURL('https://x.com/pogg_official');
    };

    const handleSendInquiry = () => {
        if (!inquiryType) {
            Alert.alert('エラー', 'お問い合わせの種類を選択してください。');
            return;
        }
        if (!message.trim()) {
            Alert.alert('エラー', 'お問い合わせ内容を入力してください。');
            return;
        }

        // In a real app, this would send to a backend API
        Alert.alert(
            '送信完了',
            'お問い合わせを受け付けました。\n3営業日以内にご返信いたします。',
            [{ text: 'OK', onPress: onBack }]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>お問い合わせ</Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Quick Contact Options */}
                    <Text style={styles.sectionTitle}>連絡方法を選ぶ</Text>
                    <View style={styles.optionsCard}>
                        <ContactOption
                            icon="mail"
                            title="メールで問い合わせ"
                            description="pogg.contact@gmail.com"
                            onPress={handleEmailContact}
                            color="#009688"
                        />
                        <View style={styles.separator} />
                        <ContactOption
                            icon="logo-twitter"
                            title="公式Xアカウント"
                            description="@pogg_official"
                            onPress={handleTwitter}
                            color="#1DA1F2"
                        />
                    </View>

                    {/* Inquiry Form */}
                    <Text style={styles.sectionTitle}>フォームから送信</Text>
                    <View style={styles.formCard}>
                        <Text style={styles.formLabel}>お問い合わせの種類 *</Text>
                        <View style={styles.typeOptions}>
                            {inquiryTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeButton,
                                        inquiryType === type.id && styles.typeButtonActive
                                    ]}
                                    onPress={() => setInquiryType(type.id)}
                                >
                                    <Text style={[
                                        styles.typeButtonText,
                                        inquiryType === type.id && styles.typeButtonTextActive
                                    ]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>お問い合わせ内容 *</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="お問い合わせ内容を詳しくご記入ください..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!inquiryType || !message.trim()) && styles.submitButtonDisabled
                            ]}
                            onPress={handleSendInquiry}
                            disabled={!inquiryType || !message.trim()}
                        >
                            <Ionicons name="send" size={18} color="white" />
                            <Text style={styles.submitButtonText}>送信する</Text>
                        </TouchableOpacity>
                    </View>

                    {/* FAQ Hint */}
                    <View style={styles.hintCard}>
                        <Ionicons name="bulb" size={20} color="#F59E0B" />
                        <Text style={styles.hintText}>
                            よくある質問は「ヘルプ・ガイドライン」のFAQでもご確認いただけます。
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 12,
        marginLeft: 4,
        marginTop: 8,
    },
    optionsCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        marginBottom: 24,
    },
    contactOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    optionDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
    },
    typeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    typeButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    typeButtonActive: {
        backgroundColor: '#009688',
        borderColor: '#009688',
    },
    typeButtonText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: 'white',
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        fontSize: 15,
        color: '#1F2937',
        minHeight: 140,
        marginBottom: 16,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#009688',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    hintCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FCD34D',
        gap: 10,
    },
    hintText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
});
