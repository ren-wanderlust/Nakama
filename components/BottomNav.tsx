import { StyleSheet, Text, View, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile } from '../types';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    currentUser: Profile | null;
    badges?: { [key: string]: number };
    onCreateProject?: () => void;
}

export function BottomNav({ activeTab, onTabChange, currentUser, badges, onCreateProject }: BottomNavProps) {
    const insets = useSafeAreaInsets();

    const tabs = [
        { id: 'search', icon: 'search', label: 'さがす' },
        { id: 'likes', icon: 'heart', label: 'いいね' },
        { id: 'create', icon: 'add', label: '作成', isCreate: true },
        { id: 'talk', icon: 'chatbubble', label: 'トーク' },
        { id: 'profile', icon: 'person', label: 'マイページ' },
    ];

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom - 10, 0) + 10 }]}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const badgeCount = badges?.[tab.id] || 0;

                    const renderBadge = () => {
                        if (badgeCount > 0) {
                            return (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </Text>
                                </View>
                            );
                        }
                        return null;
                    };

                    // Create button (center)
                    if (tab.isCreate) {
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={onCreateProject}
                                style={styles.tabButton}
                                activeOpacity={0.7}
                            >
                                <View style={styles.createButton}>
                                    <Ionicons name="add" size={28} color="white" />
                                </View>
                            </TouchableOpacity>
                        );
                    }

                    // Profile tab with custom image
                    if (tab.id === 'profile' && currentUser?.image) {
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => onTabChange(tab.id)}
                                style={styles.tabButton}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Image
                                        source={{ uri: currentUser.image }}
                                        style={[
                                            styles.profileIcon,
                                            isActive && styles.profileIconActive
                                        ]}
                                    />
                                    {renderBadge()}
                                </View>
                            </TouchableOpacity>
                        );
                    }

                    // Regular tabs
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
                            <View>
                                <Ionicons
                                    name={iconName}
                                    size={28}
                                    color={isActive ? '#0d9488' : '#6b7280'}
                                />
                                {renderBadge()}
                            </View>
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
    createButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    tabLabel: {
        fontSize: 10,
        marginBottom: 2,
    },
    tabLabelActive: {
        color: '#0d9488',
        fontWeight: '500',
    },
    tabLabelInactive: {
        color: '#6b7280',
    },
    profileIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    profileIconActive: {
        borderColor: '#0d9488',
        borderWidth: 2,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
        zIndex: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 2,
    },
});
