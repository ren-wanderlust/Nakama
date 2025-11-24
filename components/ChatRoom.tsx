import React, { useState, useRef, useMemo, useEffect } from 'react';
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
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'other';
    timestamp: string;
    date: string; // ISO date string for grouping (YYYY-MM-DD)
    created_at: string;
}

interface MessageItem {
    type: 'date' | 'message';
    id: string;
    dateLabel?: string; // For date separators
    message?: Message; // For actual messages
}

interface ChatRoomProps {
    onBack: () => void;
    partnerId: string;
    partnerName: string;
    partnerImage: string;
    onPartnerProfilePress: () => void;
}

// Helper function to get date label
const getDateLabel = (dateString: string): string => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare only dates
    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
        return '今日';
    } else if (messageDate.getTime() === yesterday.getTime()) {
        return '昨日';
    } else {
        // Format as MM/DD
        return `${messageDate.getMonth() + 1}/${messageDate.getDate()}`;
    }
};

export function ChatRoom({ onBack, partnerId, partnerName, partnerImage, onPartnerProfilePress }: ChatRoomProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const initializeChat = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                await fetchMessages(user.id);
                subscribeToMessages(user.id);
            }
            setLoading(false);
        };

        initializeChat();

        return () => {
            supabase.channel('public:messages').unsubscribe();
        };
    }, [partnerId]);

    const fetchMessages = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                const formattedMessages: Message[] = data.map((msg: any) => ({
                    id: msg.id,
                    text: msg.content,
                    sender: msg.sender_id === userId ? 'me' : 'other',
                    timestamp: new Date(msg.created_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    date: new Date(msg.created_at).toISOString().split('T')[0],
                    created_at: msg.created_at,
                }));
                setMessages(formattedMessages);
            }
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            Alert.alert('エラー', `メッセージの取得に失敗しました: ${error.message || error}`);
        }
    };

    const subscribeToMessages = (userId: string) => {
        supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.new.sender_id === partnerId) {
                        const newMessage: Message = {
                            id: payload.new.id,
                            text: payload.new.content,
                            sender: 'other',
                            timestamp: new Date(payload.new.created_at).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                            }),
                            date: new Date(payload.new.created_at).toISOString().split('T')[0],
                            created_at: payload.new.created_at,
                        };
                        setMessages((prev) => [...prev, newMessage]);
                    }
                }
            )
            .subscribe();
    };

    // Create message list with date separators
    const messageListWithDates = useMemo(() => {
        const items: MessageItem[] = [];
        let lastDate: string | null = null;

        messages.forEach((message) => {
            // Add date separator if date changed
            if (message.date !== lastDate) {
                items.push({
                    type: 'date',
                    id: `date-${message.date}`,
                    dateLabel: getDateLabel(message.date),
                });
                lastDate = message.date;
            }

            // Add message
            items.push({
                type: 'message',
                id: message.id,
                message,
            });
        });

        return items;
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !currentUserId) return;

        const content = inputText.trim();
        setInputText(''); // Clear input immediately for better UX

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: currentUserId,
                    receiver_id: partnerId,
                    content: content,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newMessage: Message = {
                    id: data.id,
                    text: data.content,
                    sender: 'me',
                    timestamp: new Date(data.created_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    date: new Date(data.created_at).toISOString().split('T')[0],
                    created_at: data.created_at,
                };
                setMessages((prev) => [...prev, newMessage]);

                // Scroll to bottom after sending
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            Alert.alert('エラー', `メッセージの送信に失敗しました: ${error.message || error}`);
            setInputText(content); // Restore input on error
        }
    };

    const renderDateSeparator = (dateLabel: string) => (
        <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{dateLabel}</Text>
            <View style={styles.dateSeparatorLine} />
        </View>
    );

    const renderMessage = (message: Message) => {
        const isMe = message.sender === 'me';
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
                            <Text style={styles.messageTextMe}>{message.text}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={styles.bubbleOther}>
                            <Text style={styles.messageTextOther}>{message.text}</Text>
                        </View>
                    )}
                    <Text style={styles.timestamp}>{message.timestamp}</Text>
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: MessageItem }) => {
        if (item.type === 'date') {
            return renderDateSeparator(item.dateLabel!);
        } else {
            return renderMessage(item.message!);
        }
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

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

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
                data={messageListWithDates}
                renderItem={renderItem}
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
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
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
    dateSeparatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 16,
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#d1d5db',
    },
    dateSeparatorText: {
        paddingHorizontal: 12,
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
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
