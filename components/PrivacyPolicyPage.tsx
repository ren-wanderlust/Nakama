import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyPageProps {
    onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>プライバシーポリシー</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.text}>
                    本サービス「Pogg」の運営者（以下「運営者」といいます）は、本サービスにおけるユーザーの情報の取扱いについて、以下の通りプライバシーポリシーを定めます。{'\n\n'}

                    <Text style={styles.sectionTitle}>1. 収集する情報</Text>{'\n\n'}
                    運営者は、本サービスの円滑な提供にあたり、以下の情報を収集します：{'\n'}
                    ・氏名、メールアドレス等の個人情報（アカウント作成・本人確認のため）{'\n'}
                    ・プロフィール情報（大学名、学年、スキル、自己紹介、プロジェクト実績等）{'\n'}
                    ・プロフィール画像{'\n'}
                    ・サービス利用履歴{'\n'}
                    ・メッセージやプロジェクト情報{'\n'}
                    ・デバイス情報（OS、端末ID等）{'\n\n'}

                    <Text style={styles.sectionTitle}>2. 情報の利用目的</Text>{'\n\n'}
                    収集した情報は、主に以下の目的で利用されます：{'\n'}
                    ・本サービスの提供、ユーザー間の共創マッチング機能の運営のため{'\n'}
                    ・本サービスの改善、及びユーザー体験向上を目的とした新サービスの開発のため{'\n'}
                    ・ユーザーからのお問い合わせに迅速に回答するため{'\n'}
                    ・利用規約に違反する行為への対応（コミュニティの品質維持のため）{'\n'}
                    ・提携企業への採用・スカウト支援のため{'\n'}
                    ・本サービスに関連する広告の配信および効果測定のため{'\n'}
                    ・通知・お知らせの送信{'\n\n'}

                    <Text style={styles.sectionTitle}>3. 情報の第三者提供</Text>{'\n\n'}
                    運営者は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません：{'\n'}
                    ・法令に基づく場合、または国の機関等への協力が必要な場合{'\n'}
                    ・公衆衛生の向上または人の生命、財産等の保護のために特に必要がある場合{'\n'}
                    ・広告配信事業者に対し、本サービスの利用状況や広告効果測定に必要な情報（トラッキングデータ、広告識別子等）を提供する場合{'\n\n'}

                    <Text style={styles.sectionTitle}>4. 統計データ等の利用</Text>{'\n\n'}
                    運営者は、収集した情報に基づき、個人を特定できない形式に加工した統計データや属性情報（例：特定スキルの保有率、所属大学の分布など）を作成し、企業の採用活動支援やサービス改善のため、第三者（提携企業、ベンチャーキャピタル等）に提供することがあります。{'\n\n'}

                    <Text style={styles.sectionTitle}>5. 情報の管理</Text>{'\n\n'}
                    運営者は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。{'\n\n'}

                    <Text style={styles.sectionTitle}>6. トラッキング技術の利用</Text>{'\n\n'}
                    本サービスでは、サービスの利便性向上および広告配信効果の測定のために、Cookie及びこれに類する<Text style={{ fontWeight: 'bold' }}>トラッキング技術（広告識別子ID等）</Text>を利用することがあります。{'\n\n'}

                    <Text style={styles.sectionTitle}>7. 個人情報の開示・訂正・削除</Text>{'\n\n'}
                    ユーザーは、運営者が保有する自己の個人情報について、開示、訂正、削除を求めることができます。アカウント削除により、登録されたすべての個人情報が削除されます。{'\n\n'}

                    <Text style={styles.sectionTitle}>8. プライバシーポリシーの変更</Text>{'\n\n'}
                    運営者は、必要に応じて本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点で効力を生じるものとします。{'\n\n'}

                    <Text style={styles.sectionTitle}>9. お問い合わせ先</Text>{'\n\n'}
                    本プライバシーポリシーに関するお問い合わせは、以下にご連絡ください。{'\n'}
                    ・アプリ内の「お問い合わせ」フォーム{'\n'}
                    ・メール： pogg.contact@gmail.com{'\n\n'}

                    制定日：2025年12月13日{'\n'}
                </Text>

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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    text: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
});
