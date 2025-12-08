import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { AnimatedHeartButton } from './AnimatedLikeButton';
import { RADIUS, COLORS, SHADOWS, SPACING, AVATAR } from '../constants/DesignSystem';
import { TAG_COLORS, translateTag, getStatusTagStyle as getTagStyle } from '../constants/TagConstants';

interface ProfileCardProps {
    profile: Profile;
    isLiked: boolean;
    onLike: () => void;
    onSelect?: () => void;
    hideHeartButton?: boolean;
    isNewMatch?: boolean;
}

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export function ProfileCard({ profile, isLiked, onLike, onSelect, hideHeartButton, isNewMatch }: ProfileCardProps) {
    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onSelect}
            activeOpacity={0.9}
        >
            {/* Like Button - Top Right */}
            {!hideHeartButton && (
                <View style={styles.likeButtonContainer}>
                    <AnimatedHeartButton
                        isLiked={isLiked}
                        onPress={onLike}
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

            {/* Header: Avatar + Name */}
            <View style={styles.header}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                </View>
            </View>

            {/* University & Grade - Below Header */}
            <View style={styles.universityContainer}>
                <Ionicons name="school" size={13} color="#0d9488" />
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

            {/* Skills - Bottom */}
            <View style={styles.skillsContainer}>
                {profile.skills.slice(0, 2).map((skill, index) => {
                    const translatedSkill = translateTag(skill);
                    const tagColor = TAG_COLORS[translatedSkill] || { bg: '#F5F5F5', text: '#666666' };
                    return (
                        <View key={index} style={[styles.skillTag, { backgroundColor: tagColor.bg }]}>
                            <Text style={[styles.skillText, { color: tagColor.text }]} numberOfLines={1}># {translatedSkill}</Text>
                        </View>
                    );
                })}
                {profile.skills.length > 2 && (
                    <View style={styles.moreSkillsTag}>
                        <Text style={styles.moreSkillsText}>+{profile.skills.length - 2}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        height: 240,
        backgroundColor: COLORS.background.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
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
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.md,
        paddingRight: 32,  // Space for like button
    },
    avatar: {
        width: AVATAR.lg.size,
        height: AVATAR.lg.size,
        borderRadius: AVATAR.lg.radius,
        backgroundColor: COLORS.background.tertiary,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
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
        fontWeight: 'bold',
        color: '#1F2937',
    },
    universityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
        paddingRight: 8,
    },
    universityText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0d9488',
        flex: 1,
    },
    mainContent: {
        flex: 1,
        marginBottom: 8,
    },
    bioText: {
        fontSize: 12,
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
