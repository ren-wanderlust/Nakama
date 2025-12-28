import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ログイン画面と共通のカラー
const COLORS = {
    primary: '#FEBD69',
    text: '#1E293B',
};

interface SplashScreenProps {
    onAnimationComplete?: () => void;
    isReady?: boolean; // trueになったらフェードアウト開始
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onAnimationComplete,
    isReady = false,
}) => {
    // アニメーション値
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const [hasAnimatedIn, setHasAnimatedIn] = useState(false);

    // 初期フェードイン & スケールアップ
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                // イージングで少し跳ねるような動きに
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setHasAnimatedIn(true);

            // 完了後に呼吸アニメーション開始
            startPulseAnimation();
        });
    }, []);

    // 呼吸（Pulse）アニメーション
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    // 終了処理
    useEffect(() => {
        if (isReady && hasAnimatedIn) {
            // アプリの準備ができたら、少し余韻を残してからフェードアウト
            const timer = setTimeout(() => {
                Animated.timing(containerOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    if (onAnimationComplete) {
                        onAnimationComplete();
                    }
                });
            }, 800); // 800msの余韻（ロゴを見せる）
            return () => clearTimeout(timer);
        }
    }, [isReady, hasAnimatedIn, onAnimationComplete]);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <StatusBar style="dark" />

            {/* 背景: ログイン画面と共通の温かいグラデーション */}
            <LinearGradient
                colors={['#FFFFFF', '#FFF7ED', '#FFEDD5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* 背景の装飾（薄いロゴパターン） */}
            <View style={{
                position: 'absolute',
                top: -width * 0.2,
                right: -width * 0.2,
                opacity: 0.03,
                transform: [{ rotate: '-15deg' }]
            }}>
                <Image
                    source={require('../assets/pogg_logo_orange.png')}
                    style={{ width: width * 0.8, height: width * 0.8 }}
                    contentFit="contain"
                />
            </View>

            {/* メインロゴコンテンツ */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { scale: scaleAnim },
                            { scale: pulseAnim } // 呼吸アニメーションを合成
                        ],
                    },
                ]}
            >
                {/* ロゴアイコン */}
                <View style={styles.iconWrapper}>
                    <Image
                        source={require('../assets/pogg_logo_orange.png')}
                        style={styles.logoIcon}
                        contentFit="cover"
                    />
                </View>

                {/* ブランド名 */}
                <Text style={styles.logoText}>Pogg</Text>
            </Animated.View>

            {/* 下部のローディングインジケーター */}
            <View style={styles.footerContainer}>
                <Text style={styles.tagline}>Future Leaders Community</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 120, // ログイン画面より少し大きめ
        height: 120,
        marginBottom: 24,
        borderRadius: 28,
        // アイコン自体に少し影を落とす
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: '#fff',
    },
    logoIcon: {
        width: '100%',
        height: '100%',
    },
    logoText: {
        fontSize: 42,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -1,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 60,
        alignItems: 'center',
    },
    tagline: {
        fontSize: 12,
        color: '#94A3B8',
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
});
