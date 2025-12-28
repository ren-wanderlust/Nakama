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
import { SHADOWS, FONTS } from '../constants/DesignSystem';
import { ModernButton, ModernInput } from './ModernComponents';
import { TermsOfServicePage } from './TermsOfServicePage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

const { width, height } = Dimensions.get('window');

// ブランドカラー
const COLORS = {
  primary: '#FF6B35',
  white: '#FFFFFF',
  text: '#1E293B',
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
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
    // ... (パスワードリセット処理)
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
      <StatusBar style="light" />

      {/* 背景: 画像の代わりにリッチなグラデーションとパターンを使用 */}
      <View style={styles.backgroundContainer}>
        {/* ベース画像（ネットワークパターン） */}
        <Image
          source={require('../assets/network-pattern.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />

        {/* オーバーレイグラデーション: 参考画像のようなダークで没入感のある雰囲気 */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* アクセントカラーの光（コンセプト: 未来への情熱） */}
        <LinearGradient
          colors={['rgba(255, 107, 53, 0.4)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFillObject}
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
          {/* Header (Empty for spacing) */}
          <View style={{ flex: 1 }} />

          {/* Main Content: Minimize text as requested */}
          <View style={styles.centerContent}>
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
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLoginModalVisible(true)}
              activeOpacity={0.7}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Log In</Text>
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
                  <Text style={styles.modalTitle}>Welcome Back</Text>
                  <TouchableOpacity
                    onPress={() => setIsLoginModalVisible(false)}
                    style={[styles.closeButton, { position: 'absolute', right: 0 }]}
                  >
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  <ModernInput
                    label="Email"
                    placeholder="hello@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    icon="mail-outline"
                  />

                  <ModernInput
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    icon="lock-closed-outline"
                  />

                  <View style={{ alignItems: 'flex-end', marginTop: -8 }}>
                    <ModernButton
                      title="Forgot Password?"
                      onPress={handleForgotPassword}
                      variant="ghost"
                      size="small"
                    />
                  </View>

                  <ModernButton
                    title={loading ? "Logging in..." : "Log In"}
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
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6, // 背景画像としての主張を少し抑える
  },
  contentContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  centerContent: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subTitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSection: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.white, // 参考画像同様、背景白
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    // 微妙な透明度を持たせて背景を透かすか、完全に不透明にするか
    // 参考画像は不透明っぽい
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // 半透明のガラス風
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    paddingBottom: 48,
  },
  modalHeader: {
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
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
