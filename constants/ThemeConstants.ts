export type ThemeOption = {
    id: string;
    title: string;
    color: string;   // 主色（タグ背景など）
    bgColor: string; // 淡い背景（選択チップなど）
    emoji: string;   // テーマを表す絵文字
};

// CreateProjectModal のテーマ選択と同じ定義（単一のソースに集約）
export const THEMES: ThemeOption[] = [
    { id: 'theme-1', title: '起業・事業立ち上げ', color: '#8B5CF6', bgColor: '#F5F3FF', emoji: '🚀' }, // Purple
    { id: 'theme-2', title: 'プロダクト開発', color: '#3B82F6', bgColor: '#EFF6FF', emoji: '💻' }, // Blue
    { id: 'theme-3', title: 'クリエイティブ', color: '#EC4899', bgColor: '#FDF2F8', emoji: '🎨' }, // Pink
    { id: 'theme-4', title: 'コンテスト・ハッカソン', color: '#EF4444', bgColor: '#FEF2F2', emoji: '🏆' }, // Red
    { id: 'theme-5', title: 'コミュニティ形成', color: '#F97316', bgColor: '#FFF7ED', emoji: '🤝' }, // Orange
];

export const DEFAULT_THEME_EMOJI = '📋'; // デフォルトの絵文字
export const DEFAULT_THEME_COLOR = '#3B82F6';
export const DEFAULT_THEME_BG_COLOR = '#EFF6FF';

export function getThemeOptionByTitle(title?: string | null): ThemeOption | undefined {
    if (!title) return undefined;
    return THEMES.find(t => t.title === title);
}

// テーマタグ表示（背景色）用：従来の固定ブルーを「テーマ選択時の主色」に合わせる
export function getThemeTagColor(title?: string | null): string {
    return getThemeOptionByTitle(title)?.color ?? DEFAULT_THEME_COLOR;
}

// テーマタグ表示（背景色が主色の場合）用：基本は白
export function getThemeTagTextColor(_title?: string | null): string {
    return 'white';
}

// テーマ名から絵文字を取得する
export function getThemeEmoji(title?: string | null): string {
    return getThemeOptionByTitle(title)?.emoji ?? DEFAULT_THEME_EMOJI;
}


