import React, { useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Animated, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AnimatedLikeButtonProps {
    isLiked: boolean;
    onPress: () => void;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    style?: ViewStyle;
}

// Small button for cards (icon only)
export function AnimatedHeartButton({
    isLiked,
    onPress,
    size = 'medium',
}: {
    isLiked: boolean;
    onPress: () => void;
    size?: 'small' | 'medium' | 'large';
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const iconSize = size === 'small' ? 20 : size === 'medium' ? 24 : 28;
    const buttonSize = size === 'small' ? 36 : size === 'medium' ? 44 : 52;

    const triggerHaptic = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, []);

    const handlePress = useCallback(() => {
        // Trigger haptic feedback
        triggerHaptic();

        // Scale + wobble animation
        Animated.sequence([
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 0.6,
                    useNativeDriver: true,
                    friction: 3,
                }),
                Animated.timing(rotateAnim, {
                    toValue: -0.2,
                    duration: 50,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.3,
                    useNativeDriver: true,
                    friction: 3,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 0.2,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 4,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        onPress();
    }, [onPress, triggerHaptic, scaleAnim, rotateAnim]);

    const animatedStyle = {
        transform: [
            { scale: scaleAnim },
            {
                rotate: rotateAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-30deg', '30deg'],
                }),
            },
        ],
    };

    return (
        <TouchableOpacity
            style={[styles.heartButton, { width: buttonSize, height: buttonSize }]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Animated.View style={animatedStyle}>
                <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={iconSize}
                    color={isLiked ? '#FF3B5C' : '#9CA3AF'}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

// Large button with label (for ProfileDetail footer)
export function AnimatedLikeButton({
    isLiked,
    onPress,
    showLabel = true,
    style,
}: AnimatedLikeButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const heartScaleAnim = useRef(new Animated.Value(1)).current;

    const triggerHaptic = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, []);

    const handlePress = useCallback(() => {
        // Haptic feedback
        triggerHaptic();

        // Button scale
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                friction: 5,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 4,
            }),
        ]).start();

        // Heart burst animation
        Animated.sequence([
            Animated.spring(heartScaleAnim, {
                toValue: 0.5,
                useNativeDriver: true,
                friction: 3,
            }),
            Animated.spring(heartScaleAnim, {
                toValue: 1.4,
                useNativeDriver: true,
                friction: 3,
            }),
            Animated.spring(heartScaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 4,
            }),
        ]).start();

        onPress();
    }, [onPress, triggerHaptic, scaleAnim, heartScaleAnim]);

    const scaleStyle = {
        transform: [{ scale: scaleAnim }],
    };

    const heartStyle = {
        transform: [{ scale: heartScaleAnim }],
    };

    // Use static background color based on isLiked state
    const backgroundColor = isLiked ? '#DB2777' : '#FF6F00';

    return (
        <Animated.View style={[styles.likeButtonContainer, scaleStyle, { backgroundColor }, style]}>
            <TouchableOpacity
                style={styles.likeButtonTouchable}
                onPress={handlePress}
                activeOpacity={1}
            >
                <Animated.View style={[styles.heartIconWrapper, heartStyle]}>
                    <Ionicons name="heart" size={24} color="white" />
                </Animated.View>
                {showLabel && (
                    <Text style={styles.likeButtonText}>
                        {isLiked ? 'いいね済み' : 'いいね！'}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    heartButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    likeButtonContainer: {
        borderRadius: 100,
        overflow: 'hidden',
        shadowColor: '#FF6F00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    likeButtonTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    heartIconWrapper: {
        marginRight: 8,
    },
    likeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
