import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TermsOfServicePage } from './TermsOfServicePage';
import { TokushohoPage } from './TokushohoPage';
import { ContactPage } from './ContactPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

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

// FAQカテゴリ定義
interface FAQCategory {
    title: string;
    icon: string;
    items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
    {
        title: 'アカウント・登録について',
        icon: 'person-circle-outline',
        items: [
            {
                question: '誰でも利用できますか？',
                answer: 'Poggは「挑戦する学生・若手」を中心としたマッチングアプリです。学生、社会人、フリーランス、起業家など、挑戦する意欲のある方であればどなたでもご利用いただけます。'
            },
            {
                question: '登録に必要なものは何ですか？',
                answer: 'メールアドレスのみで登録が可能です。Gmail、Yahoo!メール、各大学のメールアドレスなど、どのメールアドレスでもご利用いただけます。登録後、プロフィール情報を充実させることで、より良いマッチングが期待できます。'
            },
            {
                question: '本名で登録する必要がありますか？',
                answer: 'ニックネームでの登録も可能です。ただし、ビジネス目的のマッチングアプリという特性上、信頼性を高めるために実名またはビジネスネームでの登録を推奨しています。プロフィール写真も本人の写真を推奨しています。'
            },
            {
                question: 'プロフィールを後から変更できますか？',
                answer: 'はい、マイページから「プロフィール編集」をタップすることで、プロフィール写真・自己紹介・スキル・挑戦テーマなど、すべての情報をいつでも変更できます。魅力的なプロフィールはマッチング率アップにつながります。'
            },
            {
                question: '複数のアカウントを作成できますか？',
                answer: 'いいえ、お一人様につき1アカウントのみとなります。複数アカウントの作成は利用規約違反となり、発覚した場合はすべてのアカウントが停止される可能性があります。'
            },
            {
                question: '退会したいです。',
                answer: 'マイページの「各種設定」＞「アカウント削除」から手続きが可能です。退会すると、プロフィール情報・マッチング履歴・チャット履歴・プロジェクト情報など、すべてのデータが完全に削除され、復元することはできません。慎重にご検討ください。'
            }
        ]
    },
    {
        title: 'マッチング・交流について',
        icon: 'heart-outline',
        items: [
            {
                question: 'マッチングの仕組みを教えてください。',
                answer: 'ホーム画面に表示されるユーザーのプロフィールカードをスワイプして「いいね」を送ることができます。お互いが「いいね」を送り合うとマッチングが成立し、チャットが可能になります。興味のあるスキルや挑戦テーマを持つ人を探してみましょう。'
            },
            {
                question: 'マッチングしたらどうすればいいですか？',
                answer: 'まずはチャットで自己紹介と「なぜいいねしたか」を伝えましょう。お互いの挑戦テーマやスキルについて話し、共通点を見つけてください。相性が良ければ、ZoomやGoogle Meet、カフェでの対面ミーティングを提案してみてください。'
            },
            {
                question: 'マッチングを解除したいです。',
                answer: 'チャット画面右上のメニュー（︙）から「マッチング解除」を選択できます。解除すると、お互いのチャット履歴が削除され、相手には通知されません。再度マッチングするには、もう一度お互いが「いいね」を送り合う必要があります。'
            },
            {
                question: '相手からメッセージが来ません。',
                answer: 'マッチング後しばらく経っても返信がない場合は、相手が忙しいか、アプリを確認していない可能性があります。数日待っても返信がない場合は、別のユーザーとのマッチングを試みてください。質の高い最初のメッセージを送ることで返信率が上がります。'
            },
            {
                question: 'いいねを間違えて送ってしまいました。',
                answer: '一度送った「いいね」は取り消すことができません。マッチングが成立した場合は、正直に間違いであったことを伝えるか、マッチングを解除することができます。'
            }
        ]
    },
    {
        title: 'プロジェクト機能について',
        icon: 'briefcase-outline',
        items: [
            {
                question: 'プロジェクトとは何ですか？',
                answer: 'プロジェクトは、ビジネスアイデアや起業計画、イベント企画などを公開し、仲間を募集できる機能です。自分のプロジェクトを掲載したり、他のユーザーのプロジェクトに応募したりすることで、志を同じくするメンバーと出会うことができます。'
            },
            {
                question: 'プロジェクトを作成するにはどうすればいいですか？',
                answer: 'ホーム画面の「プロジェクト」タブから「新規作成」ボタンをタップし、プロジェクト名・概要・募集するスキル・締め切りなどを入力して公開できます。魅力的な説明文で、どんな仲間を求めているか具体的に記載しましょう。'
            },
            {
                question: 'プロジェクトに応募するとどうなりますか？',
                answer: '応募すると、プロジェクトオーナーに通知が届きます。オーナーがあなたのプロフィールを確認し、「承認」または「却下」を判断します。承認されると、プロジェクトメンバーとしてチャットグループに参加できます。'
            },
            {
                question: '自分のプロジェクトへの応募を管理するには？',
                answer: 'マイページの「プロジェクト」から自分が作成したプロジェクトを選択し、「応募者一覧」を確認できます。各応募者のプロフィールを確認し、「承認」または「却下」ボタンで対応してください。'
            },
            {
                question: 'プロジェクトを削除したいです。',
                answer: 'プロジェクト詳細画面の右上メニューから「削除」を選択できます。ただし、既にメンバーがいる場合は慎重にご検討ください。削除前にメンバーへ連絡することを推奨します。'
            }
        ]
    },
    {
        title: '安全性・通報について',
        icon: 'shield-checkmark-outline',
        items: [
            {
                question: '怪しい勧誘を受けました。',
                answer: 'Poggではネットワークビジネス(MLM)、マルチ商法、宗教勧誘、情報商材の販売、強引な営業行為を固く禁じています。該当するユーザーを見つけた場合は、チャット画面またはプロフィール画面右上のメニューから「通報」をお願いします。迅速に対応いたします。'
            },
            {
                question: '不適切なメッセージや画像を受け取りました。',
                answer: '性的なメッセージ、暴言、差別的発言、脅迫など、不快なコンテンツを受け取った場合は、すぐに「通報」してください。チャット画面右上のメニューから通報でき、スクリーンショットも証拠として運営に送信されます。'
            },
            {
                question: '特定のユーザーをブロックしたいです。',
                answer: 'チャット画面またはプロフィール画面右上のメニューから「ブロック」を選択できます。ブロックすると、相手からのメッセージを受け取らなくなり、お互いのプロフィールが表示されなくなります。ブロックした相手には通知されません。'
            },
            {
                question: '通報したら相手にバレますか？',
                answer: 'いいえ、通報は完全に匿名で処理されます。通報したことは相手に一切通知されませんので、安心してご報告ください。運営チームが内容を確認し、適切な対応を行います。'
            },
            {
                question: '個人情報は安全ですか？',
                answer: 'はい、お客様の個人情報は暗号化されて保存され、第三者に無断で提供することはありません。詳細は「プライバシーポリシー」をご確認ください。また、他のユーザーとの交流では、最初から個人情報（電話番号・住所・LINE IDなど）を共有しないことを推奨します。'
            },
            {
                question: '実際に会う際の注意点はありますか？',
                answer: '初対面の相手と会う際は、①公共の場所を選ぶ、②友人に行き先を伝える、③昼間の時間帯にする、④お酒の席は避ける、⑤おかしいと思ったらすぐに帰る、などの対策を推奨します。安全を第一に行動してください。'
            }
        ]
    },
    {
        title: '料金・その他',
        icon: 'help-circle-outline',
        items: [
            {
                question: '利用料金はかかりますか？',
                answer: '現在、Poggのすべての機能は完全無料でご利用いただけます。マッチング・チャット・プロジェクト作成・応募など、制限なくお使いいただけます。将来的にプレミアム機能が追加される可能性がありますが、事前の告知なく課金されることはありません。'
            },
            {
                question: '通知が届きません。',
                answer: 'スマートフォンの「設定」＞「通知」からPoggアプリの通知が有効になっているか確認してください。また、おやすみモードや低電力モードが有効だと通知が制限される場合があります。問題が解決しない場合は、アプリを再起動してお試しください。'
            },
            {
                question: 'アプリが正常に動作しません。',
                answer: '①アプリを完全に終了して再起動する、②インターネット接続を確認する、③アプリを最新バージョンにアップデートする、④スマートフォンを再起動する、の順にお試しください。それでも解決しない場合は「お問い合わせ」からご連絡ください。'
            },
            {
                question: 'パスワードを忘れました。',
                answer: 'ログイン画面の「パスワードをお忘れですか？」をタップし、登録したメールアドレスを入力してください。パスワードリセット用のリンクがメールで届きます。迷惑メールフォルダも確認してください。'
            },
            {
                question: 'お問い合わせはどこからできますか？',
                answer: 'このヘルプ画面下部の「お問い合わせ」から、メールでお問い合わせいただけます。通常3営業日以内にご返信いたします。バグ報告・機能リクエスト・その他ご意見もお待ちしております。'
            }
        ]
    }
];

// 後方互換性のため、従来のFAQS配列も維持（フラット化）
const FAQS: FAQItem[] = FAQ_CATEGORIES.flatMap(category => category.items);

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

type SubPageType = 'terms' | 'privacy' | 'tokushoho' | 'contact' | null;

export function HelpPage({ onBack }: HelpPageProps) {
    const [activeSubPage, setActiveSubPage] = useState<SubPageType>(null);

    const renderSubPage = () => {
        switch (activeSubPage) {
            case 'terms':
                return <TermsOfServicePage onBack={() => setActiveSubPage(null)} />;
            case 'privacy':
                return <PrivacyPolicyPage onBack={() => setActiveSubPage(null)} />;
            case 'tokushoho':
                return <TokushohoPage onBack={() => setActiveSubPage(null)} />;
            case 'contact':
                return <ContactPage onBack={() => setActiveSubPage(null)} />;
            default:
                return null;
        }
    };

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
                {/* FAQ Categories */}
                {FAQ_CATEGORIES.map((category, categoryIndex) => (
                    <View key={categoryIndex}>
                        <View style={styles.categoryHeader}>
                            <Ionicons name={category.icon as any} size={20} color="#6366F1" />
                            <Text style={styles.categoryTitle}>{category.title}</Text>
                        </View>
                        <View style={styles.faqSection}>
                            {category.items.map((faq, itemIndex) => (
                                <View key={itemIndex}>
                                    <AccordionItem item={faq} />
                                    {itemIndex < category.items.length - 1 && <View style={styles.separator} />}
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Other Links Section */}
                <Text style={styles.sectionTitle}>規約・その他</Text>
                <View style={styles.linksSection}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubPage('terms')}>
                        <Text style={styles.linkText}>利用規約</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubPage('privacy')}>
                        <Text style={styles.linkText}>プライバシーポリシー</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubPage('tokushoho')}>
                        <Text style={styles.linkText}>特定商取引法に基づく表記</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubPage('contact')}>
                        <Text style={styles.linkText}>お問い合わせ</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Sub Page Modal */}
            <Modal
                visible={activeSubPage !== null}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setActiveSubPage(null)}
            >
                {renderSubPage()}
            </Modal>
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
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 12,
        marginLeft: 4,
        marginTop: 8,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 16,
        paddingHorizontal: 4,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginLeft: 8,
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
        paddingVertical: 14,
        paddingHorizontal: 12,
        minHeight: 52,
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
        paddingHorizontal: 12,
        paddingBottom: 14,
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
