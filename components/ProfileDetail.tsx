import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { AnimatedLikeButton } from './AnimatedLikeButton';
import { HapticTouchable } from './HapticButton';
import { TAG_COLORS, translateTag, getStatusTagStyle as getTagStyle } from '../constants/TagConstants';

interface ProfileDetailProps {
    profile: Profile;
    onBack: () => void;
    onLike: () => void;
    onChat: () => void;
    isLiked: boolean;
}

const { width } = Dimensions.get('window');

export function ProfileDetail({ profile, onBack, onLike, onChat, isLiked }: ProfileDetailProps) {
    const seekingFor = profile.seekingFor || [];
    const skills = profile.skills || [];
    const seekingRoles = profile.seekingRoles || [];

    // Get status tag style
    const statusTag = profile.statusTags && profile.statusTags.length > 0 ? profile.statusTags[0] : null;
    const statusStyle = statusTag ? getTagStyle(statusTag) : null;

    const handleMenuPress = () => {
        Alert.alert(
            'メニュー',
            `${profile.name}さんに対する操作`,
            [
                {
                    text: 'ブロックする',
                    style: 'destructive',
                    onPress: () => Alert.alert('確認', '本当にブロックしますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: 'ブロック実行', style: 'destructive', onPress: () => Alert.alert('完了', 'ブロックしました') }
                    ])
                },
                {
                    text: '通報する',
                    style: 'destructive',
                    onPress: () => Alert.alert('通報', '不適切なユーザーとして報告しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '通報する', style: 'destructive', onPress: () => Alert.alert('完了', '通報を受け付けました') }
                    ])
                },
                { text: 'キャンセル', style: 'cancel' }
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Navigation Header */}
            <View style={styles.navHeader}>
                <HapticTouchable onPress={onBack} style={styles.navButton} hapticType="light">
                    <Ionicons name="chevron-back" size={28} color="#374151" />
                </HapticTouchable>
                <View style={styles.headerRightButtons}>
                    <HapticTouchable style={styles.navButton} onPress={onChat} hapticType="medium">
                        <Ionicons name="chatbubble-outline" size={24} color="#374151" />
                    </HapticTouchable>
                    <HapticTouchable style={styles.navButton} onPress={handleMenuPress} hapticType="light">
                        <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
                    </HapticTouchable>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 1. Header Area (User Info) */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: profile.image }}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>{profile.name}</Text>

                        <View style={styles.attributesList}>
                            <View style={styles.attributeRow}>
                                <Ionicons name="school" size={14} color="#009688" />
                                <Text style={styles.attributeText}>{profile.university || profile.company || '所属なし'}</Text>
                                {profile.grade && (
                                    <Text style={styles.gradeText}> / {profile.grade}</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2. Current Status / Goal */}
                {
                    statusTag && statusStyle && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionIcon}>🚩</Text>
                                <Text style={styles.sectionTitle}>現在のステータス・目的</Text>
                            </View>
                            <View style={styles.tagsContainer}>
                                <View style={[styles.statusTag, { backgroundColor: statusStyle.color + '15', borderColor: statusStyle.color }]}>
                                    <Text style={[styles.statusTagText, { color: statusStyle.color }]}>
                                        {statusStyle.icon} {statusTag}
                                    </Text>
                                </View>
                                {seekingFor.map((item, index) => (
                                    <View key={index} style={styles.subStatusTag}>
                                        <Text style={styles.subStatusTagText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )
                }

                {/* 3. Bio */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>📄</Text>
                        <Text style={styles.sectionTitle}>自己紹介</Text>
                    </View>
                    <View style={styles.bioBox}>
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    </View>
                </View>

                {/* 4. Skills */}
                {
                    skills.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionIcon}>⚡️</Text>
                                <Text style={styles.sectionTitle}>持っているスキル</Text>
                            </View>
                            <View style={styles.tagsContainer}>
                                {skills.map((skill, index) => {
                                    const translatedSkill = translateTag(skill);
                                    const tagColor = TAG_COLORS[translatedSkill] || { bg: '#F5F5F5', text: '#666666' };
                                    return (
                                        <View key={index} style={[styles.skillTag, { backgroundColor: tagColor.bg }]}>
                                            <Text style={[styles.skillTagText, { color: tagColor.text }]}># {translatedSkill}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )
                }

                {/* 5. Seeking Roles */}
                {
                    seekingRoles.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionIcon}>🤝</Text>
                                <Text style={styles.sectionTitle}>求める仲間・条件</Text>
                            </View>
                            <View style={styles.tagsContainer}>
                                {seekingRoles.map((role, index) => {
                                    const translatedRole = translateTag(role);
                                    return (
                                        <View key={index} style={styles.roleTag}>
                                            <Ionicons name="search" size={12} color="#C2410C" style={{ marginRight: 4 }} />
                                            <Text style={styles.roleTagText}>{translatedRole}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )
                }

            </ScrollView >

            {/* Footer Action Button */}
            <View style={styles.footer}>
                <AnimatedLikeButton
                    isLiked={isLiked}
                    onPress={onLike}
                    showLabel={true}
                    style={{ width: '100%' }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    navHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
    },
    navButton: {
        padding: 8,
    },
    headerRightButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120, // Space for footer
    },
    profileHeader: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
    },
    profileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    attributesList: {
        gap: 6,
    },
    attributeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    attributeText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    gradeText: {
        fontSize: 14,
        color: '#009688',
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionIcon: {
        fontSize: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
    },
    statusTagText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    subStatusTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
    },
    subStatusTagText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    bioBox: {
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 20,
    },
    bioText: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 24,
    },
    skillTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    skillTagText: {
        fontSize: 13,
        fontWeight: '600',
    },
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEDD5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    roleTagText: {
        fontSize: 13,
        color: '#C2410C',
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 34, // Safe area adjustment
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    likeButton: {
        backgroundColor: '#FF6F00',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 100,
        width: '100%',
        shadowColor: "#FF6F00",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    likedButton: {
        backgroundColor: '#DB2777', // Pink for liked state
        shadowColor: "#DB2777",
    },
    likeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
