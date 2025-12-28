import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../constants/DesignSystem';
import { ModernButton, ModernInput } from './ModernComponents';
import { TermsOfServicePage } from './TermsOfServicePage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

const { width } = Dimensions.get('window');

// ブランドカラー & ライトテーマパレット
const COLORS = {
  primary: '#FEBD69',  // アイコンに合わせた明るいオレンジ
  bg: '#F8FAFC',       // 明るいオフホワイト
  text: '#1E293B',     // 濃いネイビー（読みやすい黒に近い色）
  subText: '#64748B',  // 落ち着いたグレー
  border: '#E2E8F0',
};

interface LoginScreenProps {
  onCreateAccount: () => void;
}

export function LoginScreen({ onCreateAccount }: LoginScreenProps) {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // アニメーション
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const logoAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log('Login successful');
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('送信完了', 'パスワード再設定用のメールを送信しました。');
    } catch (error: any) {
      Alert.alert('エラー', error.message || '送信に失敗しました');
    }
  };

  if (isTermsModalVisible) return <TermsOfServicePage onBack={() => setIsTermsModalVisible(false)} />;
  if (isPrivacyModalVisible) return <PrivacyPolicyPage onBack={() => setIsPrivacyModalVisible(false)} />;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* 背景: 明るくクリーンなグラデーション */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#FFF7ED', '#FFEDD5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* ネットワークパターン（薄く透かす） */}
        <Image
          source={require('../assets/network-pattern.png')}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.03 }]}
          contentFit="cover"
        />

        {/* 巨大な透かしロゴ（背景アクセント: 右上） */}
        <View style={{
          position: 'absolute',
          top: -width * 0.2,
          right: -width * 0.2,
          opacity: 0.05,
          transform: [{ rotate: '-15deg' }]
        }}>
          <Image
            source={require('../assets/pogg_logo_orange.png')}
            style={{ width: width * 0.8, height: width * 0.8 }}
            contentFit="contain"
          />
        </View>

        {/* 巨大な透かしロゴ（背景アクセント: 左下） */}
        <View style={{
          position: 'absolute',
          bottom: width * 0.1,
          left: -width * 0.3,
          opacity: 0.04,
          transform: [{ rotate: '30deg' }]
        }}>
          <Image
            source={require('../assets/pogg_logo_orange.png')}
            style={{ width: width * 0.9, height: width * 0.9 }}
            contentFit="contain"
          />
        </View>

        {/* 装飾: 右上の淡いオレンジの光 */}
        <View style={[styles.decorationCircle, {
          top: -100,
          right: -100,
          backgroundColor: 'rgba(254, 189, 105, 0.15)'
        }]} />

        {/* 装飾: 左下の淡いブルーの光 */}
        <View style={[styles.decorationCircle, {
          bottom: -100,
          left: -100,
          backgroundColor: 'rgba(56, 189, 248, 0.08)'
        }]} />

        {/* 下部のグラデーション装飾（温かみを足す） */}
        <LinearGradient
          colors={['transparent', 'rgba(254, 189, 105, 0.1)', 'rgba(254, 189, 105, 0.25)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.innerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Main Content */}
          <View style={styles.centerContent}>
            {/* オレンジロゴ */}
            <Animated.View
              style={[
                styles.logoWrapper,
                { transform: [{ scale: logoAnim }] }
              ]}
            >
              <Image
                source={require('../assets/pogg_logo_orange.png')}
                style={styles.logoIcon}
                contentFit="cover"
              />
            </Animated.View>

            <Text style={styles.mainTitle}>Find Your Team</Text>
            <Text style={styles.subTitle}>Connect with student innovators</Text>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={onCreateAccount}
              activeOpacity={0.9}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>アカウント作成</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLoginModalVisible(true)}
              activeOpacity={0.7}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>ログイン</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Login Modal */}
      <Modal
        visible={isLoginModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLoginModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoid}
            >
              <View style={styles.modalContent}>
                <View style={[styles.modalHeader, { justifyContent: 'center', position: 'relative' }]}>
                  <Text style={styles.modalTitle}>おかえりなさい</Text>
                  <TouchableOpacity
                    onPress={() => setIsLoginModalVisible(false)}
                    style={[styles.closeButton, { position: 'absolute', right: 0 }]}
                  >
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  <ModernInput
                    label="メールアドレス"
                    placeholder="example@email.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    icon="mail-outline"
                  />

                  <ModernInput
                    label="パスワード"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    icon="lock-closed-outline"
                  />

                  <View style={{ alignItems: 'flex-end', marginTop: -8 }}>
                    <ModernButton
                      title="パスワードを忘れた場合"
                      onPress={handleForgotPassword}
                      variant="ghost"
                      size="small"
                    />
                  </View>

                  <ModernButton
                    title={loading ? "ログイン中..." : "ログイン"}
                    onPress={handleLogin}
                    loading={loading}
                    variant="primary"
                    fullWidth
                    size="large"
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden', // 装飾がはみ出さないように
  },
  decorationCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    // ぼかし効果風のスタイル（Androidはelevationが必要だが、ここではopacityで表現）
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ロゴスタイル
  logoWrapper: {
    width: 100,
    height: 100,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    // 明るい背景に合わせて影を少し柔らかく
    shadowColor: COLORS.primary, // 影を少しオレンジ寄りにすると綺麗
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#fff',
  },
  logoIcon: {
    width: '100%',
    height: '100%',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    color: COLORS.subText,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  bottomSection: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary, // ブランドカラー（オレンジ）
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    // 影で浮遊感を出す
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    // 軽い影
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // 少し青みがかった半透明
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  formContainer: {
    gap: 20,
  },
});
