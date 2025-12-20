import React, { useRef, useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { AnimatedHeartButton } from './AnimatedLikeButton';
import { RADIUS, COLORS, SHADOWS, SPACING, AVATAR, FONTS } from '../constants/DesignSystem';
import { TAG_COLORS, translateTag, getStatusTagStyle as getTagStyle } from '../constants/TagConstants';

// Role ID to Japanese label mapping
const ROLE_ID_TO_LABEL: { [key: string]: string } = {
    'engineer': 'エンジニア',
    'designer': 'デザイナー',
    'marketer': 'マーケター',
    'ideaman': 'アイディアマン',
    'creator': 'クリエイター',
};

// Role to icon mapping (matching UserProjectPage)
const ROLE_ICONS: { [key: string]: string } = {
    'エンジニア': 'laptop',
    'デザイナー': 'color-palette',
    'マーケター': 'megaphone',
    'アイディアマン': 'bulb',
    'クリエイター': 'videocam',
    '誰でも': 'people',
};

// Role to color mapping
const ROLE_COLORS: { [key: string]: { bg: string; icon: string } } = {
    'エンジニア': { bg: '#E3F2FD', icon: '#1976D2' },      // Blue
    'デザイナー': { bg: '#F3E5F5', icon: '#7B1FA2' },    // Purple
    'マーケター': { bg: '#FFF3E0', icon: '#E65100' },    // Orange
    'アイディアマン': { bg: '#FFF9C4', icon: '#F57F17' }, // Yellow
    'クリエイター': { bg: '#FCE4EC', icon: '#C2185B' },  // Pink
    '誰でも': { bg: '#E8F5E9', icon: '#388E3C' },        // Green
};

interface ProfileCardProps {
    profile: Profile;
    isLiked: boolean;
    onLike: () => void;
    onSelect?: () => void;
    hideHeartButton?: boolean;
    isNewMatch?: boolean;
    animateOnLike?: boolean;
    index?: number; // リスト内のインデックス（登場アニメーション用）
}

const { width } = Dimensions.get('window');
const GAP = 6;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export function ProfileCard({ profile, isLiked, onLike, onSelect, hideHeartButton, isNewMatch, animateOnLike, index = 0 }: ProfileCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const [tempLiked, setTempLiked] = useState(false); // Temporary liked state for animation

    // 登場アニメーション用
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // インデックスに応じた遅延で登場アニメーション
        const delay = Math.min(index * 50, 300); // 最大300msの遅延

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const handleLikeWithAnimation = useCallback(() => {
        if (animateOnLike && !isLiked && !tempLiked) {
            // Step 1: Show red heart immediately
            setTempLiked(true);

            // Step 2: Wait to show the red heart, then fade out
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 0.85,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // Step 3: After animation, actually trigger the like
                    onLike();
                });
            }, 400); // Show red heart for 400ms
        } else {
            onLike();
        }
    }, [animateOnLike, isLiked, tempLiked, onLike, scaleAnim, opacityAnim]);

    // Use tempLiked or actual isLiked for display
    const displayLiked = isLiked || tempLiked;

    // Get roles with icons and colors, limit to 4
    // Map role IDs (engineer, designer, etc.) to Japanese labels
    const rolesWithIcons = profile.skills
        ?.slice(0, 4)
        .map(roleId => {
            const roleLabel = ROLE_ID_TO_LABEL[roleId] || roleId; // Use label if mapping exists, otherwise use as-is
            return {
                role: roleLabel,
                icon: ROLE_ICONS[roleLabel] || 'help-circle-outline',
                colors: ROLE_COLORS[roleLabel] || { bg: '#F3F4F6', icon: '#6B7280' }
            };
        })
        .filter(item => item.icon !== 'help-circle-outline') || []; // Filter out unmapped roles

    const iconCount = rolesWithIcons.length;

    // Determine layout based on icon count (same as ProjectCard)
    const getIconLayout = () => {
        if (iconCount === 0) {
            return null;
        } else if (iconCount === 1) {
            // Single icon in center (larger size)
            return (
                <View style={styles.iconsContainer}>
                    <View style={styles.iconSlotCenter}>
                        <View style={[styles.iconCircleLarge, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={20}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                </View>
            );
        } else if (iconCount === 2) {
            // Two icons side by side, centered vertically
            return (
                <View style={styles.iconsContainer}>
                    <View style={styles.iconSlotTwo}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={16}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotTwo}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[1].icon as any}
                                size={16}
                                color={rolesWithIcons[1].colors.icon}
                            />
                        </View>
                    </View>
                </View>
            );
        } else if (iconCount === 3) {
            // Top two, bottom one centered
            return (
                <View style={styles.iconsContainer}>
                    <View style={styles.iconSlotTop}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={16}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotTop}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[1].icon as any}
                                size={16}
                                color={rolesWithIcons[1].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotBottomCenter}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[2].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[2].icon as any}
                                size={16}
                                color={rolesWithIcons[2].colors.icon}
                            />
                        </View>
                    </View>
                </View>
            );
        } else {
            // Four icons in 2x2 grid
            return (
                <View style={styles.iconsContainer}>
                    {rolesWithIcons.map((item, i) => (
                        <View key={`icon-${i}`} style={styles.iconSlotGrid}>
                            <View style={[styles.iconCircle, { backgroundColor: item.colors.bg }]}>
                                <Ionicons
                                    name={item.icon as any}
                                    size={16}
                                    color={item.colors.icon}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            );
        }
    };

    return (
        <Animated.View style={{
            transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
            ],
            opacity: Animated.multiply(opacityAnim, fadeAnim)
        }}>
            <TouchableOpacity
                style={styles.cardContainer}
                onPress={onSelect}
                activeOpacity={0.9}
            >
                {/* Like Button - Top Right */}
                {!hideHeartButton && (
                    <View style={styles.likeButtonContainer}>
                        <AnimatedHeartButton
                            isLiked={displayLiked}
                            onPress={handleLikeWithAnimation}
                            size="small"
                        />
                    </View>
                )}

                {/* New Match Badge - Top Right */}
                {isNewMatch && (
                    <View style={styles.newMatchBadge}>
                        <View style={styles.newMatchDot} />
                    </View>
                )}

                {/* Header: Avatar + Role Icons */}
                <View style={styles.header}>
                    <Image
                        source={{ uri: profile.image }}
                        style={styles.avatar}
                    />
                    {getIconLayout()}
                </View>

                {/* User Name - Below Avatar */}
                <View style={styles.nameContainer}>
                    <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                </View>

                {/* University & Grade */}
                <View style={styles.universityContainer}>
                    <Ionicons name="school" size={11} color="#0d9488" />
                    <Text style={styles.universityText} numberOfLines={1}>
                        {profile.university || profile.company || '所属なし'}
                        {profile.grade ? ` / ${profile.grade}` : ''}
                    </Text>
                </View>

                {/* Bio/Theme - Main Content */}
                <View style={styles.mainContent}>
                    <Text style={styles.bioText} numberOfLines={3}>
                        {profile.bio || profile.theme || profile.challengeTheme || ''}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        height: 200, // Further reduced for 3 lines of bio without extra padding
        backgroundColor: COLORS.background.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xs,
        position: 'relative',
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: COLORS.background.tertiary,
    },
    likeButtonContainer: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        zIndex: 10,
    },
    newMatchBadge: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        zIndex: 10,
    },
    newMatchDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981', // Green color
        borderWidth: 2,
        borderColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
        paddingRight: 32,  // Space for like button
    },
    avatar: {
        width: 56, // Increased from AVATAR.lg.size (48)
        height: 56, // Increased from AVATAR.lg.size (48)
        borderRadius: 28, // Half of 56
        overflow: 'hidden',
        backgroundColor: COLORS.background.tertiary,
    },
    iconsContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    iconSlotCenter: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotTwo: {
        width: '50%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotTop: {
        width: '50%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotBottomCenter: {
        width: '100%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotGrid: {
        width: '50%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleLarge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameContainer: {
        marginBottom: SPACING.xs,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        marginBottom: SPACING.xs,
    },
    statusBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: '#1F2937',
    },
    universityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: SPACING.sm,
        paddingRight: 8,
    },
    universityText: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: '#0d9488',
        flex: 1,
    },
    mainContent: {
        flex: 1,
    },
    bioText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#4B5563',
        lineHeight: 18,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    skillTag: {
        backgroundColor: COLORS.background.tertiary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        maxWidth: '100%',
    },
    skillText: {
        fontSize: 10,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    moreSkillsTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    moreSkillsText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '600',
    },
});
