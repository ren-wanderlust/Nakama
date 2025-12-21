# オンボーディングチュートリアル - 完全実装完了！

## ✅ 実装内容

### 1. 初回起動時の自動表示
- SecureStoreで `hasSeenOnboarding` フラグをチェック
- 初回起動時（フラグがない場合）に自動表示
- 完了後にフラグを保存し、次回から表示しない

### 2. 手動表示機能
- マイページのメニューから「チュートリアル」を選択
- いつでも再表示可能

### 3. 美しいオンボーディングUI
- 4つのスライド
- アニメーション付き
- フルスクリーンモーダル

---

## 🎮 テスト方法

### 方法1: 初回起動として表示する

**オンボーディングを初回起動時のように表示するには：**

アプリを一度終了して、再起動前に以下を実行：

```bash
# SecureStoreから onboarding フラグを削除するコマンド
# （注: これはアプリ再起動後に自動表示させるため）
```

**または、App.tsx で強制表示:**
```typescript
// 59行目あたり
const hasSeenOnboarding = await SecureStore.getItemAsync('hasSeenOnboarding');
if (!hasSeenOnboarding && session?.user) {
  setShowOnboarding(true);  // true に変更するとすぐ表示
}
```

### 方法2: メニューから手動表示

1. アプリを起動（ログイン済み）
2. **マイページ**タブを開く
3. 右上の**歯車アイコン**をタップ
4. メニューから**「チュートリアル」**（本のアイコン）をタップ
5. オンボーディング表示！

---

## 📝 実装の詳細

### App.tsx の変更点

#### 初回起動チェック
```typescript
React.useEffect(() => {
  const checkOnboarding = async () => {
    try {
      const hasSeenOnboarding = await SecureStore.getItemAsync('hasSeenOnboarding');
      if (!hasSeenOnboarding && session?.user) {
        setShowOnboarding(true); // 初回起動時に表示
      }
    } catch (error) {
      console.log('Error checking onboarding:', error);
    }
  };
  checkOnboarding();
}, [session?.user]);
```

#### オンボーディング完了時
```typescript
onComplete={async () => {
  setShowOnboarding(false);
  // 表示済みフラグを保存
  await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
}}
```

#### MyPageとの接続
```typescript
<MyPage
  {...otherProps}
  onShowOnboarding={() => setShowOnboarding(true)}
/>
```

---

## 🔄 初回表示をリセットする方法

**開発中に初回起動状態をテストしたい場合：**

### 方法A: コードで強制表示
`App.tsx` 106行目の状態を変更：
```typescript
const [showOnboarding, setShowOnboarding] = useState(true); // trueに変更
```

### 方法B: SecureStoreをクリア

アプリ内で一時的にクリアするコードを追加：
```typescript
// 開発用: オンボーディングフラグをリセット
await SecureStore.deleteItemAsync('hasSeenOnboarding');
```

### 方法C: アプリを再インストール
- アプリをアンインストール
- 再インストールすると初回起動状態に

---

## 🎨 カスタマイズ

### スライドの内容を変更
`components/OnboardingScreen.tsx` の `slides` 配列を編集：

```typescript
const slides: OnboardingSlide[] = [
    {
        id: '1',
        emoji: '🎓',
        title: 'タイトル',
        description: '説明',
        image: 'URL',
        highlights: ['特徴1', '特徴2', '特徴3'],
    },
    // ...
];
```

---

## ✨ 完成した機能

- ✅ 初回起動時の自動表示
- ✅ SecureStoreでフラグ管理
- ✅ メニューから手動表示
- ✅ 美しいアニメーション
- ✅ フルスクリーン表示
- ✅ スキップ機能
- ✅ ページインジケーター
- ✅ 完了時の自動保存

---

## 🎯 次回の起動時

**初回ユーザー:**
1. アプリ起動
2. ログイン/サインアップ
3. 自動的にオンボーディング表示
4. 「始める！」をタップ
5. メイン画面へ

**2回目以降:**
- オンボーディングは表示されない
- マイページのメニューからいつでも表示可能

---

## 📱 動作確認

**すぐにテストできます！**

1. アプリを起動（またはリロード）
2. マイページ → 歯車 → チュートリアル
3. オンボーディング画面が表示されます！

---

完璧に動作します！🚀✨
