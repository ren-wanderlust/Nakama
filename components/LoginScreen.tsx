import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Linking, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SHADOWS, FONTS } from '../constants/DesignSystem';
import { ModernButton, ModernInput } from './ModernComponents';
import { TermsOfServicePage } from './TermsOfServicePage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

const { width, height } = Dimensions.get('window');

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

  // アニメーション用の値
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(Math.random() * 0.6 + 0.4),
      scale: new Animated.Value(Math.random() * 1 + 0.8),
    }))
  ).current;

  useEffect(() => {
    // グラデーションの移動アニメーション（より速く、より顕著に）
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnimation, {
          toValue: 1,
          duration: 4000, // 8000から4000に短縮
          useNativeDriver: true,
        }),
        Animated.timing(gradientAnimation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 背景の回転アニメーション
    Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      })
    ).start();

    // 背景画像のズームアニメーション（より速く、より大きく）
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.15, // 1.1から1.15に拡大
          duration: 12000, // 20000から12000に短縮
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // パーティクルのアニメーション（より速く、より大きな動き）
    particleAnimations.forEach((particle, index) => {
      const startDelay = index * 400; // 800から400に短縮
      const duration = 5000 + Math.random() * 3000; // より速く
      const yDistance = -height - 150;
      const xSway = (Math.random() - 0.5) * 200; // 100から200に拡大

      // 初期遅延の後、無限ループ
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            // 上昇するアニメーション
            Animated.parallel([
              Animated.timing(particle.translateY, {
                toValue: yDistance,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(particle.translateX, {
                  toValue: xSway,
                  duration: duration / 2,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.translateX, {
                  toValue: -xSway,
                  duration: duration / 2,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            // 瞬時にリセット（開始位置に戻す）
            Animated.timing(particle.translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateX, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, startDelay);

      // 透明度のアニメーション（独立してループ）
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // ログイン成功時はAuthContextが状態変化を検知して自動的に画面遷移する
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

  if (isTermsModalVisible) {
    return <TermsOfServicePage onBack={() => setIsTermsModalVisible(false)} />;
  }

  if (isPrivacyModalVisible) {
    return <PrivacyPolicyPage onBack={() => setIsPrivacyModalVisible(false)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background with Gradient and Network Pattern */}
      <View style={styles.backgroundContainer}>
        {/* アニメーションする背景画像 */}
        <Animated.Image
          source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1080&q=80&fm=jpg&crop=entropy&cs=tinysrgb' }}
          style={[
            styles.backgroundImage,
            {
              transform: [
                { scale: scaleAnimation },
                {
                  rotate: rotateAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '2deg'],
                  }),
                },
              ],
            },
          ]}
          resizeMode="cover"
        />

        {/* 動的グラデーションオーバーレイ1 */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: gradientAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 0.95],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(15, 23, 42, 0.6)',
              'rgba(30, 58, 138, 0.8)',
              'rgba(15, 23, 42, 0.9)'
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* 動的グラデーションオーバーレイ2（反対方向） */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: gradientAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.1],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(59, 130, 246, 0.4)',
              'rgba(147, 51, 234, 0.3)',
              'rgba(236, 72, 153, 0.2)'
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* 浮遊するパーティクルエフェクト */}
        <View style={styles.particlesContainer}>
          {particleAnimations.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: `${(index * 5) % 100}%`,
                  top: height,
                  transform: [
                    { translateY: particle.translateY },
                    { translateX: particle.translateX },
                    { scale: particle.scale },
                  ],
                  opacity: particle.opacity,
                },
              ]}
            />
          ))}
        </View>

        {/* Network Pattern Overlay */}
        <View style={styles.networkPatternContainer}>
          <Image
            source={require('../assets/network-pattern.png')}
            style={styles.networkPattern}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Content */}
      <SafeAreaView style={styles.contentContainer}>
        <View style={styles.innerContainer}>

          {/* Logo - Centered at Top */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../assets/pogg_logo.png')}
                style={styles.logoIcon}
              />
              <Text style={styles.appName}>Pogg</Text>
            </View>
            <Text style={[styles.logoSubtitle, { opacity: 0.8, fontSize: 12 }]}>Connect with Future Leaders</Text>
          </View>

          {/* Main Message - Centered */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>
              未来を創る仲間に出会う
            </Text>
            <Text style={styles.subtitle}>
              プロジェクト・起業・ビジコン・学生団体{'\n'}挑戦する学生のつながり
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Create Account Button - Primary */}
            <TouchableOpacity onPress={onCreateAccount} activeOpacity={0.8} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>アカウント登録</Text>
            </TouchableOpacity>

            {/* Login Button - Secondary */}
            <TouchableOpacity onPress={() => setIsLoginModalVisible(true)} activeOpacity={0.8} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>ログイン</Text>
            </TouchableOpacity>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                登録を完了することで
                <Text style={styles.linkText} onPress={() => setIsTermsModalVisible(true)}>利用規約</Text>
                に同意したものとみな{'\n'}されます。情報の取り扱いについては
                <Text style={styles.linkText} onPress={() => setIsPrivacyModalVisible(true)}>プライバシーポリ{'\n'}シー</Text>
                をご覧ください。
              </Text>
            </View>
          </View>

        </View>
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>ログイン</Text>
                  <TouchableOpacity onPress={() => setIsLoginModalVisible(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#333" />
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
                    placeholder="パスワードを入力"
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
                    icon="log-in-outline"
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modals removed as we now use conditional rendering for full page experience */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  networkPatternContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  networkPattern: {
    width: '100%',
    height: '100%',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 8, // 4から8に拡大
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700', // より鮮やかなゴールド
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10, // 4から10に拡大
    elevation: 8,
  },
  contentContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  logoText: {
    color: '#1E3A8A',
    fontSize: 28,
    fontWeight: 'bold',
  },
  appName: {
    color: '#D4AF37',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
  actionContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...SHADOWS.lg,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  termsContainer: {
    paddingTop: 12,
    alignItems: 'center',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  policyModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  policyScrollView: {
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
});
