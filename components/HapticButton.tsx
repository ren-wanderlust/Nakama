import React, { useRef } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, Text, ViewStyle, TextStyle, View, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../constants/DesignSystem';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface HapticTouchableProps extends TouchableOpacityProps {
    hapticType?: HapticType;
    children: React.ReactNode;
    scaleOnPress?: boolean; // スケールアニメーションを有効にするか
}

interface HapticButtonProps extends Omit<HapticTouchableProps, 'children'> {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
}

// Haptic feedback function
const triggerHaptic = async (type: HapticType) => {
    switch (type) {
        case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
        case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
        case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        case 'selection':
            await Haptics.selectionAsync();
            break;
        case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
        case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
    }
};

/**
 * ハプティクス付きTouchableOpacity
 * スケールアニメーション付きの基本的なタップ可能コンポーネント
 */
export function HapticTouchable({
    hapticType = 'light',
    onPress,
    onPressIn,
    onPressOut,
    children,
    scaleOnPress = true,
    style,
    ...props
}: HapticTouchableProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const AnimatedTouchableOpacity = useRef(Animated.createAnimatedComponent(TouchableOpacity)).current;

    const handlePressIn = (event: any) => {
        if (scaleOnPress) {
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
            }).start();
        }
        onPressIn?.(event);
    };

    const handlePressOut = (event: any) => {
        if (scaleOnPress) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 50,
                bounciness: 8,
            }).start();
        }
        onPressOut?.(event);
    };

    const handlePress = async (event: any) => {
        await triggerHaptic(hapticType);
        onPress?.(event);
    };

    return (
        <AnimatedTouchableOpacity
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            style={[style as any, { transform: [{ scale: scaleAnim }] }]}
            {...props}
        >
            {children}
        </AnimatedTouchableOpacity>
    );
}

/**
 * ハプティクス付きボタン
 * スタイル付きボタンコンポーネント
 */
export function HapticButton({
    title,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    fullWidth = false,
    hapticType = 'light',
    style,
    disabled,
    ...props
}: HapticButtonProps) {
    const buttonStyles = [
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        fullWidth && styles.buttonFullWidth,
        disabled && styles.buttonDisabled,
        style,
    ];

    const textStyles = [
        styles.buttonText,
        styles[`buttonText_${variant}`],
        styles[`buttonText_${size}`],
        disabled && styles.buttonTextDisabled,
    ];

    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
    const iconColor = variant === 'primary' ? '#FFFFFF' :
        variant === 'danger' ? '#FFFFFF' :
            variant === 'outline' ? COLORS.brand.primary :
                variant === 'ghost' ? COLORS.text.secondary :
                    COLORS.text.primary;

    return (
        <HapticTouchable
            hapticType={disabled ? 'light' : hapticType}
            disabled={disabled || loading}
            style={buttonStyles as ViewStyle[]}
            {...props}
        >
            {icon && iconPosition === 'left' && (
                <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
            )}
            <Text style={textStyles as TextStyle[]}>{title}</Text>
            {icon && iconPosition === 'right' && (
                <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconRight} />
            )}
        </HapticTouchable>
    );
}

/**
 * アイコンのみのハプティクス付きボタン
 */
export function HapticIconButton({
    icon,
    size = 24,
    color = COLORS.text.secondary,
    hapticType = 'light',
    style,
    ...props
}: Omit<HapticTouchableProps, 'children'> & {
    icon: keyof typeof Ionicons.glyphMap;
    size?: number;
    color?: string;
}) {
    return (
        <HapticTouchable
            hapticType={hapticType}
            style={[styles.iconButton, style] as ViewStyle[]}
            {...props}
        >
            <Ionicons name={icon} size={size} color={color} />
        </HapticTouchable>
    );
}

/**
 * ボトムナビボタン用ハプティクス付きボタン
 */
export function HapticTabButton({
    children,
    hapticType = 'selection',
    ...props
}: HapticTouchableProps) {
    return (
        <HapticTouchable hapticType={hapticType} {...props}>
            {children}
        </HapticTouchable>
    );
}

const styles = StyleSheet.create({
    // Base button
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
    },
    buttonFullWidth: {
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.5,
    },

    // Variants
    button_primary: {
        backgroundColor: COLORS.brand.primary,
        ...SHADOWS.sm,
    },
    button_secondary: {
        backgroundColor: COLORS.background.tertiary,
    },
    button_outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.brand.primary,
    },
    button_ghost: {
        backgroundColor: 'transparent',
    },
    button_danger: {
        backgroundColor: COLORS.semantic.error,
        ...SHADOWS.sm,
    },

    // Sizes
    button_sm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    button_md: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    button_lg: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },

    // Text
    buttonText: {
        fontWeight: '600',
    },
    buttonText_primary: {
        color: '#FFFFFF',
    },
    buttonText_secondary: {
        color: COLORS.text.primary,
    },
    buttonText_outline: {
        color: COLORS.brand.primary,
    },
    buttonText_ghost: {
        color: COLORS.text.secondary,
    },
    buttonText_danger: {
        color: '#FFFFFF',
    },
    buttonTextDisabled: {
        color: COLORS.text.tertiary,
    },

    // Text sizes
    buttonText_sm: {
        fontSize: 13,
    },
    buttonText_md: {
        fontSize: 15,
    },
    buttonText_lg: {
        fontSize: 17,
    },

    // Icons
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
});

export { triggerHaptic };
