import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
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
        return { color: '#039BE5', icon: '☕️' };
    }
    // アイデア・学習系
    if (tagText.includes('アイデア模索中') || tagText.includes('起業に興味あり') || tagText.includes('情報収集中')) {
        return { color: '#43A047', icon: '🌱' };
    }
    // その他
    return { color: '#546E7A', icon: '🚩' };
}

export function ProfileCard({ profile, isLiked, onLike, onSelect }: ProfileCardProps) {
    // 最初のステータスタグを取得
    const statusTag = profile.statusTags && profile.statusTags.length > 0 ? profile.statusTags[0] : null;
    const tagStyle = statusTag ? getTagStyle(statusTag) : null;

    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onSelect}
            activeOpacity={0.9}
        >
            {/* Image Container - Portrait 4:5 aspect ratio */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Top Left Badge: Status Tag - Floating White Chip */}
                {statusTag && tagStyle && (
                    <View style={styles.statusBadge}>
                        <Text style={[styles.statusBadgeText, { color: tagStyle.color }]}>
                            {tagStyle.icon} {statusTag}
                        </Text>
                    </View>
                )}

                {/* Bottom Right Badge: Photo Count (Mock) */}
                {/* <View style={styles.photoCountBadge}>
                    <Ionicons name="camera" size={12} color="white" />
                    <Text style={styles.photoCountText}>3</Text>
                </View> */}
            </View>

            {/* Text Content */}
            <View style={styles.content}>
                {/* Name */}
                <Text style={styles.nameText} numberOfLines={1}>
                    {profile.name}
                </Text>

                {/* Age + University */}
                <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.infoText}>
                        {profile.age}歳 · {profile.university || profile.company || '所属なし'}
                    </Text>
                </View>

                {/* Bio */}
                <Text style={styles.bioText} numberOfLines={2}>
                    {profile.bio}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        // Soft shadow
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'visible', // Allow shadow to be visible
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.8, // 4:5 aspect ratio
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f3f4f6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    statusBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255,255,255, 0.95)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        // Strong shadow for floating effect
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
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
        padding: 16,
        paddingTop: 12,
    },
    nameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937', // Gray-800
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 2,
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280', // Gray-500
        fontWeight: '500',
    },
    bioText: {
        fontSize: 13,
        color: '#4B5563', // Gray-600
        lineHeight: 19, // Wider line height
    },
});
