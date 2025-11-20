import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types';

interface ProfileDetailProps {
    profile: Profile & {
        seekingFor?: string[];
        techDetails?: string;
        seekingRoles?: string[];
        requirementDetails?: string;
    };
    onBack: () => void;
    onLike: () => void;
    isLiked: boolean;
}

export function ProfileDetail({ profile, onBack, onLike, isLiked }: ProfileDetailProps) {
    // Mock data for demonstration if not present
    const seekingFor = profile.seekingFor || ['ビジネスパートナーを探す', 'ビジネスメンバーを探す'];
    const techDetails = profile.techDetails || 'React, TypeScript, Node.js, Firebase, Figma, UI/UX設計、データ分析';
    const seekingRoles = profile.seekingRoles || ['エンジニア', 'デザイナー', 'マーケター'];
    const requirementDetails = profile.requirementDetails || '週10時間以上コミット可能な方、スタートアップ経験がある方を優遇します。オンラインでの打ち合わせに対応できる方を希望。';

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{profile.name}</Text>
                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Profile Image & Basic Info */}
                <View style={styles.section}>
                    <View style={styles.basicInfoContainer}>
                        <Image
                            source={{ uri: profile.image }}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                        <View style={styles.basicInfoText}>
                            <Text style={styles.name}>{profile.name}</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>{profile.age}歳</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#9ca3af" />
                                <Text style={styles.infoText}>{profile.location}</Text>
                            </View>

                            {profile.university && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="school-outline" size={16} color="#9ca3af" />
                                    <Text style={styles.infoText}>{profile.university}</Text>
                                </View>
                            )}

                            {profile.company && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="briefcase-outline" size={16} color="#9ca3af" />
                                    <Text style={styles.infoText}>{profile.company}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Seeking Status Badge */}
                    <View style={styles.seekingContainer}>
                        <View style={styles.seekingHeader}>
                            <Ionicons name="search" size={20} color="#0d9488" />
                            <Text style={styles.seekingTitle}>今、何を探していますか？</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {seekingFor.map((item, index) => (
                                <View key={index} style={styles.seekingTag}>
                                    <Text style={styles.seekingTagText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Challenge Theme Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="flame" size={24} color="#f97316" />
                        <Text style={styles.sectionTitle}>現在の挑戦テーマ</Text>
                    </View>
                    <View style={styles.themeBox}>
                        <Text style={styles.themeText}>{profile.challengeTheme}</Text>
                    </View>
                </View>

                {/* Skills Section */}
                <View style={styles.section}>
                    <View style={styles.subSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flash" size={20} color="#0d9488" />
                            <Text style={styles.subSectionTitle}>提供できるスキル（役割）</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {profile.skills.map((skill, index) => (
                                <View key={index} style={styles.skillTag}>
                                    <Text style={styles.skillTagText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.subSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="code-slash" size={20} color="#0d9488" />
                            <Text style={styles.subSectionTitle}>得意な技術/ツール</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.detailText}>{techDetails}</Text>
                        </View>
                    </View>
                </View>

                {/* Seeking Requirements Section */}
                <View style={styles.section}>
                    <View style={styles.subSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people" size={20} color="#f97316" />
                            <Text style={styles.subSectionTitle}>求める仲間（役割）</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {seekingRoles.map((role, index) => (
                                <View key={index} style={styles.roleTag}>
                                    <Text style={styles.roleTagText}>{role}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.subSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text" size={20} color="#f97316" />
                            <Text style={styles.subSectionTitle}>募集要項の詳細</Text>
                        </View>
                        <View style={styles.roleDetailBox}>
                            <Text style={styles.detailText}>{requirementDetails}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Action Footer */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={onLike} activeOpacity={0.9}>
                    <LinearGradient
                        colors={isLiked ? ['#ec4899', '#db2777'] : ['#f97316', '#ea580c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.likeButton}
                    >
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color="white" />
                        <Text style={styles.likeButtonText}>{isLiked ? 'いいね済み' : 'いいね'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        textAlign: 'center',
    },
    menuButton: {
        padding: 8,
        marginRight: -8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Space for footer
    },
    section: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        marginBottom: 12,
    },
    basicInfoContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    profileImage: {
        width: 96,
        height: 96,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#14b8a6', // teal-500
    },
    basicInfoText: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#4b5563',
    },
    seekingContainer: {
        backgroundColor: '#f0fdfa', // teal-50
        borderWidth: 1,
        borderColor: '#99f6e4', // teal-200
        borderRadius: 12,
        padding: 16,
    },
    seekingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    seekingTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    seekingTag: {
        backgroundColor: '#0d9488', // teal-600
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    seekingTagText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    themeBox: {
        backgroundColor: '#fff7ed', // orange-50
        borderWidth: 1,
        borderColor: '#fed7aa', // orange-200
        borderRadius: 12,
        padding: 16,
    },
    themeText: {
        fontSize: 16,
        color: '#1f2937',
        lineHeight: 24,
    },
    subSection: {
        marginBottom: 16,
    },
    subSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    skillTag: {
        backgroundColor: '#ccfbf1', // teal-100
        borderWidth: 1,
        borderColor: '#5eead4', // teal-300
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    skillTagText: {
        color: '#0f766e', // teal-700
        fontSize: 12,
        fontWeight: '500',
    },
    detailBox: {
        backgroundColor: '#f9fafb', // gray-50
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 16,
    },
    detailText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    roleTag: {
        backgroundColor: '#ffedd5', // orange-100
        borderWidth: 1,
        borderColor: '#fdba74', // orange-300
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    roleTagText: {
        color: '#c2410c', // orange-700
        fontSize: 12,
        fontWeight: '500',
    },
    roleDetailBox: {
        backgroundColor: '#fff7ed', // orange-50
        borderWidth: 1,
        borderColor: '#fed7aa', // orange-200
        borderRadius: 8,
        padding: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        padding: 16,
        paddingBottom: 32, // Extra padding for home bar
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        borderRadius: 12,
    },
    likeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
