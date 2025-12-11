import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Linking, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../constants/DesignSystem';

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
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>P</Text>
              </View>
              <Text style={styles.appName}>Pogg</Text>
            </View>
            <Text style={styles.logoSubtitle}>Elite Student Network</Text>
          </View>

          {/* Main Message - Centered */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>
              東大・早慶・MARCHで{'\n'}未来を創る仲間を見つける
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Create Account Button - Primary */}
            <TouchableOpacity onPress={onCreateAccount} activeOpacity={0.8} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>アカウントを作成</Text>
            </TouchableOpacity>

            {/* Login Button - Secondary */}
            <TouchableOpacity onPress={() => setIsLoginModalVisible(true)} activeOpacity={0.8} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>アカウントをお持ちの方</Text>
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
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>メールアドレス</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="example@email.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>パスワード</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="パスワードを入力"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    style={styles.forgotPasswordContainer}
                  >
                    <Text style={styles.forgotPasswordText}>パスワードを忘れた場合</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.loginButtonText}>ログイン</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={isTermsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>利用規約</Text>
              <TouchableOpacity onPress={() => setIsTermsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.policyScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.policyText}>
                {/* TODO: 実際の利用規約テキストを追加してください */}
                <Text style={styles.policyTitle}>第1条（適用）</Text>{'\n\n'}
                本規約は、本サービスの提供条件及び本サービスの利用に関する当社と登録ユーザーとの間の権利義務関係を定めることを目的とし、登録ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。{'\n\n'}

                <Text style={styles.policyTitle}>第2条（利用登録）</Text>{'\n\n'}
                本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれに対する承認を登録希望者に通知することによって、利用登録が完了するものとします。{'\n\n'}

                <Text style={styles.policyTitle}>第3条（禁止事項）</Text>{'\n\n'}
                登録ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。{'\n'}
                ・法令または公序良俗に違反する行為{'\n'}
                ・犯罪行為に関連する行為{'\n'}
                ・当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為{'\n'}
                ・その他、当社が不適切と判断する行為{'\n\n'}

                {/* 他の条項を追加 */}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>プライバシーポリシー</Text>
              <TouchableOpacity onPress={() => setIsPrivacyModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.policyScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.policyText}>
                {/* TODO: 実際のプライバシーポリシーテキストを追加してください */}
                <Text style={styles.policyTitle}>1. 収集する情報</Text>{'\n\n'}
                当社は、本サービスの提供にあたり、以下の情報を収集します：{'\n'}
                ・氏名、メールアドレス等の個人情報{'\n'}
                ・プロフィール情報{'\n'}
                ・サービス利用履歴{'\n\n'}

                <Text style={styles.policyTitle}>2. 情報の利用目的</Text>{'\n\n'}
                収集した情報は、以下の目的で利用します：{'\n'}
                ・本サービスの提供・運営のため{'\n'}
                ・ユーザーからのお問い合わせに回答するため{'\n'}
                ・本サービスの改善・新サービスの開発のため{'\n\n'}

                <Text style={styles.policyTitle}>3. 情報の第三者提供</Text>{'\n\n'}
                当社は、ユーザーの同意なく、個人情報を第三者に提供することはありません。ただし、法令に基づく場合はこの限りではありません。{'\n\n'}

                {/* 他の条項を追加 */}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 44,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 52,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
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
    width: '100%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
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
