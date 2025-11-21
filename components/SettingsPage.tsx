import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsPageProps {
    onBack: () => void;
    onLogout?: () => void;
}

export function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            "ログアウト",
            "本当にログアウトしますか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "ログアウト",
                    style: "destructive",
                    onPress: onLogout
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>各種設定</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Notification Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>通知</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>プッシュ通知</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#0d9488" }}
                            thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>アカウント</Text>
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Account Settings')}>
                        <Text style={styles.rowLabel}>アカウント設定</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Block List')}>
                        <Text style={styles.rowLabel}>ブロックリスト</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Legal Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>法的事項</Text>
                    <TouchableOpacity style={styles.row} onPress={() => console.log('Privacy Policy')}>
                        <Text style={styles.rowLabel}>プライバシーポリシー</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                        <Text style={styles.logoutText}>ログアウト</Text>
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
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 0, // Adjust if outside section
    },
    // Actually, let's put title outside or inside. Inside looks like iOS grouped.
    // Let's move title outside for better grouped look.
    // Wait, I put it inside in the JSX above. Let's adjust styles to match structure.
    // The structure above has title INSIDE the section view but it usually looks better outside.
    // I will stick to the code I wrote but adjust padding.

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
    logoutRow: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
});
