import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    description: string;
    image: string;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: '一緒に挑戦する仲間が見つかる',
        description: '起業、ハッカソン、プロジェクト立ち上げ。\n同じ熱量を持つパートナーと出会い、\nあなたのビジョンを加速させましょう。',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '2',
        title: '最適なパートナーを推薦',
        description: 'スキルや興味のあるテーマに基づいて、\nあなたにぴったりのメンバーを提案。\n効率的にチームビルディングが可能です。',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '3',
        title: 'アイデアを形にする場所',
        description: 'チャットで気軽に壁打ちしたり、\nプロジェクトを開始したり。\nBizYouは、挑戦するすべての人のための\nプラットフォームです。',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const renderItem = ({ item }: { item: OnboardingSlide }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.8)', 'white']}
                        style={styles.gradientOverlay}
                        start={{ x: 0, y: 0.6 }}
                        end={{ x: 0, y: 1 }}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
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
            />

            {/* Header Skip Button (Absolute) */}
            {currentIndex !== slides.length - 1 && (
                <SafeAreaView style={styles.headerOverlay}>
                    <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>スキップ</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}

            {/* Footer Controls (Absolute) */}
            <View style={styles.footerOverlay}>
                <View style={styles.pagination}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot,
                                { backgroundColor: currentIndex === index ? '#009688' : '#CFD8DC' }
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNext}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={currentIndex === slides.length - 1 ? ['#009688', '#00796b'] : ['#374151', '#1f2937']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {currentIndex === slides.length - 1 ? 'はじめる' : '次へ'}
                        </Text>
                        {currentIndex !== slides.length - 1 && (
                            <Ionicons name="arrow-forward" size={20} color="white" />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    list: {
        flex: 1,
    },
    slide: {
        width: width,
        height: height,
        alignItems: 'center',
    },
    imageContainer: {
        width: width,
        height: height * 0.6, // 60% height for image
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 150, // Increased fade height
    },
    textContainer: {
        flex: 1,
        width: width,
        paddingHorizontal: 32,
        paddingTop: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 26, // Slightly larger
        fontWeight: 'bold',
        color: '#1A237E', // Navy Blue
        marginBottom: 20,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 15,
        color: '#546E7A', // Blue Grey
        textAlign: 'center',
        lineHeight: 28, // Increased line height
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
    },
    skipText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    footerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 48,
        backgroundColor: 'white',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 12, // Increased gap
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        width: 24, // Pill shape
        borderRadius: 4,
    },
    button: {
        borderRadius: 100,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
