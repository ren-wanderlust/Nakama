import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Image,
    SafeAreaView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'other';
    timestamp: string;
}

interface ChatRoomProps {
    onBack: () => void;
    partnerName: string;
    partnerImage: string;
    onPartnerProfilePress: () => void;
}

export function ChatRoom({ onBack, partnerName, partnerImage, onPartnerProfilePress }: ChatRoomProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'はじめまして！プロフィール拝見しました。',
            sender: 'other',
            timestamp: '10:30',
        },
        {
            id: '2',
            text: 'AIを活用したプロダクト開発に興味があります！',
            sender: 'other',
            timestamp: '10:31',
        },
        {
            id: '3',
            text: 'はじめまして！メッセージありがとうございます。',
            sender: 'me',
            timestamp: '10:35',
        },
        {
            id: '4',
            text: 'ぜひ一度お話ししませんか？',
            sender: 'me',
            timestamp: '10:35',
        },
        {
            id: '5',
            text: 'ぜひお願いします！来週の平日で都合の良い日はありますか？',
            sender: 'other',
            timestamp: '10:40',
        },
    ]);

    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (inputText.trim()) {
            const newMessage: Message = {
                id: Date.now().toString(),
                text: inputText,
                sender: 'me',
                timestamp: new Date().toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            };
            setMessages([...messages, newMessage]);
            setInputText('');
            // Scroll to bottom after sending
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender === 'me';
        return (
            <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                <View style={[styles.messageContainer, isMe ? styles.messageContainerMe : styles.messageContainerOther]}>
                    {isMe ? (
                        <LinearGradient
                            colors={['#0d9488', '#2563eb']} // teal-600 to blue-600
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bubbleGradient}
                        >
                            <Text style={styles.messageTextMe}>{item.text}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={styles.bubbleOther}>
                            <Text style={styles.messageTextOther}>{item.text}</Text>
                        </View>
                    )}
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>
            </View>
        );
    };

    const handleMenuPress = () => {
        Alert.alert(
            'メニュー',
            '',
            [
                { text: '相手のプロフィールを見る', onPress: onPartnerProfilePress },
                { text: '通知をオフにする', onPress: () => Alert.alert('完了', '通知をオフにしました') },
                {
                    text: 'ブロックする',
                    style: 'destructive',
                    onPress: () => Alert.alert('確認', '本当にブロックしますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: 'ブロック実行', style: 'destructive', onPress: () => console.log('Blocked') }
                    ])
                },
                {
                    text: '通報する',
                    style: 'destructive',
                    onPress: () => Alert.alert('通報', '不適切なユーザーとして報告しますか？', [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '通報する', style: 'destructive', onPress: () => Alert.alert('完了', '通報を受け付けました') }
                    ])
                },
                { text: 'キャンセル', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerInfo} onPress={onPartnerProfilePress}>
                    <Image source={{ uri: partnerImage }} style={styles.headerAvatar} />
                    <Text style={styles.headerName}>{partnerName}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={() => Alert.alert('画像送信', '画像選択機能は開発中です')}
                    >
                        <Ionicons name="add" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="メッセージを入力..."
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        style={[
                            styles.sendButton,
                            !inputText.trim() && styles.sendButtonDisabled
                        ]}
                    >
                        {inputText.trim() ? (
                            <LinearGradient
                                colors={['#f97316', '#ea580c']}
                                style={styles.sendButtonGradient}
                            >
                                <Ionicons name="send" size={20} color="white" />
                            </LinearGradient>
                        ) : (
                            <View style={styles.sendButtonContentDisabled}>
                                <Ionicons name="send" size={20} color="#9ca3af" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#14b8a6', // teal-500
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    menuButton: {
        padding: 4,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 32,
    },
    messageRow: {
        marginBottom: 16,
        flexDirection: 'row',
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },
    messageContainer: {
        maxWidth: '75%',
        gap: 4,
    },
    messageContainerMe: {
        alignItems: 'flex-end',
    },
    messageContainerOther: {
        alignItems: 'flex-start',
    },
    bubbleGradient: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    messageTextMe: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
    messageTextOther: {
        color: '#111827',
        fontSize: 14,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: 10,
        color: '#9ca3af',
        paddingHorizontal: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: '#f9fafb',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        backgroundColor: '#f3f4f6',
    },
    sendButtonGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonContentDisabled: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
