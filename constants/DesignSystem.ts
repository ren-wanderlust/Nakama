/**
 * デザインシステム - 統一されたスタイル定数
 * 
 * アプリ全体で一貫したデザインを保つための定数定義
 */

// ========================================
// フォントファミリー (Inter)
// ========================================
export const FONTS = {
    // Inter フォントファミリー
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
};

// フォントスタイルのプリセット
export const FONT_STYLES = {
    // 見出し（大）
    h1: {
        fontFamily: 'Inter_700Bold',
        fontSize: 28,
        lineHeight: 36,
    },
    // 見出し（中）
    h2: {
        fontFamily: 'Inter_700Bold',
        fontSize: 22,
        lineHeight: 30,
    },
    // 見出し（小）
    h3: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        lineHeight: 26,
    },
    // サブタイトル
    subtitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        lineHeight: 24,
    },
    // 本文
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 22,
    },
    // 本文（強調）
    bodyMedium: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        lineHeight: 22,
    },
    // キャプション
    caption: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        lineHeight: 18,
    },
    // ボタン
    button: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        lineHeight: 22,
    },
    // 小さいラベル
    label: {
        fontFamily: 'Inter_500Medium',
        fontSize: 11,
        lineHeight: 16,
    },
};

// ========================================
// カラーパレット
// ========================================
export const COLORS = {
    // ブランドカラー
    brand: {
        primary: '#009688',       // メインカラー（ティール）
        primaryLight: '#4DB6AC',
        primaryDark: '#00796B',
        secondary: '#FF6F00',     // アクセントカラー（オレンジ）
        secondaryLight: '#FFB74D',
    },

    // グレースケール
    gray: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
    },

    // テキスト
    text: {
        primary: '#111827',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF',
    },

    // 背景
    background: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
        tertiary: '#F3F4F6',
    },

    // セマンティック
    semantic: {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    },

    // いいね/ハート
    like: {
        active: '#FF3B5C',
        inactive: '#9CA3AF',
    },
};

// ========================================
// 角丸 (Border Radius)
// ========================================
export const RADIUS = {
    /** 極小 - チップ、バッジ内の角 */
    xs: 4,

    /** 小 - タグ、小さなバッジ */
    sm: 8,

    /** 中 - ボタン、入力フィールド */
    md: 12,

    /** 大 - カード */
    lg: 16,

    /** 特大 - モーダル、大きなカード */
    xl: 20,

    /** 2XL - 画像コンテナ */
    xxl: 24,

    /** 円形 - アバター (半径の半分) */
    full: 9999,
};

// アバターサイズと角丸のマッピング
export const AVATAR = {
    // サイズ
    xs: { size: 24, radius: 12 },   // 極小 - インラインアイコン
    sm: { size: 32, radius: 16 },   // 小 - リスト項目
    md: { size: 40, radius: 20 },   // 中 - チャット
    lg: { size: 48, radius: 24 },   // 大 - カード
    xl: { size: 64, radius: 32 },   // 特大 - プロフィール
    xxl: { size: 100, radius: 50 }, // 2XL - プロフィール編集
    hero: { size: 120, radius: 60 },// ヒーロー - プロフィール詳細
};

// ========================================
// シャドウ
// ========================================
export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    // カード用の特別なシャドウ（拡散強め、色は薄め）
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
};

// ========================================
// ボーダー (Borders)
// ========================================
export const BORDERS = {
    subtle: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    card: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
};

// ========================================
// スペーシング
// ========================================
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

// ========================================
// フォントサイズ
// ========================================
export const FONT_SIZE = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    title: 28,
    hero: 32,
};

// ========================================
// タイポグラフィ
// ========================================
export const TYPOGRAPHY = {
    h1: {
        fontSize: FONT_SIZE.hero,
        fontWeight: 'bold' as const,
        lineHeight: 40,
    },
    h2: {
        fontSize: FONT_SIZE.title,
        fontWeight: 'bold' as const,
        lineHeight: 36,
    },
    h3: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '600' as const,
        lineHeight: 28,
    },
    body: {
        fontSize: FONT_SIZE.md,
        fontWeight: 'normal' as const,
        lineHeight: 20,
    },
    caption: {
        fontSize: FONT_SIZE.sm,
        fontWeight: 'normal' as const,
        lineHeight: 16,
    },
};
