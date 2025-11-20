import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onCreateAccount: () => void;
  onLogin: () => void;
}

export function LoginScreen({ onCreateAccount, onLogin }: LoginScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Image with Overlay */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1563457025576-c949c4e3da06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1cnMlMjBjb2xsYWJvcmF0aW9uJTIwbWVldGluZ3xlbnwxfHx8fDE3NjM1MzExMTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />
      </View>

      {/* Content */}
      <SafeAreaView style={styles.contentContainer}>
        <View style={styles.innerContainer}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <LinearGradient
                colors={['#14b8a6', '#2563eb']}
                style={styles.logoIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.logoText}>B</Text>
              </LinearGradient>
              <Text style={styles.appName}>BizYou</Text>
            </View>
          </View>

          {/* Main Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>
              あなたの挑戦の{'\n'}相棒を見つけよう
            </Text>
            <Text style={styles.subtitle}>
              25歳以下の起業・ビジコン・スモビジに{'\n'}挑戦する仲間と出会う
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Create Account Button - Primary */}
            <TouchableOpacity onPress={onCreateAccount} activeOpacity={0.8}>
              <LinearGradient
                colors={['#f97316', '#eab308']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>アカウントを作成</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Button - Secondary */}
            <TouchableOpacity onPress={onLogin} activeOpacity={0.8} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>アカウントをお持ちの方</Text>
            </TouchableOpacity>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                続行することで、
                <Text style={styles.linkText}>利用規約</Text>
                および
                <Text style={styles.linkText}>プライバシーポリシー</Text>
                に同意したものとみなされます
              </Text>
            </View>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // gray-900
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
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  logoContainer: {
    paddingTop: 16,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  appName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    // fontFamily: 'ADLaM_Display', // Custom font not available yet
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  actionContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  termsContainer: {
    paddingTop: 8,
    alignItems: 'center',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
    marginHorizontal: 4,
  },
});
