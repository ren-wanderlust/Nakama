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
                        label="事業者の名称"
                        value="Pogg 運営事務局"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="運営統括責任者"
                        value="※消費者からのご請求があった場合、遅滞なく開示いたします。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="所在地"
                        value="※消費者からのご請求があった場合、遅滞なく開示いたします。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="電話番号"
                        value="※消費者からのご請求があった場合、遅滞なく開示いたします。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="メールアドレス"
                        value="pogg.contact@gmail.com"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="販売価格"
                        value="購入手続きの際に画面に表示されます。 （基本機能は無料です。有料プランがある場合は、該当ページに税込価格を表示します。）"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="商品代金以外の必要料金"
                        value="・当サイトのページの閲覧、コンテンツ購入、ソフトウェアのダウンロード等に必要となるインターネット接続料金、通信料金等はお客様の負担となります。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="支払方法"
                        value={`以下のいずれかのお支払方法をご利用いただけます。
・App Store 決済（iOS端末のお客様）
・Google Play 決済（Android端末のお客様）
・その他、各プラットフォームが定める決済方法`}
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="支払時期"
                        value="ご利用のプラットフォーム（Apple Inc. / Google LLC）またはクレジットカード会社の規約に基づき、購入完了と同時に課金が行われます。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="商品の引渡時期"
                        value="購入手続き完了後、即時にご利用いただけます。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="返品・キャンセルに関する特約"
                        value="デジタルコンテンツの性質上、購入確定後の返品・キャンセル・交換についてはお受けできません。 なお、本サービスには、特定商取引法に規定されるクーリング・オフが適用されません。"
                    />
                    <View style={styles.separator} />

                    <InfoRow
                        label="動作環境"
                        value={`以下の環境にて動作確認を行っております。
・iOS 14.0 以降
・Android 8.0 以降
※全ての端末での動作を保証するものではありません。`}
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
