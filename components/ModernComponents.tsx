/**
 * ModernComponents.tsx
 * 
 * プロフェッショナルな見た目のモダンUIコンポーネント集
 * - スケールアニメーション付きボタン
 * - 大きな角丸のカード
 * - フォーカスアニメーション付き入力欄
 */

import React, { useRef } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    TextInput,
    StyleSheet,
    Animated,
    ViewStyle,
    TextStyle,
    TextInputProps,
    ActivityIndicator,
    StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SHADOWS, COLORS } from '../constants/DesignSystem';

// ========================================
// Modern Button - スケールアニメーション付き
// ========================================
interface ModernButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    icon?: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function ModernButton({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    icon,
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
}: ModernButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            friction: 8,
            tension: 300,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
            tension: 300,
        }).start();
    };

    const sizeStyles = {
        small: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13 },
        medium: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15 },
        large: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
    };

    const iconSize = size === 'small' ? 16 : size === 'medium' ? 18 : 20;

    const renderContent = () => (
        <View style={styles.buttonContent}>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? '#FFFFFF' : '#009688'}
                    size="small"
                />
            ) : (
                <>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={iconSize}
                            color={variant === 'primary' ? '#FFFFFF' : '#009688'}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <Text style={[
                        styles.buttonText,
                        { fontSize: sizeStyles[size].fontSize },
                        variant === 'primary' && styles.buttonTextPrimary,
                        variant === 'secondary' && styles.buttonTextSecondary,
                        variant === 'outline' && styles.buttonTextOutline,
                        variant === 'ghost' && styles.buttonTextGhost,
                    ]}>
                        {title}
                    </Text>
                </>
            )}
        </View>
    );

    return (
        <Animated.View style={[
            { transform: [{ scale: scaleAnim }] },
            fullWidth && { width: '100%' },
            style,
        ]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={1}
            >
                {variant === 'primary' ? (
                    <LinearGradient
                        colors={disabled ? ['#9CA3AF', '#9CA3AF'] : ['#009688', '#00796B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.buttonBase,
                            {
                                paddingVertical: sizeStyles[size].paddingVertical,
                                paddingHorizontal: sizeStyles[size].paddingHorizontal,
                            },
                            SHADOWS.card,
                        ]}
                    >
                        {renderContent()}
                    </LinearGradient>
                ) : (
                    <View style={[
                        styles.buttonBase,
                        {
                            paddingVertical: sizeStyles[size].paddingVertical,
                            paddingHorizontal: sizeStyles[size].paddingHorizontal,
                        },
                        variant === 'secondary' && styles.buttonSecondary,
                        variant === 'outline' && styles.buttonOutline,
                        variant === 'ghost' && styles.buttonGhost,
                        disabled && styles.buttonDisabled,
                    ]}>
                        {renderContent()}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ========================================
// Modern Card - 洗練されたカード
// ========================================
interface ModernCardProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    padding?: 'none' | 'small' | 'medium' | 'large';
}

export function ModernCard({
    children,
    onPress,
    style,
    padding = 'medium',
}: ModernCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (onPress) {
            Animated.spring(scaleAnim, {
                toValue: 0.98,
                useNativeDriver: true,
                friction: 8,
                tension: 300,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
                tension: 300,
            }).start();
        }
    };

    const paddingMap = {
        none: 0,
        small: 12,
        medium: 20,
        large: 28,
    };

    const cardContent = (
        <View style={[
            styles.card,
            { padding: paddingMap[padding] },
            style,
        ]}>
            {children}
        </View>
    );

    if (onPress) {
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                >
                    {cardContent}
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return cardContent;
}

// ========================================
// Modern Input - フォーカスアニメーション付き
// ========================================
interface ModernInputProps extends TextInputProps {
    label?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export function ModernInput({
    label,
    icon,
    error,
    containerStyle,
    ...props
}: ModernInputProps) {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <View style={containerStyle}>
            {label && (
                <Text style={styles.inputLabel}>{label}</Text>
            )}
            <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
                error && styles.inputContainerError,
            ]}>
                {icon && (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={isFocused ? '#009688' : '#9CA3AF'}
                        style={styles.inputIcon}
                    />
                )}
                <TextInput
                    {...props}
                    style={[styles.input, props.style]}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    placeholderTextColor="#9CA3AF"
                />
            </View>
            {error && (
                <Text style={styles.inputError}>{error}</Text>
            )}
        </View>
    );
}

// ========================================
// Modern Tag - ソフトな色のタグ
// ========================================
interface ModernTagProps {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    size?: 'small' | 'medium';
    icon?: keyof typeof Ionicons.glyphMap;
}

export function ModernTag({
    label,
    color = 'primary',
    size = 'medium',
    icon,
}: ModernTagProps) {
    const colorMap = {
        primary: { bg: '#E0F2F1', text: '#009688', border: '#B2DFDB' },
        secondary: { bg: '#E3F2FD', text: '#1976D2', border: '#BBDEFB' },
        success: { bg: '#E8F5E9', text: '#388E3C', border: '#C8E6C9' },
        warning: { bg: '#FFF3E0', text: '#F57C00', border: '#FFE0B2' },
        error: { bg: '#FFEBEE', text: '#D32F2F', border: '#FFCDD2' },
    };

    const sizeMap = {
        small: { paddingH: 8, paddingV: 4, fontSize: 11, iconSize: 12 },
        medium: { paddingH: 12, paddingV: 6, fontSize: 13, iconSize: 14 },
    };

    const colors = colorMap[color];
    const sizes = sizeMap[size];

    return (
        <View style={[
            styles.tag,
            {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                paddingHorizontal: sizes.paddingH,
                paddingVertical: sizes.paddingV,
            },
        ]}>
            {icon && (
                <Ionicons
                    name={icon}
                    size={sizes.iconSize}
                    color={colors.text}
                    style={{ marginRight: 4 }}
                />
            )}
            <Text style={[
                styles.tagText,
                { color: colors.text, fontSize: sizes.fontSize },
            ]}>
                {label}
            </Text>
        </View>
    );
}

// ========================================
// Styles
// ========================================
const styles = StyleSheet.create({
    // Button Styles
    buttonBase: {
        borderRadius: 100, // Pill shape
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSecondary: {
        backgroundColor: '#E0F2F1',
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#009688',
    },
    buttonGhost: {
        backgroundColor: 'transparent',
    },
    buttonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    buttonText: {
        fontFamily: FONTS.semiBold,
        letterSpacing: 0.3,
    },
    buttonTextPrimary: {
        color: '#FFFFFF',
    },
    buttonTextSecondary: {
        color: '#009688',
    },
    buttonTextOutline: {
        color: '#009688',
    },
    buttonTextGhost: {
        color: '#009688',
    },

    // Card Styles
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
    },

    // Input Styles
    inputLabel: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        minHeight: 52,
    },
    inputContainerFocused: {
        borderColor: '#009688',
        backgroundColor: '#FFFFFF',
    },
    inputContainerError: {
        borderColor: '#EF4444',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: '#111827',
        paddingVertical: 14,
    },
    inputError: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: '#EF4444',
        marginTop: 6,
    },

    // Tag Styles
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 100,
        borderWidth: 1,
    },
    tagText: {
        fontFamily: FONTS.semiBold,
    },
});
