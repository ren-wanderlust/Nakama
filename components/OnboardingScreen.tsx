import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS } from '../constants/DesignSystem';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    emoji: string;
    title: string;
    description: string;
    image: any; // ローカル画像（require）またはURL（{uri: string}）
    highlights: string[];
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        emoji: '🎓',
        title: '東大早慶MARCHの\n学生中心のコミュニティ',
        description: 'トップ大学を中心に\n意欲的な学生が集まる場所',
        image: require('../assets/onboarding_community.png'),
        highlights: ['東大・早慶・MARCH中心', '誰でも参加歓迎', '質の高い出会い'],
    },
    {
        id: '2',
        emoji: '🤝',
        title: '個人でマッチング',
        description: '気になる人に「いいね」を送って\n繋がろう',
        image: require('../assets/onboarding_matching.png'),
        highlights: ['プロフィール閲覧', '相互いいねでマッチ', '即座にチャット'],
    },
    {
        id: '3',
        emoji: '📋',
        title: 'プロジェクトを\n見つける・参加する',
        description: '興味のあるプロジェクトに\n応募して仲間になろう',
        image: require('../assets/onboarding_projects.png'),
        highlights: ['絞り込み機能', 'プロジェクト応募', 'チームで活動'],
    },
    {
        id: '4',
        emoji: '🚀',
        title: 'プロジェクトを\n立ち上げよう',
        description: 'アイデアを形にする\n最高の仲間を募集',
        image: require('../assets/onboarding_create.png'),
        highlights: ['簡単作成', 'メンバー募集', 'グループチャット'],
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    React.useEffect(() => {
        // アニメーション開始
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, [currentIndex]);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            // アニメーションをリセット
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const renderItem = ({ item, index }: { item: OnboardingSlide; index: number }) => {
        const isActive = index === currentIndex;

        return (
            <View style={styles.slide}>
                {/* 背景画像 */}
                <View style={styles.imageContainer}>
                    <Image
                        source={item.image}
                        style={styles.image}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                        style={styles.gradientOverlay}
                    />
                </View>

                {/* コンテンツ */}
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            opacity: isActive ? fadeAnim : 0.3,
                            transform: [{ scale: isActive ? scaleAnim : 0.8 }],
                        }
                    ]}
                >
                    {/* 絵文字 */}
                    <View style={styles.emojiContainer}>
                        <Text style={styles.emoji}>{item.emoji}</Text>
                    </View>

                    {/* タイトル */}
                    <Text style={styles.title}>{item.title}</Text>

                    {/* 説明 */}
                    <Text style={styles.description}>{item.description}</Text>

                    {/* ハイライトポイント */}
                    <View style={styles.highlightsContainer}>
                        {item.highlights.map((highlight, idx) => (
                            <View key={idx} style={styles.highlightItem}>
                                <View style={styles.highlightDot} />
                                <Text style={styles.highlightText}>{highlight}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                style={styles.list}
                bounces={false}
                scrollEventThrottle={16}
            />

            {/* ヘッダー - スキップボタン */}
            {currentIndex !== slides.length - 1 && (
                <SafeAreaView style={styles.headerOverlay}>
                    <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>スキップ</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}

            {/* フッター - ページネーション & ボタン */}
            <SafeAreaView style={styles.footerOverlay}>
                <View style={styles.footerContent}>
                    {/* ページインジケーター */}
                    <View style={styles.pagination}>
                        {slides.map((_, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentIndex === index && styles.activeDot,
                                    {
                                        backgroundColor: currentIndex === index ? '#FFD700' : 'rgba(255,255,255,0.3)',
                                    }
                                ]}
                            />
                        ))}
                    </View>

                    {/* 次へ/始めるボタン */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={currentIndex === slides.length - 1
                                ? ['#FFD700', '#FFA500']
                                : ['#009688', '#00796B']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.buttonGradient}
                        >
                            <Text style={styles.buttonText}>
                                {currentIndex === slides.length - 1 ? '始める！' : '次へ'}
                            </Text>
                            {currentIndex !== slides.length - 1 && (
                                <Ionicons name="arrow-forward" size={22} color="white" />
                            )}
                            {currentIndex === slides.length - 1 && (
                                <Ionicons name="rocket" size={22} color="white" />
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    list: {
        flex: 1,
    },
    slide: {
        width: width,
        height: height,
    },
    imageContainer: {
        position: 'absolute',
        width: width,
        height: height,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 100,
    },
    emojiContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    emoji: {
        fontSize: 64,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 40,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    description: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 32,
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    highlightsContainer: {
        gap: 12,
        marginTop: 8,
    },
    highlightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    highlightDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFD700',
    },
    highlightText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
    },
    skipButton: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderBottomLeftRadius: 20,
    },
    skipText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    footerContent: {
        padding: 24,
        paddingBottom: 16,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        width: 32,
        backgroundColor: '#FFD700',
    },
    button: {
        borderRadius: 100,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
