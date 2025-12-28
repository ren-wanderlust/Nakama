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

// ブランドカラー
const COLORS = {
  primary: '#FF6B35',
  white: '#FFFFFF',
  text: '#1E293B',
  darkBg: '#0F172A', // 深いネイビー
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
      <StatusBar style="light" />

      {/* 背景: シンプルかつモダンなダークグラデーション */}
      {/* オレンジのアイコンが映えるように、深みのある色を使用 */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#020617']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* 微細なアクセント光 */}
        <LinearGradient
          colors={['rgba(255, 107, 53, 0.1)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
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
          {/* Main Content */}
          <View style={styles.centerContent}>
            {/* 新しいオレンジロゴ */}
            <Animated.View
              style={[
                styles.logoWrapper,
                { transform: [{ scale: logoAnim }] }
              ]}
            >
              <Image
                source={require('../assets/pogg_logo_orange.png')}
                style={styles.logoIcon}
                contentFit="contain"
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
    backgroundColor: '#0F172A',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
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
    borderRadius: 24, // アプリアイコンのような角丸
    overflow: 'hidden',
    // 影をつけて浮き上がらせる
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: '#FFA500', // 画像読み込み前のプレースホルダー色
  },
  logoIcon: {
    width: '100%',
    height: '100%',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    color: '#94A3B8', // 少し落ち着いたグレーで読みやすく
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  bottomSection: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
