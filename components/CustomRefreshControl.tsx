import React from 'react';
import { RefreshControl as RNRefreshControl, Platform, View, StyleSheet, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomRefreshControlProps {
    refreshing: boolean;
    onRefresh: () => void;
    title?: string;
    progressViewOffset?: number;
}

// Brand colors
const BRAND_COLOR = '#009688';
const BRAND_COLOR_LIGHT = '#4DB6AC';
const BRAND_COLOR_DARK = '#00796B';

/**
 * カスタムRefreshControl
 * - ブランドカラーで統一
 * - iOS: タイトルとティントカラーをカスタマイズ
 * - Android: プログレスカラーをグラデーション風に
 */
export function CustomRefreshControl({
    refreshing,
    onRefresh,
    title = '引っ張って更新',
    progressViewOffset = 0,
}: CustomRefreshControlProps) {
    return (
        <RNRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // iOS styling
            tintColor={BRAND_COLOR}
            title={title}
            titleColor={BRAND_COLOR_DARK}
            // Android styling - multiple colors for gradient effect
            colors={[BRAND_COLOR, BRAND_COLOR_LIGHT, BRAND_COLOR_DARK]}
            progressBackgroundColor="#FFFFFF"
            // progress view offset for headers
            progressViewOffset={progressViewOffset}
        />
    );
}

/**
 * シンプルなRefreshControl（タイトルなし）
 */
export function SimpleRefreshControl({
    refreshing,
    onRefresh,
}: Omit<CustomRefreshControlProps, 'title'>) {
    return (
        <RNRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_COLOR}
            colors={[BRAND_COLOR]}
            progressBackgroundColor="#FFFFFF"
        />
    );
}

/**
 * アクセントカラーのRefreshControl（特別なセクション用）
 */
export function AccentRefreshControl({
    refreshing,
    onRefresh,
}: Omit<CustomRefreshControlProps, 'title'>) {
    const ACCENT_COLOR = '#FF6F00'; // Orange
    const ACCENT_LIGHT = '#FFB74D';

    return (
        <RNRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT_COLOR}
            colors={[ACCENT_COLOR, ACCENT_LIGHT]}
            progressBackgroundColor="#FFFFFF"
        />
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
        color: BRAND_COLOR_DARK,
        fontWeight: '500',
    },
});
