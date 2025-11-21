import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';

interface ProfileCardProps {
    profile: Profile;
    isLiked: boolean;
    onLike: () => void;
    onSelect?: () => void;
}

const { width } = Dimensions.get('window');
// Calculate card width based on 2 columns with 16px padding on sides and 12px gap
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

// タグの種類に応じて色とアイコンを返す関数
function getTagStyle(tagText: string): { color: string; icon: string } {
    // ガチ募集系
    if (tagText.includes('ビジネスメンバー探し') || tagText.includes('メンバー募集中')) {
        return { color: '#FF5722', icon: '🔥' };
    }
    // カジュアル系
    if (tagText.includes('まずは話してみたい') || tagText.includes('壁打ち相手募集')) {
        return { color: '#29B6F6', icon: '☕️' };
    }
    // アイデア・学習系
    if (tagText.includes('アイデア模索中') || tagText.includes('起業に興味あり') || tagText.includes('情報収集中')) {
        return { color: '#66BB6A', icon: '🌱' };
    }
    // その他
    return { color: '#78909C', icon: '🚩' };
}

export function ProfileCard({ profile, isLiked, onLike, onSelect }: ProfileCardProps) {
    // 最初のステータスタグを取得
    const statusTag = profile.statusTags && profile.statusTags.length > 0 ? profile.statusTags[0] : null;
    const tagStyle = statusTag ? getTagStyle(statusTag) : null;

    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onSelect}
            activeOpacity={0.8}
        >
            {/* Image Container - Square-ish with rounded corners */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Top Left Badge: Status Tag */}
                {statusTag && tagStyle && (
                    <View style={[styles.statusBadge, { backgroundColor: tagStyle.color }]}>
                        <Text style={styles.statusBadgeText}>
                            {tagStyle.icon} {statusTag}
                        </Text>
                    </View>
                )}

                {/* Bottom Right Badge: Photo Count (Mock) */}
                <View style={styles.photoCountBadge}>
                    <Ionicons name="camera" size={12} color="white" />
                    <Text style={styles.photoCountText}>3</Text>
                </View>
            </View>

            {/* Text Content - Left Aligned */}
            <View style={styles.content}>
                {/* Line 1: Age + Location */}
                <View style={styles.infoRow}>
                    <Text style={styles.primaryText}>
                        {profile.age}歳 {profile.location}
                    </Text>
                </View>

                {/* Line 2: University or Company */}
                {(profile.university || profile.company) && (
                    <Text style={styles.secondaryText} numberOfLines={1}>
                        {profile.university ? `🏫 ${profile.university}` : `🏢 ${profile.company}`}
                    </Text>
                )}

                {/* Line 3: Bio */}
                <Text style={styles.commentText} numberOfLines={3}>
                    {profile.bio}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        backgroundColor: 'transparent',
        marginBottom: 16,
        // No shadow for a clean, flat look
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1, // Square aspect ratio
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 8,
        backgroundColor: '#f3f4f6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    statusBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    photoCountBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    photoCountText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 6,
    },
    primaryText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    secondaryText: {
        fontSize: 11,
        color: '#6b7280', // Gray-500
        marginBottom: 4,
    },
    commentText: {
        fontSize: 12,
        color: '#333',
        lineHeight: 16,
        marginTop: 2,
    },
});
