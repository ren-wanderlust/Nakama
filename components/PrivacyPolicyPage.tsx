import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyPageProps {
    onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
    return (
        <View style={styles.container}>
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
                    <Text style={styles.sectionTitle}>1. 収集する情報</Text>{'\n\n'}
                    当社は、本サービスの提供にあたり、以下の情報を収集します：{'\n'}
                    ・氏名、メールアドレス等の個人情報{'\n'}
                    ・プロフィール情報（大学名、学年、スキル、自己紹介等）{'\n'}
                    ・プロフィール画像{'\n'}
                    ・サービス利用履歴{'\n'}
                    ・メッセージやプロジェクト情報{'\n'}
                    ・デバイス情報（OS、端末ID等）{'\n\n'}

                    <Text style={styles.sectionTitle}>2. 情報の利用目的</Text>{'\n\n'}
                    収集した情報は、以下の目的で利用します：{'\n'}
                    ・本サービスの提供・運営のため{'\n'}
                    ・ユーザー間のマッチング機能の提供{'\n'}
                    ・ユーザーからのお問い合わせに回答するため{'\n'}
                    ・本サービスの改善・新サービスの開発のため{'\n'}
                    ・利用規約に違反する行為への対応{'\n'}
                    ・通知・お知らせの送信{'\n\n'}

                    <Text style={styles.sectionTitle}>3. 情報の第三者提供</Text>{'\n\n'}
                    当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません：{'\n'}
                    ・法令に基づく場合{'\n'}
                    ・人の生命、身体または財産の保護のために必要がある場合{'\n'}
                    ・公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合{'\n'}
                    ・国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合{'\n\n'}

                    <Text style={styles.sectionTitle}>4. 情報の管理</Text>{'\n\n'}
                    当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。{'\n\n'}

                    <Text style={styles.sectionTitle}>5. 個人情報の開示・訂正・削除</Text>{'\n\n'}
                    ユーザーは、当社が保有する自己の個人情報について、開示、訂正、削除を求めることができます。アカウント削除により、登録されたすべての個人情報が削除されます。{'\n\n'}

                    <Text style={styles.sectionTitle}>6. Cookie等の利用</Text>{'\n\n'}
                    本サービスでは、サービスの利便性向上のために、Cookie及びこれに類する技術を利用することがあります。{'\n\n'}

                    <Text style={styles.sectionTitle}>7. プライバシーポリシーの変更</Text>{'\n\n'}
                    当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点で効力を生じるものとします。{'\n\n'}

                    <Text style={styles.sectionTitle}>8. お問い合わせ</Text>{'\n\n'}
                    本プライバシーポリシーに関するお問い合わせは、アプリ内の「お問い合わせ」フォームよりお願いいたします。{'\n\n'}

                    制定日：2024年12月10日{'\n'}
                </Text>

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
