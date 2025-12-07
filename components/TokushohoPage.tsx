import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TokushohoPageProps {
    onBack: () => void;
}

interface InfoRowProps {
    label: string;
    value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

export function TokushohoPage({ onBack }: TokushohoPageProps) {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>特定商取引法に基づく表記</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    特定商取引法に基づき、以下の事項を表示いたします。
                </Text>

                <View style={styles.infoCard}>
                    <InfoRow
                        label="販売業者"
                        value="Nakama運営事務局"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="運営統括責任者"
                        value="※ご請求があった場合に遅滞なく開示いたします"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="所在地"
                        value="※ご請求があった場合に遅滞なく開示いたします"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="電話番号"
                        value="※ご請求があった場合に遅滞なく開示いたします"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="メールアドレス"
                        value="support@nakama-app.com"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="販売価格"
                        value="各サービスページに表示される価格に準じます。表示価格は税込みです。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="商品代金以外の必要料金"
                        value="インターネット接続料、通信料等はお客様のご負担となります。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="支払方法"
                        value="クレジットカード決済、App Store決済、Google Play決済"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="支払時期"
                        value="ご利用のクレジットカード会社の規定に基づきます。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="商品の引渡時期"
                        value="決済完了後、即時にサービスをご利用いただけます。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="返品・キャンセルについて"
                        value="デジタルコンテンツの性質上、購入後の返品・キャンセルは原則としてお受けできません。ただし、法令に基づく場合はこの限りではありません。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="動作環境"
                        value="iOS 14.0以上 / Android 8.0以上"
                    />
                </View>

                <View style={styles.noteSection}>
                    <Text style={styles.noteTitle}>ご注意事項</Text>
                    <Text style={styles.noteContent}>
                        ・上記の連絡先は、商品に関するお問い合わせ専用です。{'\n'}
                        ・お問い合わせはメールにて承っております。{'\n'}
                        ・返信には数営業日いただく場合がございます。
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        fontSize: 16,
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
    description: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 20,
        lineHeight: 22,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    infoRow: {
        padding: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        color: '#1F2937',
        lineHeight: 22,
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    noteSection: {
        marginTop: 24,
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    noteTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 8,
    },
    noteContent: {
        fontSize: 13,
        color: '#92400E',
        lineHeight: 20,
    },
});
