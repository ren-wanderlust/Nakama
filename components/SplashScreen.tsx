import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onAnimationComplete?: () => void;
    isReady?: boolean; // trueになったらフェードアウト開始
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onAnimationComplete,
    isReady = false,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const [hasAnimatedIn, setHasAnimatedIn] = useState(false);

    // フェードインアニメーション
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setHasAnimatedIn(true);
        });
    }, [fadeAnim, scaleAnim]);

    // isReadyがtrueになったらフェードアウト
    useEffect(() => {
        if (isReady && hasAnimatedIn) {
            // 少し待ってからフェードアウト（ロゴを見せる時間）
            const timer = setTimeout(() => {
                Animated.timing(containerOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => {
                    if (onAnimationComplete) {
                        onAnimationComplete();
                    }
                });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isReady, hasAnimatedIn, containerOpacity, onAnimationComplete]);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Text style={styles.logoText}>Pogg</Text>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        zIndex: 1000,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -1,
    },
});
