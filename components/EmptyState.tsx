import React from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated } from 'react-native';
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
 * モダンなエンプティステートコンポーネント
 * 
 * 特徴:
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

    return (
        <View style={[styles.container, style]}>
            {/* Icon with gradient background */}
            <View style={styles.iconWrapper}>
                <LinearGradient
                    colors={config.gradient}
                    style={styles.iconBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name={displayIcon} size={48} color={config.iconColor} />
                </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Description */}
            {description && (
                <Text style={styles.description}>{description}</Text>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <HapticButton
                    title={actionLabel}
                    onPress={onAction}
                    variant="primary"
                    size="md"
                    hapticType="light"
                    style={styles.actionButton}
                />
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
export function UsersEmptyState() {
    return (
        <EmptyState
            variant="search"
            icon="people-outline"
            title="ユーザーが見つかりません"
            description="条件を変更して再度検索してみてください"
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
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
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
