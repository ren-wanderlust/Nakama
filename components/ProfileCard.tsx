import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { AnimatedHeartButton } from './AnimatedLikeButton';
import { RADIUS, COLORS, SHADOWS, SPACING, AVATAR } from '../constants/DesignSystem';

interface ProfileCardProps {
    profile: Profile;
    isLiked: boolean;
    onLike: () => void;
    onSelect?: () => void;
}

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
    // エンジニア系 (Blue)
    'フロントエンド': { bg: '#E3F2FD', text: '#1565C0' },
    'バックエンド': { bg: '#E3F2FD', text: '#1565C0' },
    'モバイルアプリ': { bg: '#E3F2FD', text: '#1565C0' },
    'ゲーム開発': { bg: '#E3F2FD', text: '#1565C0' },
    'AI / データ': { bg: '#E3F2FD', text: '#1565C0' },
    'ノーコード': { bg: '#E3F2FD', text: '#1565C0' },
    'エンジニア': { bg: '#E3F2FD', text: '#1565C0' },
    // デザイナー系 (Purple)
    'UI / UXデザイン': { bg: '#F3E5F5', text: '#7B1FA2' },
    'グラフィック / イラスト': { bg: '#F3E5F5', text: '#7B1FA2' },
    'デザイナー': { bg: '#F3E5F5', text: '#7B1FA2' },
    // マーケ系 (Orange)
    'マーケティング': { bg: '#FFF3E0', text: '#E65100' },
    'SNS運用': { bg: '#FFF3E0', text: '#E65100' },
    'ライター': { bg: '#FFF3E0', text: '#E65100' },
    'マーケター': { bg: '#FFF3E0', text: '#E65100' },
    // ビジネス系 (Green)
    'セールス (営業)': { bg: '#E8F5E9', text: '#2E7D32' },
    '事業開発 (BizDev)': { bg: '#E8F5E9', text: '#2E7D32' },
    // クリエイター系 (Red)
    '動画編集': { bg: '#FFEBEE', text: '#C62828' },
    '3D / CG': { bg: '#FFEBEE', text: '#C62828' },
    'クリエイター': { bg: '#FFEBEE', text: '#C62828' },
    // PM系 (Indigo)
    'PM / ディレクター': { bg: '#E8EAF6', text: '#283593' },
    'コミュニティ運営': { bg: '#E8EAF6', text: '#283593' },
    // アイディアマン (Yellow/Gold)
    'アイディアマン': { bg: '#FFF8E1', text: '#F57F17' },
    // その他 (Gray/Teal)
    '財務 / 会計': { bg: '#E0F2F1', text: '#00695C' },
    '法務 / 知財': { bg: '#E0F2F1', text: '#00695C' },
    '英語 / 語学': { bg: '#F5F5F5', text: '#424242' },
};

// English to Japanese tag translation map
const TAG_TRANSLATIONS: Record<string, string> = {
    'engineer': 'エンジニア',
    'designer': 'デザイナー',
    'marketer': 'マーケター',
    'creator': 'クリエイター',
    'ideaman': 'アイディアマン',
    'other': 'その他',
};

// Translate tag if it's in English
const translateTag = (tag: string): string => {
    return TAG_TRANSLATIONS[tag.toLowerCase()] || tag;
};

// タグの種類に応じて色とアイコンを返す関数
function getTagStyle(tagText: string): { color: string; icon: string } {
    if (tagText.includes('ビジネスメンバー探し') || tagText.includes('メンバー募集中')) {
        return { color: '#FF5722', icon: '🔥' };
    }
    if (tagText.includes('まずは話してみたい') || tagText.includes('壁打ち相手募集')) {
        return { color: '#039BE5', icon: '☕️' };
    }
    if (tagText.includes('アイデア模索中') || tagText.includes('起業に興味あり') || tagText.includes('情報収集中')) {
        return { color: '#43A047', icon: '🌱' };
    }
    return { color: '#546E7A', icon: '🚩' };
}

export function ProfileCard({ profile, isLiked, onLike, onSelect }: ProfileCardProps) {
    const statusTag = profile.statusTags && profile.statusTags.length > 0 ? profile.statusTags[0] : null;
    const tagStyle = statusTag ? getTagStyle(statusTag) : null;

    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onSelect}
            activeOpacity={0.9}
        >
            {/* Like Button - Top Right */}
            <View style={styles.likeButtonContainer}>
                <AnimatedHeartButton
                    isLiked={isLiked}
                    onPress={onLike}
                    size="small"
                />
            </View>

            {/* Header: Avatar & Basic Info */}
            <View style={styles.header}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    {statusTag && tagStyle && (
                        <View style={[styles.statusBadge, { backgroundColor: tagStyle.color }]}>
                            <Text style={styles.statusBadgeText} numberOfLines={1}>
                                {tagStyle.icon} {statusTag}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                    <Text style={styles.attributes} numberOfLines={1}>
                        {profile.age}歳 · {profile.university || profile.company || '所属なし'}
                    </Text>
                </View>
            </View>

            {/* Main Content: Theme & Bio */}
            <View style={styles.mainContent}>
                <Text style={styles.themeText} numberOfLines={2}>
                    {profile.theme || profile.challengeTheme}
                </Text>
                {profile.bio && (
                    <Text style={styles.bioText} numberOfLines={2}>
                        {profile.bio}
                    </Text>
                )}
            </View>

            {/* Skills */}
            <View style={styles.skillsContainer}>
                {profile.skills.slice(0, 3).map((skill, index) => {
                    const translatedSkill = translateTag(skill);
                    const tagColor = TAG_COLORS[translatedSkill] || { bg: '#F5F5F5', text: '#666666' };
                    return (
                        <View key={index} style={[styles.skillTag, { backgroundColor: tagColor.bg }]}>
                            <Text style={[styles.skillText, { color: tagColor.text }]} numberOfLines={1}># {translatedSkill}</Text>
                        </View>
                    );
                })}
                {profile.skills.length > 3 && (
                    <View style={styles.skillTag}>
                        <Text style={styles.skillText}>+{profile.skills.length - 3}</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        gap: SPACING.md,
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
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 1,
    },
    attributes: {
        fontSize: 11,
        color: '#6B7280',
    },
    mainContent: {
        flex: 1, // Take available space
        marginBottom: 8,
    },
    themeLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    themeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111827',
        lineHeight: 18,
        marginBottom: 6,
    },
    bioText: {
        fontSize: 11,
        color: '#6B7280',
        lineHeight: 16,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 0, // Removed bottom margin as it's the last element
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

});
