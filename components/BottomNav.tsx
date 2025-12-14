import { StyleSheet, Text, View, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Profile } from '../types';
import { HapticTouchable } from './HapticButton';
import { SHADOWS } from '../constants/DesignSystem';

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
                            <HapticTouchable
                                key={tab.id}
                                onPress={onCreateProject}
                                style={styles.tabButton}
                                hapticType="medium"
                            >
                                <View style={styles.createButton}>
                                    <Svg width={45} height={45} viewBox="0 0 50 50" style={[styles.eggSvg, { transform: [{ scaleY: -1 }] }]}>
                                    <Path
                                        d="
                                            M25 5.5
                                            C14.2 5.5, 9.2 12.2, 10.2 22.0
                                            C11.4 32.0, 16.5 40.5, 20.5 43.5
                                            C22.5 44.8, 27.5 44.8, 29.5 43.5
                                            C33.5 40.5, 38.6 32.0, 39.8 22.0
                                            C40.8 12.2, 35.8 5.5, 25 5.5
                                            Z
                                        "
                                        fill="white"
                                        stroke="#F39800"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    </Svg>

                                    <View style={styles.plusIconContainer}>
                                        <Ionicons name="add" size={24} color="#F39800" />
                                    </View>
                                </View>
                            </HapticTouchable>
                        );
                    }

                    // Profile tab with custom image
                    if (tab.id === 'profile' && currentUser?.image) {
                        return (
                            <HapticTouchable
                                key={tab.id}
                                onPress={() => onTabChange(tab.id)}
                                style={styles.tabButton}
                                hapticType="selection"
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
                            </HapticTouchable>
                        );
                    }

                    // Regular tabs
                    let iconName: any = tab.icon;
                    if (!isActive) {
                        iconName = `${tab.icon}-outline`;
                    }

                    return (
                        <HapticTouchable
                            key={tab.id}
                            onPress={() => onTabChange(tab.id)}
                            style={styles.tabButton}
                            hapticType="selection"
                        >
                            <View>
                                <Ionicons
                                    name={iconName}
                                    size={isActive ? 32 : 28}
                                    color={isActive ? '#F39800' : '#F39800'}
                                />
                                {renderBadge()}
                            </View>
                        </HapticTouchable>
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
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    eggSvg: {
        position: 'absolute',
        top: -3,
    },
    plusIconContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        top: 9,
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
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    profileIconActive: {
        borderColor: '#F39800',
        borderWidth: 2,
        backgroundColor: '#F39800',
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
