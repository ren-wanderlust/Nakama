import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const insets = useSafeAreaInsets();

    const tabs = [
        { id: 'search', icon: 'search', label: 'さがす' },
        { id: 'likes', icon: 'heart', label: 'いいね' },
        { id: 'challenge', icon: 'pricetags', label: '挑戦カード' },
        { id: 'talk', icon: 'chatbubble', label: 'トーク' },
        { id: 'profile', icon: 'person', label: 'マイページ' },
    ];

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom - 10, 0) }]}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    // Ionicons names logic
                    let iconName: any = tab.icon;
                    if (!isActive) {
                        iconName = `${tab.icon}-outline`;
                    }

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => onTabChange(tab.id)}
                            style={styles.tabButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={iconName}
                                size={24}
                                color={isActive ? '#0d9488' : '#6b7280'} // teal-600 : gray-500
                            />
                            <Text style={[
                                styles.tabLabel,
                                isActive ? styles.tabLabelActive : styles.tabLabelInactive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 15,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    tabLabel: {
        fontSize: 10,
        marginBottom: 2,
    },
    tabLabelActive: {
        color: '#0d9488', // teal-600
        fontWeight: '500',
    },
    tabLabelInactive: {
        color: '#6b7280', // gray-500
    },
});
