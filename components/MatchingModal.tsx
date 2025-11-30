import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, Image, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
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
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const titleScaleAnim = useRef(new Animated.Value(1)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset values
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            titleScaleAnim.setValue(1);
            badgeScaleAnim.setValue(0);

            // Start animations
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // Pulse animation for title
            Animated.loop(
                Animated.sequence([
                    Animated.timing(titleScaleAnim, {
                        toValue: 1.1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(titleScaleAnim, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Pop in badge
            Animated.sequence([
                Animated.delay(600),
                Animated.spring(badgeScaleAnim, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    if (!profile) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <LinearGradient
                    colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.75)']}
                    style={styles.backdrop}
                />

                <Animated.View style={[
                    styles.content,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <Animated.Text style={[
                        styles.title,
                        { transform: [{ scale: titleScaleAnim }] }
                    ]}>
                        It's a Match!
                    </Animated.Text>
                    <Text style={styles.subtitle}>
                        {profile.name}さんとマッチングしました！
                    </Text>

                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: profile.image }} style={styles.avatar} />
                        <Animated.View style={[
                            styles.iconBadge,
                            { transform: [{ scale: badgeScaleAnim }] }
                        ]}>
                            <Ionicons name="heart" size={24} color="#f43f5e" />
                        </Animated.View>
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
                </Animated.View>
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
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#0d9488', // teal-600
        marginBottom: 8,
        fontStyle: 'italic',
        textShadowColor: 'rgba(13, 148, 136, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
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
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        borderColor: '#ccfbf1', // teal-100
    },
    iconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'white',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: '#ffe4e6', // rose-100
    },
    chatButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 2,
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
