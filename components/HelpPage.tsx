import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HelpPageProps {
    onBack: () => void;
}

export function HelpPage({ onBack }: HelpPageProps) {
    const openLink = (url: string) => {
        // In a real app, use Linking.openURL(url);
        console.log(`Opening: ${url}`);
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

            <ScrollView style={styles.content}>
                {/* Support Section */}
                <Text style={styles.sectionTitle}>サポート</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={() => console.log('FAQ')}>
                        <Text style={styles.rowLabel}>よくある質問 (FAQ)</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Contact')}>
                        <Text style={styles.rowLabel}>お問い合わせ</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Legal Section */}
                <Text style={styles.sectionTitle}>規約・法律</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Terms')}>
                        <Text style={styles.rowLabel}>利用規約</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Tokushoho')}>
                        <Text style={styles.rowLabel}>特定商取引法に基づく表記</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
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
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        marginLeft: 4,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
    },
    rowLabel: {
        fontSize: 16,
        color: '#1F2937',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 16,
    },
});
