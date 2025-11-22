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
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

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

            {/* Main Content: Theme */}
            <View style={styles.mainContent}>
                <Text style={styles.themeText} numberOfLines={3}>
                    {profile.theme || profile.challengeTheme}
                </Text>
            </View>

            {/* Skills */}
            {/* Skills */}
            <View style={styles.skillsContainer}>
                {profile.skills.slice(0, 3).map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText} numberOfLines={1}># {skill}</Text>
                    </View>
                ))}
                {profile.skills.length > 3 && (
                    <View style={styles.skillTag}>
                        <Text style={styles.skillText}>+{profile.skills.length - 3}</Text>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        // Chat logic would go here
                    }}
                    style={styles.iconButton}
                >
                    <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        onLike();
                    }}
                    style={styles.iconButton}
                >
                    <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={22}
                        color={isLiked ? "#E91E63" : "#9CA3AF"}
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        height: 280, // Fixed height
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        // Soft shadow
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
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
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        lineHeight: 20,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    skillTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        maxWidth: '100%', // Prevent overflow
    },
    skillText: {
        fontSize: 10,
        color: '#4B5563',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 'auto', // Push to bottom if flex container
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F9FAFB',
    },
    iconButton: {
        padding: 4,
    },
});
