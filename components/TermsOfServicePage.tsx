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
                <Text style={styles.lastUpdated}>2025年12月13日 制定</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pogg 利用規約</Text>
                    <Text style={styles.sectionContent}>
                        この利用規約（以下「本規約」といいます。）は、本サービス運営者（以下「運営者」といいます。）が提供するアプリケーション「Pogg」（以下「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第1条（適用）</Text>
                    <Text style={styles.sectionContent}>
                        本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。{'\n\n'}
                        運営者は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下「個別規定」といいます。）をすることがあります。これら個別規定はその名称にいかんに関わらず、本規約の一部を構成するものとします。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
                    <Text style={styles.sectionContent}>
                        本サービスにおいては、登録希望者が本規約に同意の上、運営者の定める方法によって利用登録を申請し、運営者がこれを承認することによって、利用登録が完了するものとします。{'\n\n'}
                        運営者は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。{'\n'}
                        ・利用登録の申請に際して虚偽の事項を届け出た場合{'\n'}
                        ・本規約に違反したことがある者からの申請である場合{'\n'}
                        ・反社会的勢力等（暴力団、暴力団員、右翼団体、反社会的勢力、その他これに準ずる者を意味します。）である、または資金提供その他を通じて反社会的勢力等の維持、運営もしくは経営に協力もしくは関与する等反社会的勢力等との何らかの交流もしくは関与を行っていると運営者が判断した場合{'\n'}
                        ・その他、運営者が利用登録を相当でないと判断した場合
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第3条（ユーザーIDおよびパスワードの管理）</Text>
                    <Text style={styles.sectionContent}>
                        ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワード（ログイン情報）を適切に管理するものとします。{'\n\n'}
                        ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第4条（禁止事項）</Text>
                    <Text style={styles.sectionContent}>
                        ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。{'\n\n'}
                        ・法令または公序良俗に違反する行為{'\n'}
                        ・犯罪行為に関連する行為{'\n'}
                        ・本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為{'\n'}
                        ・運営者、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為{'\n'}
                        ・本サービスによって得られた情報を商業的に利用する行為（運営者が許可したものを除く）{'\n'}
                        ・運営者のサービスの運営を妨害するおそれのある行為{'\n'}
                        ・不正アクセスをし、またはこれを試みる行為{'\n'}
                        ・他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
                        ・不正な目的を持って本サービスを利用する行為{'\n'}
                        ・本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為{'\n'}
                        ・過度に暴力的、残虐、差別的な表現、わいせつな表現、その他他人に不快感を与える表現を投稿または送信する行為{'\n'}
                        ・ネットワークビジネス(MLM)、宗教勧誘、面識のない異性との交際を目的とした行為{'\n'}
                        ・その他、運営者が不適切と判断する行為
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第5条（投稿コンテンツの権利と責任）</Text>
                    <Text style={styles.sectionContent}>
                        ユーザーは、自ら投稿したデータ（プロフィール、メッセージ、プロジェクト案等）について、自らが適法な権利を有していること、および第三者の権利を侵害していないことを表明し、保証するものとします。{'\n\n'}
                        ユーザーが投稿したコンテンツの著作権は、ユーザー自身に留保されます。ただし、運営者は、本サービスのプロモーションや運営に必要な範囲内で、当該コンテンツを無償で利用できるものとします。{'\n\n'}
                        ビジネスアイデア等の知的財産保護について： 本サービスは共創パートナーを探す場ですが、ユーザー間で共有されたアイデアや技術情報の保護（秘密保持契約の締結等）は、ユーザー自身の責任において行うものとし、運営者はユーザー間の知的財産権に関する紛争について一切の責任を負いません。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第6条（不適切なコンテンツへの対応）</Text>
                    <Text style={styles.sectionContent}>
                        Apple社のガイドラインに基づき、本サービスは以下の措置を講じます。{'\n\n'}
                        ・ユーザーは、他のユーザーが投稿した不適切なコンテンツや、規約違反行為を行っているユーザーを発見した場合、アプリ内の通報機能を用いて運営者に報告することができます。{'\n'}
                        ・運営者は、通報を受けたコンテンツやユーザーを確認し、本規約に違反すると判断した場合、当該コンテンツの削除、当該ユーザーのブロック、利用停止、または登録抹消等の措置を講じることができます。{'\n'}
                        ・運営者は、不適切なコンテンツが投稿されないよう、定期的な監視体制を整備します。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第7条（本サービスの提供の停止等）</Text>
                    <Text style={styles.sectionContent}>
                        運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。{'\n\n'}
                        ・本サービスにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
                        ・地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合{'\n'}
                        ・コンピュータまたは通信回線等が事故により停止した場合{'\n'}
                        ・その他、運営者が本サービスの提供が困難と判断した場合
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第8条（保証の否認および免責事項）</Text>
                    <Text style={styles.sectionContent}>
                        運営者は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。{'\n\n'}
                        運営者は、本サービスに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。ただし、本サービスに関する運営者とユーザーとの間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。{'\n\n'}
                        運営者は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等（共同創業におけるトラブル等を含みます）について一切責任を負いません。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第9条（サービス内容の変更等）</Text>
                    <Text style={styles.sectionContent}>
                        運営者は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第10条（利用規約の変更）</Text>
                    <Text style={styles.sectionContent}>
                        運営者は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。{'\n\n'}
                        ・本規約の変更がユーザーの一般の利益に適合するとき。{'\n'}
                        ・本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。{'\n\n'}
                        運営者はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知します。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第11条（個人情報の取扱い）</Text>
                    <Text style={styles.sectionContent}>
                        運営者は、本サービスの利用によって取得する個人情報については、別途定める「プライバシーポリシー」に従い適切に取り扱うものとします。
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>第12条（準拠法・裁判管轄）</Text>
                    <Text style={styles.sectionContent}>
                        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
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
