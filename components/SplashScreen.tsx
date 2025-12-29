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

            {/* 背景: 白単色 */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />

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
                        source={require('../assets/pogg_logo_orange_icon.png')}
                        style={styles.logoIcon}
                        contentFit="contain"
                    />
                </View>
            </Animated.View>

            {/* 下部のテキスト */}
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
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1, // 中央配置のためにflexを使用
    },
    iconWrapper: {
        width: 120,
        height: 120,
        // 装飾を削除してフラットに
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoIcon: {
        width: '100%',
        height: '100%',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
        width: '100%',
    },
    tagline: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F39800', // ブランドカラー
        letterSpacing: 1.5,
    },
});
