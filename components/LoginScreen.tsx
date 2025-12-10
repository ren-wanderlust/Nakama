import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

      {/* Background Image with Overlay */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&q=80&fm=jpg&crop=entropy&cs=tinysrgb' }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.7)']}
          style={styles.overlay}
        />
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
            <Text style={styles.logoSubtitle}>共創のストーリーを見つける</Text>
          </View>

          {/* Main Message - Centered */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>
              挑戦のために、{'\n'}仲間を
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
                登録を完了することで本利用規約に同意したものとみな{'\n'}されます。情報の取り扱いについては
                <Text style={styles.linkText}>プライバシーポリ{'\n'}シー</Text>
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
    backgroundColor: '#FDB022',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#000000',
    fontSize: 28,
    fontWeight: 'bold',
  },
  appName: {
    color: '#FDB022',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    color: '#FDB022',
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
    color: '#FDB022',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 56,
    letterSpacing: -1,
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
    color: '#FDB022',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#FDB022',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
