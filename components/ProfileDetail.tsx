import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types';

interface ProfileDetailProps {
    profile: Profile;
    onBack: () => void;
    onLike: () => void;
    isLiked: boolean;
}

export function ProfileDetail({ profile, onBack, onLike, isLiked }: ProfileDetailProps) {
    // Fallback for optional fields
    const seekingFor = profile.seekingFor || [];
    const skills = profile.skills || [];
    const seekingRoles = profile.seekingRoles || [];

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
                </View>

                {/* Status/Purpose Section */}
                {seekingFor.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flag-outline" size={20} color="#0d9488" />
                            <Text style={styles.sectionTitle}>🚩 現在のステータス・目的</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {seekingFor.map((item, index) => (
                                <View key={index} style={styles.statusTag}>
                                    <Text style={styles.statusTagText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Bio Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={20} color="#374151" />
                        <Text style={styles.sectionTitle}>自己紹介</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.detailText}>{profile.bio}</Text>
                    </View>
                </View>

                {/* Skills Section */}
                {skills.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flash" size={20} color="#0d9488" />
                            <Text style={styles.sectionTitle}>⚡️ 持っているスキル</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {skills.map((skill, index) => (
                                <View key={index} style={styles.skillTag}>
                                    <Text style={styles.skillTagText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Seeking Roles Section */}
                {seekingRoles.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people" size={20} color="#f97316" />
                            <Text style={styles.sectionTitle}>🤝 求める仲間・条件</Text>
                        </View>
                        <View style={styles.tagsContainer}>
                            {seekingRoles.map((role, index) => (
                                <View key={index} style={styles.roleTag}>
                                    <Text style={styles.roleTagText}>{role}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
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
        paddingBottom: 100,
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
        borderColor: '#14b8a6',
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
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusTag: {
        backgroundColor: '#f0fdfa',
        borderWidth: 1,
        borderColor: '#5eead4',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusTagText: {
        color: '#0f766e',
        fontSize: 13,
        fontWeight: '600',
    },
    detailBox: {
        backgroundColor: '#f9fafb',
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
    skillTag: {
        backgroundColor: '#ccfbf1',
        borderWidth: 1,
        borderColor: '#5eead4',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    skillTagText: {
        color: '#0f766e',
        fontSize: 13,
        fontWeight: '600',
    },
    roleTag: {
        backgroundColor: '#ffedd5',
        borderWidth: 1,
        borderColor: '#fdba74',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    roleTagText: {
        color: '#c2410c',
        fontSize: 13,
        fontWeight: '600',
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
        paddingBottom: 32,
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
