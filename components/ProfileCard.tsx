import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';

interface ProfileCardProps {
    profile: Profile;
    isLiked: boolean;
    onLike: () => void;
    onSelect?: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 32) / 2; // 2 columns with padding

export function ProfileCard({ profile, isLiked, onLike, onSelect }: ProfileCardProps) {
    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={() => {
                console.log('ProfileCard pressed');
                if (onSelect) onSelect();
            }}
            activeOpacity={0.7}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.image}
                    resizeMode="cover"
                />
                {profile.isStudent && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>学生</Text>
                    </View>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                {/* Basic Info */}
                <View style={styles.basicInfo}>
                    <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                    <Text style={styles.details} numberOfLines={1}>
                        {profile.age} · {profile.location}
                    </Text>
                </View>

                {/* Challenge Theme */}
                <View style={styles.themeContainer}>
                    <LinearGradient
                        colors={['#fff7ed', '#fefce8']} // orange-50 to yellow-50
                        style={styles.themeGradient}
                    >
                        <Text style={styles.fireIcon}>🔥</Text>
                        <Text style={styles.themeText} numberOfLines={2}>
                            {profile.challengeTheme}
                        </Text>
                    </LinearGradient>
                </View>

                {/* Skills */}
                <View style={styles.skillsContainer}>
                    <View style={styles.skillsHeader}>
                        <Text style={styles.muscleIcon}>💪</Text>
                        <Text style={styles.skillsLabel}>スキル</Text>
                    </View>
                    <View style={styles.skillsList}>
                        {profile.skills.slice(0, 2).map((skill, index) => (
                            <View key={index} style={styles.skillTag}>
                                <Text style={styles.skillText}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[
                            styles.likeButton,
                            isLiked ? styles.likeButtonActive : styles.likeButtonInactive
                        ]}
                        onPress={(e) => {
                            // e.stopPropagation() is not directly available in RN TouchableOpacity onPress like web
                            // But since the parent is also a TouchableOpacity, we need to handle this carefully if needed.
                            // However, in RN, nested touchables usually handle the touch event of the child first.
                            onLike();
                        }}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={14}
                            color={isLiked ? "white" : "#374151"}
                        />
                        <Text style={[
                            styles.actionText,
                            isLiked ? styles.actionTextActive : styles.actionTextInactive
                        ]}>
                            いいね
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.messageButton} onPress={onSelect}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    imageContainer: {
        height: CARD_WIDTH * 1.33, // Aspect ratio 3:4
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#f97316', // orange-500
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        padding: 8,
    },
    basicInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginBottom: 6,
    },
    name: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    details: {
        fontSize: 10,
        color: '#6b7280',
        flex: 1,
    },
    themeContainer: {
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#fed7aa', // orange-200
        borderRadius: 4,
        overflow: 'hidden',
    },
    themeGradient: {
        flexDirection: 'row',
        padding: 4,
        alignItems: 'flex-start',
        gap: 4,
    },
    fireIcon: {
        fontSize: 12,
    },
    themeText: {
        fontSize: 10,
        color: '#9a3412', // orange-800
        flex: 1,
        lineHeight: 14,
    },
    skillsContainer: {
        marginBottom: 8,
    },
    skillsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginBottom: 4,
    },
    muscleIcon: {
        fontSize: 12,
    },
    skillsLabel: {
        fontSize: 9,
        color: '#4b5563',
    },
    skillsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    skillTag: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    skillText: {
        fontSize: 9,
        color: '#374151',
    },
    actions: {
        flexDirection: 'row',
        gap: 4,
    },
    likeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        gap: 2,
    },
    likeButtonActive: {
        backgroundColor: '#ec4899', // pink-500
    },
    likeButtonInactive: {
        backgroundColor: '#f3f4f6', // gray-100
    },
    actionText: {
        fontSize: 10,
        fontWeight: '500',
    },
    actionTextActive: {
        color: 'white',
    },
    actionTextInactive: {
        color: '#374151',
    },
    messageButton: {
        padding: 6,
        backgroundColor: '#0d9488', // teal-600 (approx gradient start)
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
    },
});
