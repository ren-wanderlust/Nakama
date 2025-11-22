import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LegalDocumentPageProps {
    title: string;
    content: string;
    onBack: () => void;
}

export function LegalDocumentPage({ title, content, onBack }: LegalDocumentPageProps) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.content}>{content}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    content: {
        fontSize: 14,
        lineHeight: 24,
        color: '#333',
    },
});
