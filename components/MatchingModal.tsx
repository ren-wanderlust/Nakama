import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';

interface MatchingModalProps {
    visible: boolean;
    profile: Profile | null;
    onClose: () => void;
    onChat: () => void;
}

const { width, height } = Dimensions.get('window');

// Confetti particle component
const ConfettiParticle = ({ delay, startX }: { delay: number; startX: number }) => {
    const translateY = useRef(new Animated.Value(-50)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: height + 50,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: (Math.random() - 0.5) * 100,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: 360,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 8;

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    left: startX,
                    width: size,
                    height: size,
                    backgroundColor: color,
                    opacity,
                    transform: [
                        { translateY },
                        { translateX },
                        {
                            rotate: rotate.interpolate({
                                inputRange: [0, 360],
                                outputRange: ['0deg', '360deg'],
                            })
                        },
                    ],
                },
            ]}
        />
    );
};

export function MatchingModal({ visible, profile, onClose, onChat }: MatchingModalProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const titleScaleAnim = useRef(new Animated.Value(1)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const heartBeatAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let loopAnimation: Animated.CompositeAnimation | null = null;
        let heartBeatAnimation: Animated.CompositeAnimation | null = null;
        let shimmerAnimation: Animated.CompositeAnimation | null = null;

        if (visible) {
            // Reset values
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            titleScaleAnim.setValue(1);
            badgeScaleAnim.setValue(0);
            shimmerAnim.setValue(0);
            heartBeatAnim.setValue(1);

            // Start main animations
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start();

            // Pulse animation for title
            loopAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(titleScaleAnim, {
                        toValue: 1.05,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(titleScaleAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            loopAnimation.start();

            // Heart beat animation
            heartBeatAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(heartBeatAnim, {
                        toValue: 1.2,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(heartBeatAnim, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(400),
                ])
            );
            heartBeatAnimation.start();

            // Shimmer animation for button
            shimmerAnimation = Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            shimmerAnimation.start();

            // Pop in badge
            Animated.sequence([
                Animated.delay(400),
                Animated.spring(badgeScaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 100,
                    useNativeDriver: true,
                })
            ]).start();
        }

        // Cleanup
        return () => {
            loopAnimation?.stop();
            heartBeatAnimation?.stop();
            shimmerAnimation?.stop();
        };
    }, [visible]);

    if (!profile) return null;

    // Generate confetti particles
    const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 500,
        startX: Math.random() * width,
    }));

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Gradient Background */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.9)', 'rgba(13,148,136,0.3)', 'rgba(0,0,0,0.9)']}
                    style={styles.backdrop}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Confetti */}
                {visible && confettiParticles.map(p => (
                    <ConfettiParticle key={p.id} delay={p.delay} startX={p.startX} />
                ))}

                <Animated.View style={[
                    styles.content,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    {/* Decorative circles */}
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />

                    {/* Title */}
                    <Animated.Text style={[
                        styles.title,
                        { transform: [{ scale: titleScaleAnim }] }
                    ]}>
                        🎉 It's a Match! 🎉
                    </Animated.Text>

                    <Text style={styles.subtitle}>
                        {profile.name}さんとマッチングしました！
                    </Text>

                    {/* Avatar with glow effect */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarGlow} />
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: profile.image }}
                                style={styles.avatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={300}
                            />
                            <Animated.View style={[
                                styles.iconBadge,
                                { transform: [{ scale: Animated.multiply(badgeScaleAnim, heartBeatAnim) }] }
                            ]}>
                                <Ionicons name="heart" size={28} color="#fff" />
                            </Animated.View>
                        </View>
                    </View>

                    {/* Chat Button with gradient */}
                    <TouchableOpacity style={styles.chatButton} onPress={onChat} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#0d9488', '#14b8a6', '#2dd4bf']}
                            style={styles.gradientButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="chatbubble-ellipses" size={24} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.chatButtonText}>メッセージを送る</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
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
    confetti: {
        position: 'absolute',
        borderRadius: 2,
    },
    content: {
        width: width * 0.88,
        backgroundColor: 'white',
        borderRadius: 28,
        padding: 32,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    decorativeCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(13, 148, 136, 0.08)',
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(244, 63, 94, 0.08)',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0d9488',
        marginBottom: 8,
        textShadowColor: 'rgba(13, 148, 136, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 17,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 28,
        fontWeight: '500',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 32,
    },
    avatarGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 90,
        backgroundColor: 'rgba(13, 148, 136, 0.2)',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 5,
        borderColor: '#0d9488',
    },
    iconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#f43f5e',
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#f43f5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        borderWidth: 4,
        borderColor: 'white',
    },
    chatButton: {
        width: '100%',
        height: 58,
        borderRadius: 29,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
        letterSpacing: 0.5,
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    closeButtonText: {
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '600',
    },
});
