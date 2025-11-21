import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface HelpPageProps {
    onBack: () => void;
}

interface FAQItem {
    question: string;
    answer: string;
}

const FAQS: FAQItem[] = [
    {
        question: '学生でなくても利用できますか？',
        answer: 'BizYouは25歳以下の「挑戦する若者」をメインターゲットとしていますが、年齢要件を満たしていれば、学生・社会人・フリーランス問わずご利用いただけます。'
    },
    {
        question: '利用料金はかかりますか？',
        answer: '現在、アプリの基本機能はすべて無料でご利用いただけます。（※将来的に企業向けプランなどの有料機能が追加される可能性がありますが、事前の告知なく課金されることはありません）'
    },
    {
        question: '本名で登録する必要がありますか？',
        answer: 'ニックネームでの登録も可能ですが、信頼性を高めるために実名またはビジネスネームでの登録を推奨しています。'
    },
    {
        question: 'マッチングしたらどうすればいいですか？',
        answer: 'まずはチャットで挨拶をし、お互いの「挑戦テーマ」について軽く話してみましょう。気が合えばZoomやカフェでの壁打ちを提案してみてください。'
    },
    {
        question: '怪しい勧誘を受けました。',
        answer: 'BizYouではネットワークビジネス(MLM)、宗教勧誘、強引な営業行為を固く禁じています。該当するユーザーを見つけた場合は、プロフィール画面右上のメニューから「通報」をお願いします。'
    },
    {
        question: '退会したいです。',
        answer: 'マイページの「各種設定」＞「アカウント削除」から手続きが可能です。一度削除したデータは復元できませんのでご注意ください。'
    }
];

const AccordionItem = ({ item }: { item: FAQItem }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity style={styles.questionRow} onPress={toggleExpand} activeOpacity={0.7}>
                <Text style={styles.questionText}>Q. {item.question}</Text>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>A. {item.answer}</Text>
                </View>
            )}
        </View>
    );
};

export function HelpPage({ onBack }: HelpPageProps) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ヘルプ・ガイドライン</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* FAQ Section */}
                <Text style={styles.sectionTitle}>よくある質問 (FAQ)</Text>
                <View style={styles.faqSection}>
                    {FAQS.map((faq, index) => (
                        <View key={index}>
                            <AccordionItem item={faq} />
                            {index < FAQS.length - 1 && <View style={styles.separator} />}
                        </View>
                    ))}
                </View>

                {/* Other Links Section */}
                <Text style={styles.sectionTitle}>規約・その他</Text>
                <View style={styles.linksSection}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Terms')}>
                        <Text style={styles.linkText}>利用規約</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Tokushoho')}>
                        <Text style={styles.linkText}>特定商取引法に基づく表記</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Contact')}>
                        <Text style={styles.linkText}>お問い合わせ</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
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
    faqSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        marginBottom: 24,
    },
    accordionContainer: {
        backgroundColor: 'white',
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        minHeight: 56,
    },
    questionText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
        lineHeight: 22,
    },
    answerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#F9FAFB',
    },
    answerText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    linksSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        marginBottom: 24,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    linkText: {
        fontSize: 15,
        color: '#1F2937',
    },
});
