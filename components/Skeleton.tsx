import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

// Base Skeleton element with shimmer effect
export function Skeleton({ width: w = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    return (
        <View
            style={[
                {
                    width: w as any,
                    height,
                    borderRadius,
                    backgroundColor: '#E5E7EB',
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateX }] },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

// Profile Card Skeleton
export function ProfileCardSkeleton() {
    return (
        <View style={styles.profileCard}>
            {/* Header: Avatar & Info */}
            <View style={styles.profileHeader}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.profileHeaderInfo}>
                    <Skeleton width={60} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width={80} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                    <Skeleton width={100} height={12} borderRadius={4} />
                </View>
            </View>

            {/* Theme & Bio */}
            <View style={styles.profileMainContent}>
                <Skeleton width="100%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <Skeleton width="70%" height={12} borderRadius={4} />
            </View>

            {/* Skills */}
            <View style={styles.profileSkills}>
                <Skeleton width={60} height={24} borderRadius={6} />
                <Skeleton width={70} height={24} borderRadius={6} />
                <Skeleton width={50} height={24} borderRadius={6} />
            </View>
        </View>
    );
}

// Project Card Skeleton
export function ProjectCardSkeleton() {
    return (
        <View style={styles.projectCard}>
            <View style={styles.projectInner}>
                <Skeleton width={56} height={56} borderRadius={28} />
                <View style={styles.projectContent}>
                    <View style={styles.projectHeader}>
                        <Skeleton width="60%" height={18} borderRadius={4} />
                        <Skeleton width={70} height={24} borderRadius={12} />
                    </View>
                    <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                    <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
                    <View style={styles.projectTags}>
                        <Skeleton width={60} height={22} borderRadius={12} />
                        <Skeleton width={50} height={22} borderRadius={12} />
                        <Skeleton width={70} height={22} borderRadius={12} />
                    </View>
                </View>
            </View>
        </View>
    );
}

// Profile List Skeleton (for search page users tab)
export function ProfileListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <View style={styles.profileListContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.profileGridItem}>
                    <ProfileCardSkeleton />
                </View>
            ))}
        </View>
    );
}

// Project List Skeleton (for search page projects tab)
export function ProjectListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <View style={styles.projectListContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <ProjectCardSkeleton key={index} />
            ))}
        </View>
    );
}

// Chat List Item Skeleton
export function ChatItemSkeleton() {
    return (
        <View style={styles.chatItem}>
            <Skeleton width={56} height={56} borderRadius={28} />
            <View style={styles.chatItemContent}>
                <Skeleton width="50%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={14} borderRadius={4} />
            </View>
            <Skeleton width={40} height={12} borderRadius={4} />
        </View>
    );
}

// Chat List Skeleton
export function ChatListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <View style={styles.chatListContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <ChatItemSkeleton key={index} />
            ))}
        </View>
    );
}

// Full Page Skeleton (for initial app load)
export function FullPageSkeleton() {
    return (
        <View style={styles.fullPage}>
            {/* Header */}
            <View style={styles.fullPageHeader}>
                <Skeleton width={120} height={32} borderRadius={8} />
            </View>
            {/* Content */}
            <ProjectListSkeleton count={4} />
        </View>
    );
}

const styles = StyleSheet.create({
    // Profile Card Skeleton
    profileCard: {
        width: CARD_WIDTH,
        height: 240,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    profileHeaderInfo: {
        flex: 1,
    },
    profileMainContent: {
        flex: 1,
        marginBottom: 8,
    },
    profileSkills: {
        flexDirection: 'row',
        gap: 6,
    },
    profileListContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        justifyContent: 'space-between',
    },
    profileGridItem: {
        width: CARD_WIDTH,
    },

    // Project Card Skeleton
    projectCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 12,
    },
    projectInner: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    projectContent: {
        flex: 1,
        marginLeft: 16,
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    projectTags: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
    },
    projectListContainer: {
        padding: 16,
    },

    // Chat Skeleton
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    chatItemContent: {
        flex: 1,
        marginLeft: 12,
    },
    chatListContainer: {
        backgroundColor: 'white',
    },

    // Full Page
    fullPage: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    fullPageHeader: {
        backgroundColor: 'white',
        padding: 20,
        alignItems: 'center',
        paddingTop: 60,
    },
});
