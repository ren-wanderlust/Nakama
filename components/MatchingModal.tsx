import React from 'react';
import { StyleSheet, Text, View, Modal, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';

interface MatchingModalProps {
    visible: boolean;
    profile: Profile | null;
    onClose: () => void;
    onChat: () => void;
}

const { width } = Dimensions.get('window');

export function MatchingModal({ visible, profile, onClose, onChat }: MatchingModalProps) {
    if (!profile) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <LinearGradient
                    colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
                    style={styles.backdrop}
                />

                <View style={styles.content}>
                    <Text style={styles.title}>It's a Match!</Text>
                    <Text style={styles.subtitle}>
                        {profile.name}さんとマッチングしました！
                    </Text>

                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: profile.image }} style={styles.avatar} />
                        <View style={styles.iconBadge}>
                            <Ionicons name="heart" size={24} color="#f43f5e" />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.chatButton} onPress={onChat}>
                        <LinearGradient
                            colors={['#0d9488', '#14b8a6']}
                            style={styles.gradientButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="chatbubble-ellipses" size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.chatButtonText}>メッセージを送る</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>あとで</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        width: width * 0.85,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        elevation: 5,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0d9488', // teal-600
        marginBottom: 8,
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 40,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#ccfbf1', // teal-100
    },
    iconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'white',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    chatButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 16,
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 12,
    },
    closeButtonText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
});
