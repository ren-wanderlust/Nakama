import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticButton } from './HapticButton';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../constants/DesignSystem';

type EmptyStateVariant = 'default' | 'search' | 'chat' | 'likes' | 'projects' | 'notifications';

interface EmptyStateProps {
    variant?: EmptyStateVariant;
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

// Variant configurations
const VARIANT_CONFIG: Record<EmptyStateVariant, {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string];
    iconColor: string;
}> = {
    default: {
        icon: 'folder-open-outline',
        gradient: ['#F3F4F6', '#E5E7EB'],
        iconColor: '#9CA3AF',
    },
    search: {
        icon: 'search-outline',
        gradient: ['#E0F2F1', '#B2DFDB'],
        iconColor: '#009688',
    },
    chat: {
        icon: 'chatbubbles-outline',
        gradient: ['#EDE9FE', '#DDD6FE'],
        iconColor: '#8B5CF6',
    },
    likes: {
        icon: 'heart-outline',
        gradient: ['#FCE7F3', '#FBCFE8'],
        iconColor: '#EC4899',
    },
    projects: {
        icon: 'rocket-outline',
        gradient: ['#DBEAFE', '#BFDBFE'],
        iconColor: '#3B82F6',
    },
    notifications: {
        icon: 'notifications-outline',
        gradient: ['#FEF3C7', '#FDE68A'],
        iconColor: '#F59E0B',
    },
};

/**
 * アニメーション付きアイコンコンポーネント
 */
function AnimatedIcon({ icon, color, gradient }: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    gradient: [string, string];
}) {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Floating animation
        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -8,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        floatAnimation.start();

        // Subtle rotate animation
        const rotateAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        rotateAnimation.start();

        return () => {
            floatAnimation.stop();
            rotateAnimation.stop();
        };
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-3deg', '3deg'],
    });

    return (
        <Animated.View style={[
            styles.iconWrapper,
            {
                transform: [
                    { translateY: floatAnim },
                    { scale: scaleAnim },
                    { rotate },
                ],
            }
        ]}>
            <LinearGradient
                colors={gradient}
                style={styles.iconBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name={icon} size={48} color={color} />
            </LinearGradient>
            {/* Subtle shadow/glow */}
            <View style={[styles.iconShadow, { backgroundColor: gradient[0] }]} />
        </Animated.View>
    );
}

/**
 * モダンなエンプティステートコンポーネント
 * 
 * 特徴:
 * - アニメーション付きアイコン
 * - グラデーション背景のアイコン
 * - 明確なタイトルと説明
 * - オプションのアクションボタン
 * - バリエーション別のカラースキーム
 */
export function EmptyState({
    variant = 'default',
    icon,
    title,
    description,
    actionLabel,
    onAction,
    style,
}: EmptyStateProps) {
    const config = VARIANT_CONFIG[variant];
    const displayIcon = icon || config.icon;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={[styles.container, style]}>
            {/* Animated Icon */}
            <AnimatedIcon
                icon={displayIcon}
                color={config.iconColor}
                gradient={config.gradient}
            />

            {/* Title with fade in */}
            <Animated.Text style={[
                styles.title,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }
            ]}>
                {title}
            </Animated.Text>

            {/* Description */}
            {description && (
                <Animated.Text style={[
                    styles.description,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }
                ]}>
                    {description}
                </Animated.Text>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <Animated.View style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }}>
                    <HapticButton
                        title={actionLabel}
                        onPress={onAction}
                        variant="primary"
                        size="md"
                        hapticType="light"
                        style={styles.actionButton}
                    />
                </Animated.View>
            )}
        </View>
    );
}

/**
 * 検索結果なしのエンプティステート
 */
export function SearchEmptyState({ onReset }: { onReset?: () => void }) {
    return (
        <EmptyState
            variant="search"
            title="検索結果が見つかりません"
            description="別のキーワードで検索するか、フィルターを変更してみてください"
            actionLabel={onReset ? "フィルターをリセット" : undefined}
            onAction={onReset}
        />
    );
}

/**
 * チャットなしのエンプティステート
 */
export function ChatEmptyState() {
    return (
        <EmptyState
            variant="chat"
            title="まだトークがありません"
            description="マッチした相手とトークを始めましょう！気になる人に「いいね」を送ってマッチングしよう"
        />
    );
}

/**
 * いいねなしのエンプティステート
 */
export function LikesEmptyState({ type }: { type: 'received' | 'sent' | 'matched' }) {
    const configs = {
        received: {
            title: "まだ「いいね」は届いていません",
            description: "プロフィールを充実させて、あなたの魅力をアピールしましょう！",
        },
        sent: {
            title: "まだ「いいね」を送っていません",
            description: "気になる相手を探して「いいね」を送ってみましょう！",
        },
        matched: {
            title: "まだマッチした人はいません",
            description: "「いいね」を送って、マッチングを待ちましょう！",
        },
    };

    return (
        <EmptyState
            variant="likes"
            title={configs[type].title}
            description={configs[type].description}
        />
    );
}

/**
 * プロジェクトなしのエンプティステート
 */
export function ProjectsEmptyState({ onCreateProject }: { onCreateProject?: () => void }) {
    return (
        <EmptyState
            variant="projects"
            title="プロジェクトはまだありません"
            description="新しいプロジェクトを作成して、仲間を募集しましょう！"
            actionLabel={onCreateProject ? "プロジェクトを作成" : undefined}
            onAction={onCreateProject}
        />
    );
}

/**
 * 通知なしのエンプティステート
 */
export function NotificationsEmptyState() {
    return (
        <EmptyState
            variant="notifications"
            title="通知はありません"
            description="新しいいいねやメッセージが届くとここに表示されます"
        />
    );
}

/**
 * ユーザーが見つからない場合のエンプティステート
 */
export function UsersEmptyState({ onReset }: { onReset?: () => void }) {
    return (
        <EmptyState
            variant="search"
            icon="people-outline"
            title="ユーザーが見つかりません"
            description="まだ登録しているユーザーがいないか、フィルター条件に一致するユーザーがいません"
            actionLabel={onReset ? "フィルターをリセット" : undefined}
            onAction={onReset}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 80,
    },
    iconWrapper: {
        marginBottom: SPACING.xl,
        position: 'relative',
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
    },
    iconShadow: {
        position: 'absolute',
        bottom: -10,
        left: 10,
        right: 10,
        height: 20,
        borderRadius: 50,
        opacity: 0.3,
        transform: [{ scaleX: 0.8 }],
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    description: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.xl,
    },
    actionButton: {
        marginTop: SPACING.md,
        minWidth: 180,
    },
});
