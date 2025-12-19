/**
 * ロール（役割）の定数定義
 * アプリ全体で統一したスタイルを使用するための共通定数
 */

// ロール定義（アイコン付き）
export const ROLES = [
    { id: 'エンジニア', icon: 'laptop' },
    { id: 'デザイナー', icon: 'color-palette' },
    { id: 'マーケター', icon: 'megaphone' },
    { id: 'アイディアマン', icon: 'bulb' },
] as const;

// 「誰でも」ロール
export const ANYONE_ROLE = { id: '誰でも', icon: 'people' } as const;

// ロールに対応する色とアイコン色の定義
export const ROLE_COLORS: { [key: string]: { bg: string; icon: string; border: string } } = {
    'エンジニア': { bg: '#E3F2FD', icon: '#1976D2', border: '#1976D2' },      // Blue
    'デザイナー': { bg: '#F3E5F5', icon: '#7B1FA2', border: '#7B1FA2' },    // Purple
    'マーケター': { bg: '#FFF3E0', icon: '#E65100', border: '#E65100' },    // Orange
    'アイディアマン': { bg: '#FFF9C4', icon: '#F57F17', border: '#F57F17' }, // Yellow
    '誰でも': { bg: '#E8F5E9', icon: '#388E3C', border: '#388E3C' },        // Green
    'クリエイター': { bg: '#FCE4EC', icon: '#C2185B', border: '#C2185B' },   // Pink
    'その他': { bg: '#F5F5F5', icon: '#616161', border: '#616161' },         // Gray
};

// ロールに対応するIoniconsアイコン名
export const ROLE_ICONS: { [key: string]: string } = {
    'エンジニア': 'laptop',
    'デザイナー': 'color-palette',
    'マーケター': 'megaphone',
    'アイディアマン': 'bulb',
    '誰でも': 'people',
    'クリエイター': 'brush',
    'その他': 'ellipsis-horizontal',
};

// ロールの色を取得するヘルパー関数
export const getRoleColors = (role: string) => {
    return ROLE_COLORS[role] || { bg: '#F3F4F6', icon: '#6B7280', border: '#E5E7EB' };
};

// ロールのアイコンを取得するヘルパー関数
export const getRoleIcon = (role: string) => {
    return ROLE_ICONS[role] || 'help-circle-outline';
};
