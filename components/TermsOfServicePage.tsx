import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TermsOfServicePageProps {
    onBack: () => void;
}

export function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>利用規約</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.lastUpdated}>最終更新日: 2024年12月1日</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第1条（適用）</Text>
                    <Text style={styles.sectionContent}>
                        本規約は、Nakama（以下「当サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます。）は、本規約に同意の上、当サービスをご利用ください。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
                    <Text style={styles.sectionContent}>
                        1. 当サービスにおいては、登録希望者が本規約に同意の上、所定の方法によって利用登録を申請し、当社がこれを承認することによって利用登録が完了するものとします。{'\n\n'}
                        2. 当社は、以下の場合には利用登録の申請を承認しないことがあります。{'\n'}
                        ・登録内容に虚偽があった場合{'\n'}
                        ・過去に本規約違反により利用停止処分を受けている場合{'\n'}
                        ・その他当社が利用登録を相当でないと判断した場合
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第3条（禁止事項）</Text>
                    <Text style={styles.sectionContent}>
                        ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。{'\n\n'}
                        ・法令または公序良俗に違反する行為{'\n'}
                        ・犯罪行為に関連する行為{'\n'}
                        ・当サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為{'\n'}
                        ・ネットワークビジネス(MLM)、宗教勧誘、強引な営業行為{'\n'}
                        ・当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為{'\n'}
                        ・当サービスの運営を妨害する行為{'\n'}
                        ・他のユーザーに対する嫌がらせや誹謗中傷{'\n'}
                        ・不正アクセスをし、またはこれを試みる行為{'\n'}
                        ・他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
                        ・当サービスを商業目的で利用する行為（当社が許可した場合を除く）{'\n'}
                        ・その他、当社が不適切と判断する行為
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第4条（当サービスの提供の停止等）</Text>
                    <Text style={styles.sectionContent}>
                        当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく当サービスの全部または一部の提供を停止または中断することができるものとします。{'\n\n'}
                        ・当サービスにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
                        ・地震、落雷、火災、停電または天災などの不可抗力により、当サービスの提供が困難となった場合{'\n'}
                        ・コンピュータまたは通信回線等が事故により停止した場合{'\n'}
                        ・その他、当社が当サービスの提供が困難と判断した場合
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第5条（退会）</Text>
                    <Text style={styles.sectionContent}>
                        ユーザーは、所定の退会手続により、当サービスから退会できるものとします。退会後のデータの復旧はできませんのでご注意ください。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第6条（保証の否認および免責事項）</Text>
                    <Text style={styles.sectionContent}>
                        1. 当社は、当サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。{'\n\n'}
                        2. 当社は、当サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、当サービスに関する当社とユーザーとの間の契約が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第7条（規約の変更）</Text>
                    <Text style={styles.sectionContent}>
                        当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、当サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第8条（個人情報の取扱い）</Text>
                    <Text style={styles.sectionContent}>
                        当社は、当サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第9条（準拠法・裁判管轄）</Text>
                    <Text style={styles.sectionContent}>
                        本規約の解釈にあたっては、日本法を準拠法とします。当サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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
    lastUpdated: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'right',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    sectionContent: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },
});
