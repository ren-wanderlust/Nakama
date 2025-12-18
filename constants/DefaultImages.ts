// デフォルト画像の定数
// require()を使用してローカルアセットを参照

export const DEFAULT_AVATAR = require('../assets/default-avatar.png');

// 画像ソースを返すヘルパー関数
// URI文字列がある場合は{ uri: string }を返し、ない場合はデフォルトアバターを返す
export const getImageSource = (uri?: string | null) => {
    if (uri && uri.trim() !== '') {
        return { uri };
    }
    return DEFAULT_AVATAR;
};
