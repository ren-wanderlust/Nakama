// Tag styling colors for various skill categories
export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
    // エンジニア系 (Blue)
    'フロントエンド': { bg: '#E3F2FD', text: '#1565C0' },
    'バックエンド': { bg: '#E3F2FD', text: '#1565C0' },
    'モバイルアプリ': { bg: '#E3F2FD', text: '#1565C0' },
    'ゲーム開発': { bg: '#E3F2FD', text: '#1565C0' },
    'AI / データ': { bg: '#E3F2FD', text: '#1565C0' },
    'ノーコード': { bg: '#E3F2FD', text: '#1565C0' },
    'エンジニア': { bg: '#E3F2FD', text: '#1565C0' },
    // デザイナー系 (Purple)
    'UI / UXデザイン': { bg: '#F3E5F5', text: '#7B1FA2' },
    'グラフィック / イラスト': { bg: '#F3E5F5', text: '#7B1FA2' },
    'デザイナー': { bg: '#F3E5F5', text: '#7B1FA2' },
    // マーケ系 (Orange)
    'マーケティング': { bg: '#FFF3E0', text: '#E65100' },
    'SNS運用': { bg: '#FFF3E0', text: '#E65100' },
    'ライター': { bg: '#FFF3E0', text: '#E65100' },
    'マーケター': { bg: '#FFF3E0', text: '#E65100' },
    // ビジネス系 (Green)
    'セールス (営業)': { bg: '#E8F5E9', text: '#2E7D32' },
    '事業開発 (BizDev)': { bg: '#E8F5E9', text: '#2E7D32' },
    // クリエイター系 (Red)
    '動画編集': { bg: '#FFEBEE', text: '#C62828' },
    '3D / CG': { bg: '#FFEBEE', text: '#C62828' },
    'クリエイター': { bg: '#FFEBEE', text: '#C62828' },
    // PM系 (Indigo)
    'PM / ディレクター': { bg: '#E8EAF6', text: '#283593' },
    'コミュニティ運営': { bg: '#E8EAF6', text: '#283593' },
    // アイディアマン (Yellow/Gold)
    'アイディアマン': { bg: '#FFF8E1', text: '#F57F17' },
    // その他 (Gray/Teal)
    '財務 / 会計': { bg: '#E0F2F1', text: '#00695C' },
    '法務 / 知財': { bg: '#E0F2F1', text: '#00695C' },
    '英語 / 語学': { bg: '#F5F5F5', text: '#424242' },
};

// English to Japanese tag translation map
export const TAG_TRANSLATIONS: Record<string, string> = {
    'engineer': 'エンジニア',
    'designer': 'デザイナー',
    'marketer': 'マーケター',
    'creator': 'クリエイター',
    'ideaman': 'アイディアマン',
    'other': 'その他',
};

// Translate tag if it's in English
export const translateTag = (tag: string): string => {
    return TAG_TRANSLATIONS[tag.toLowerCase()] || tag;
};

// Get tag color based on translated tag name
export const getTagColor = (tag: string): { bg: string; text: string } => {
    const translatedTag = translateTag(tag);
    return TAG_COLORS[translatedTag] || { bg: '#F5F5F5', text: '#666666' };
};

// Status tag styling
export function getStatusTagStyle(tagText: string): { color: string; icon: string } {
    if (tagText.includes('ビジネスメンバー探し') || tagText.includes('メンバー募集中')) {
        return { color: '#FF5722', icon: '🔥' };
    }
    if (tagText.includes('まずは話してみたい') || tagText.includes('壁打ち相手募集')) {
        return { color: '#039BE5', icon: '☕️' };
    }
    if (tagText.includes('アイデア模索中') || tagText.includes('起業に興味あり') || tagText.includes('情報収集中')) {
        return { color: '#43A047', icon: '🌱' };
    }
    return { color: '#546E7A', icon: '🚩' };
}
