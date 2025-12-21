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
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Modal,
    Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../data/queryKeys';

import { useMessagesInfinite } from '../data/hooks/useMessagesInfinite';
import { Message } from '../data/api/messages';

interface MessageItem {
    type: 'date' | 'message';
    id: string;
    dateLabel?: string; // For date separators
    message?: Message; // For actual messages
}

interface ChatRoomProps {
    onBack: () => void;
    partnerId: string; // Acts as chatRoomId if isGroup is true
    partnerName: string;
    partnerImage: string;
    onPartnerProfilePress: () => void;
    onMemberProfilePress?: (memberId: string) => void; // For group chat member profile
    isGroup?: boolean; // New prop
    onBlock?: () => void;
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

// Message Bubble Component with Swipeable
const MessageBubble = ({
    message,
    onReply,
    onPartnerProfilePress,
    onMemberProfilePress,
    isGroup,
    partnerImage
}: {
    message: Message,
    onReply: (msg: Message) => void,
    onPartnerProfilePress: () => void,
    onMemberProfilePress?: (memberId: string) => void,
    isGroup?: boolean,
    partnerImage?: string
}) => {
    const isMe = message.sender === 'me';
    const swipeableRef = useRef<any>(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);

    // For reply messages: track widths of each element to determine max width
    const [replySenderWidth, setReplySenderWidth] = useState(0);
    const [replyTextWidth, setReplyTextWidth] = useState(0);
    const [mainMessageWidth, setMainMessageWidth] = useState(0);

    const screenWidth = Dimensions.get('window').width;
    const defaultMaxWidth = screenWidth * 0.75; // 75% of screen width

    // Helper to format reply text (force wrap every 20 chars)
    const formatReplyText = (text: string) => {
        if (!text) return '';
        const chunks = text.match(/.{1,20}/g);
        return chunks ? chunks.join('\n') : text;
    };

    const replyText = message.replyTo ? formatReplyText(message.replyTo.text) : '';

    // Calculate max width from reply elements and main message
    // replyContainerOverhead = Padding(8*2) + Bar(3) + Margin(8) = 27
    const replyContainerOverhead = 27;
    // Add buffer (+4) to prevent unnatural line breaks due to rendering differences
    const replyContentWidth = Math.max(replySenderWidth, replyTextWidth) + 4;
    const totalReplyWidth = message.replyTo ? replyContentWidth + replyContainerOverhead : 0;

    // Dynamic maxWidth: use the larger of default or required width
    const requiredWidth = totalReplyWidth > 0 ? Math.max(totalReplyWidth, mainMessageWidth) + 32 : 0; // Add bubble padding (16*2)
    const dynamicMaxWidth = requiredWidth > 0 && requiredWidth > defaultMaxWidth
        ? requiredWidth
        : defaultMaxWidth;

    const renderLeftActions = (_progress: any, dragX: any) => {
        return (
            <View style={styles.replyActionContainer}>
                <Ionicons name="arrow-undo" size={24} color="#0d9488" />
            </View>
        );
    };

    const handleSwipeOpen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReply(message);
        swipeableRef.current?.close();
    };

    const handleLongPress = () => {
        Alert.alert(
            'メニュー',
            '',
            [
                {
                    text: '返信する',
                    onPress: () => onReply(message)
                },
                { text: 'キャンセル', style: 'cancel' }
            ],
            { cancelable: true }
        );
    };

    // Handle avatar press based on chat type
    const handleAvatarPress = () => {
        if (isGroup && message.senderId && onMemberProfilePress) {
            onMemberProfilePress(message.senderId);
        } else {
            onPartnerProfilePress();
        }
    };

    // Determine avatar image to show
    const avatarImage = isGroup && message.senderImage
        ? message.senderImage
        : partnerImage;

    return (
        <>
            <Swipeable
                ref={swipeableRef}
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={handleSwipeOpen}
                friction={2}
                enableTrackpadTwoFingerGesture
                leftThreshold={40}
                containerStyle={styles.swipeableContainer}
            >
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                    {/* Partner/Member Avatar (LINE style) */}
                    {!isMe && avatarImage && (
                        <TouchableOpacity onPress={handleAvatarPress} style={styles.messageAvatarContainer}>
                            <Image
                                source={{ uri: avatarImage }}
                                style={styles.messageAvatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        </TouchableOpacity>
                    )}

                    {/* Measurement Text Components (hidden, off-screen) for width calculation - Moved outside messageContainer */}
                    {message.replyTo && (
                        <>
                            {/* Measure reply sender name width without constraints */}
                            <Text
                                style={{
                                    position: 'absolute',
                                    left: -9999,
                                    opacity: 0,
                                    fontSize: 11, // replySenderMeと同じ
                                    fontWeight: 'bold',
                                }}
                                onLayout={(e) => {
                                    const width = e.nativeEvent?.layout?.width;
                                    if (width && width > 0) {
                                        setReplySenderWidth(width);
                                    }
                                }}
                            >
                                {message.replyTo.senderName}
                            </Text>
                            {/* Measure reply text width without constraints */}
                            <Text
                                style={{
                                    position: 'absolute',
                                    left: -9999,
                                    opacity: 0,
                                    fontSize: 13, // replyTextMeと同じ
                                }}
                                onLayout={(e) => {
                                    const width = e.nativeEvent?.layout?.width;
                                    if (width && width > 0) {
                                        setReplyTextWidth(width);
                                    }
                                }}
                            >
                                {replyText}
                            </Text>
                        </>
                    )}
                    {/* Measure main message width without constraints */}
                    {message.text && (
                        <Text
                            style={{
                                position: 'absolute',
                                left: -9999,
                                opacity: 0,
                                fontSize: 15, // messageTextMeと同じ
                            }}
                            onLayout={(e) => {
                                const width = e.nativeEvent?.layout?.width;
                                if (width && width > 0) {
                                    setMainMessageWidth(width);
                                }
                            }}
                        >
                            {message.text}
                        </Text>
                    )}

                    <View
                        style={[
                            styles.messageContainer,
                            isMe ? styles.messageContainerMe : styles.messageContainerOther,
                            { maxWidth: dynamicMaxWidth }
                        ]}
                    >

                        {/* Sender name for group chats */}
                        {!isMe && isGroup && message.senderName && (
                            <Text style={styles.senderName}>
                                {message.senderName}
                            </Text>
                        )}

                        <View style={styles.bubbleRow}>
                            {/* Timestamp for my messages (left side) */}
                            {isMe && (
                                <Text style={[styles.timestamp, styles.timestampMe]}>{message.timestamp}</Text>
                            )}

                            {isMe ? (
                                <>
                                    {/* Image only - no bubble */}
                                    {message.image_url && !message.text && !message.replyTo && (
                                        <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                            <Image
                                                source={{ uri: message.image_url }}
                                                style={styles.messageImageMe}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {/* Has text or reply - show bubble */}
                                    {(message.text || message.replyTo) && (
                                        <LinearGradient
                                            colors={['#0d9488', '#2563eb']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[
                                                styles.bubbleGradient,
                                                totalReplyWidth > 0 && { minWidth: totalReplyWidth + 32 } // Add padding (16*2)
                                            ]}
                                        >
                                            {message.replyTo && (
                                                <View style={styles.replyContainerMe}>
                                                    <View style={styles.replyBarMe} />
                                                    <View style={styles.replyContent}>
                                                        <Text style={styles.replySenderMe}>{message.replyTo.senderName}</Text>
                                                        <Text style={styles.replyTextMe}>{replyText}</Text>
                                                    </View>
                                                </View>
                                            )}
                                            {message.image_url && (
                                                <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                    <Image
                                                        source={{ uri: message.image_url }}
                                                        style={styles.messageImageMe}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                    />
                                                </TouchableOpacity>
                                            )}
                                            {message.text ? <Text style={styles.messageTextMe}>{message.text}</Text> : null}
                                        </LinearGradient>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Image only - no bubble */}
                                    {message.image_url && !message.text && !message.replyTo && (
                                        <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                            <Image
                                                source={{ uri: message.image_url }}
                                                style={styles.messageImageOther}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {/* Has text or reply - show bubble */}
                                    {(message.text || message.replyTo) && (
                                        <TouchableOpacity
                                            onLongPress={handleLongPress}
                                            activeOpacity={0.8}
                                        >
                                            <View
                                                style={[
                                                    styles.bubbleOther,
                                                    totalReplyWidth > 0 && { minWidth: totalReplyWidth + 32 } // Add padding (16*2)
                                                ]}
                                            >
                                                {message.replyTo && (
                                                    <View style={styles.replyContainerOther}>
                                                        <View style={styles.replyBarOther} />
                                                        <View style={styles.replyContent}>
                                                            <Text style={styles.replySenderOther}>{message.replyTo.senderName}</Text>
                                                            <Text style={styles.replyTextOther}>{replyText}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {message.image_url && (
                                                    <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                        <Image
                                                            source={{ uri: message.image_url }}
                                                            style={styles.messageImageOther}
                                                            contentFit="cover"
                                                            cachePolicy="memory-disk"
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                                {message.text ? <Text style={styles.messageTextOther}>{message.text}</Text> : null}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

                            {/* Timestamp for partner messages (right side) */}
                            {!isMe && (
                                <Text style={[styles.timestamp, styles.timestampOther]}>{message.timestamp}</Text>
                            )}
                        </View>
                    </View>
                </View>
            </Swipeable>

            {/* Image Viewer Modal */}
            <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.imageModalContainer}>
                    <TouchableOpacity style={styles.imageModalCloseButton} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: message.image_url }}
                        style={styles.fullScreenImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />
                </View>
            </Modal >
        </>
    );
};

export function ChatRoom({ onBack, partnerId, partnerName, partnerImage, onPartnerProfilePress, onMemberProfilePress, isGroup = false, onBlock }: ChatRoomProps) {
    const queryClient = useQueryClient();
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // Get current user ID first
    useEffect(() => {
        const getUserId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
        };
        getUserId();
    }, []);

    // Use Infinite Query hook
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isMessagesLoading
    } = useMessagesInfinite({
        roomId: partnerId,
        userId: currentUserId || '',
        isGroup,
        enabled: !!currentUserId,
    });

    const messages = useMemo(() => {
        return data?.pages.flatMap(page => page.data) || [];
    }, [data]);

    useEffect(() => {
        const markAsRead = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (!isGroup) {
                // For individual chats, update is_read flag
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('receiver_id', user.id)
                    .eq('sender_id', partnerId)
                    .eq('is_read', false);
            } else {
                // For group chats, upsert last read time to database
                await supabase
                    .from('chat_room_read_status')
                    .upsert({
                        user_id: user.id,
                        chat_room_id: partnerId,
                        last_read_at: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,chat_room_id'
                    });
            }

            // Invalidate chat rooms query to update unread count in TalkPage
            if (user.id) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.chatRooms.list(user.id),
                    refetchType: 'active',
                });
            }
        };

        markAsRead();
    }, [partnerId, isGroup]);



    // Create message list with date separators
    // Create message list with date separators (for Inverted List)
    const messageListWithDates = useMemo(() => {
        const items: MessageItem[] = [];

        // messages is [Newest, ..., Oldest]
        messages.forEach((message, index) => {
            // Add message
            items.push({
                type: 'message',
                id: message.id,
                message,
            });

            // Check if next message (older) has different date
            const nextMessage = messages[index + 1];
            if (!nextMessage || nextMessage.date !== message.date) {
                // Date changed or end of list (oldest message)
                // Insert separator for THIS message's date
                items.push({
                    type: 'date',
                    id: `date-${message.date}`,
                    dateLabel: getDateLabel(message.date),
                });
            }
        });

        return items;
    }, [messages]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1, // 最初は高品質で取得、後でリサイズ
        });

        if (!result.canceled) {
            try {
                // 画像をリサイズ・圧縮（最大幅1200px、JPEG 70%品質）
                const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 1200 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                setSelectedImage(manipulated.uri);
            } catch (error) {
                console.error('Image resize error:', error);
                // リサイズに失敗した場合は元の画像を使用
                setSelectedImage(result.assets[0].uri);
            }
        }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || !currentUserId || isSending) return;

        setIsSending(true);
        const content = inputText.trim();
        const imageUri = selectedImage;

        // Reset inputs immediately for UX
        setInputText('');
        setSelectedImage(null);
        setReplyingTo(null);
        // Explicitly clear TextInput
        inputRef.current?.clear();

        try {
            let uploadedImageUrl = null;

            if (imageUri) {
                const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        resolve(xhr.response);
                    };
                    xhr.onerror = function (e) {
                        console.log(e);
                        reject(new TypeError('Network request failed'));
                    };
                    xhr.responseType = 'arraybuffer';
                    xhr.open('GET', imageUri, true);
                    xhr.send(null);
                });

                const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
                const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('chat-images')
                    .upload(fileName, arrayBuffer, {
                        contentType: `image/${fileExt}`,
                        upsert: false,
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-images')
                    .getPublicUrl(fileName);

                uploadedImageUrl = publicUrl;
            }

            const replyData = replyingTo ? {
                id: replyingTo.id,
                text: replyingTo.text || '画像',
                senderName: replyingTo.sender === 'me' ? '自分' : partnerName
            } : null;

            // Optimistic Update
            const tempId = `temp-${Date.now()}`;
            const optimisticMessage: Message = {
                id: tempId,
                text: content,
                image_url: uploadedImageUrl || undefined, // Use uploaded URL if available, or local if we had it (but here we are after upload)
                sender: 'me',
                senderId: currentUserId,
                senderName: '自分',
                timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                replyTo: replyData || undefined,
            };

            const queryKey = queryKeys.messages.list(partnerId);

            queryClient.setQueryData(queryKey, (oldData: any) => {
                if (!oldData || !oldData.pages) {
                    return {
                        pages: [{
                            data: [optimisticMessage],
                            nextCursor: null
                        }],
                        pageParams: [undefined]
                    };
                }

                const firstPage = oldData.pages[0];
                return {
                    ...oldData,
                    pages: [{
                        ...firstPage,
                        data: [optimisticMessage, ...firstPage.data]
                    }, ...oldData.pages.slice(1)]
                };
            });

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: currentUserId,
                    // For group chats, we set receiver_id to sender to satisfy NOT NULL constraint
                    // filtering logic correctly handles this using chat_room_id
                    receiver_id: isGroup ? currentUserId : partnerId,
                    chat_room_id: isGroup ? partnerId : null,
                    content: content,
                    image_url: uploadedImageUrl,
                    reply_to: replyData,
                })
                .select()
                .single();

            if (error) {
                // Rollback on error
                queryClient.setQueryData(queryKey, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;

                    const newPages = oldData.pages.map((page: any) => ({
                        ...page,
                        data: page.data.filter((msg: Message) => msg.id !== tempId)
                    }));

                    return {
                        ...oldData,
                        pages: newPages
                    };
                });
                throw error;
            }

            // Success: Replace temp message with real one
            if (data) {
                const realMessage: Message = {
                    id: data.id,
                    text: data.content,
                    image_url: data.image_url,
                    sender: 'me',
                    senderId: currentUserId,
                    senderName: '自分',
                    timestamp: new Date(data.created_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    date: new Date(data.created_at).toISOString().split('T')[0],
                    created_at: data.created_at,
                    replyTo: replyData || undefined,
                };

                queryClient.setQueryData(queryKey, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;

                    const newPages = oldData.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((msg: Message) =>
                            msg.id === tempId ? realMessage : msg
                        )
                    }));

                    return {
                        ...oldData,
                        pages: newPages
                    };
                });
            }

            if (data) {

                setTimeout(() => {
                    // Scroll to bottom (which is top in inverted list)
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }, 100);

                // Invalidate chat rooms query to update chat list in TalkPage immediately
                if (currentUserId) {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.chatRooms.list(currentUserId),
                        refetchType: 'active',
                    });
                }

                // Send push notification to recipient(s)
                try {
                    if (!isGroup) {
                        // For direct messages, send to the partner
                        const tokens = await getUserPushTokens(partnerId);
                        for (const token of tokens) {
                            await sendPushNotification(
                                token,
                                '新しいメッセージ',
                                content || '画像が送信されました',
                                { type: 'message', senderId: currentUserId }
                            );
                        }
                    }
                    // For group chats, could send to all members (more complex, skipping for now)
                } catch (notifError) {
                    console.log('Push notification error:', notifError);
                }
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            Alert.alert('エラー', `メッセージの送信に失敗しました: ${error.message || error}`);
            // Restore inputs on error
            setInputText(content);
            setSelectedImage(imageUri);
        } finally {
            setIsSending(false);
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        inputRef.current?.focus();
    };

    const renderDateSeparator = (dateLabel: string) => (
        <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{dateLabel}</Text>
            <View style={styles.dateSeparatorLine} />
        </View>
    );

    const renderItem = ({ item }: { item: MessageItem }) => {
        if (item.type === 'date') {
            return renderDateSeparator(item.dateLabel!);
        } else {
            return (
                <MessageBubble
                    message={item.message!}
                    onReply={handleReply}
                    onPartnerProfilePress={onPartnerProfilePress}
                    onMemberProfilePress={onMemberProfilePress}
                    isGroup={isGroup}
                    partnerImage={partnerImage}
                />
            );
        }
    };

    const handleUnmatch = () => {
        Alert.alert(
            'マッチング解除',
            '本当にマッチングを解除しますか？\nこの操作は取り消せません。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '解除する',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!currentUserId) return;

                            // 1. Delete my like (sender = me, receiver = partner)
                            const { error: myError } = await supabase
                                .from('likes')
                                .delete()
                                .eq('sender_id', currentUserId)
                                .eq('receiver_id', partnerId);

                            if (myError) throw myError;

                            // 2. Delete partner's like (sender = partner, receiver = me)
                            // This prevents immediate rematch if I like them again
                            const { error: partnerError } = await supabase
                                .from('likes')
                                .delete()
                                .eq('sender_id', partnerId)
                                .eq('receiver_id', currentUserId);

                            if (partnerError) {
                                console.warn('Could not delete partner like:', partnerError);
                                // Continue anyway, as my like is deleted so match is broken
                            }

                            onBack();
                        } catch (error) {
                            console.error('Error unmatching:', error);
                            Alert.alert('エラー', 'マッチング解除に失敗しました');
                        }
                    }
                }
            ]
        );
    };

    const handleReport = () => {
        Alert.alert('報告', 'このユーザーを運営に報告しますか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '報告する',
                style: 'destructive',
                onPress: async () => {
                    if (!currentUserId) return;
                    try {
                        const { error } = await supabase.from('reports').insert({
                            reporter_id: currentUserId,
                            reported_id: partnerId,
                            reason: 'chat_report',
                            description: 'Reported from chat'
                        });

                        if (error) throw error;
                        Alert.alert('完了', '報告を受け付けました。ご協力ありがとうございます。');
                    } catch (e) {
                        console.error('Report error:', e);
                        Alert.alert('完了', '報告を受け付けました。（送信エラー: ログを確認してください）');
                    }
                }
            }
        ]);
    };

    const handleBlock = () => {
        if (isGroup) {
            Alert.alert('エラー', 'グループチャットでのブロックはサポートされていません');
            return;
        }

        Alert.alert('確認', '本当にこのユーザーをブロックしますか？\nブロックするとお互いに連絡が取れなくなります。', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: 'ブロックする',
                style: 'destructive',
                onPress: async () => {
                    if (!currentUserId) return;
                    try {
                        const { error } = await supabase.from('blocks').insert({
                            blocker_id: currentUserId,
                            blocked_id: partnerId
                        });

                        // Ignore duplicate key error
                        if (error && error.code !== '23505') throw error;

                        Alert.alert('完了', 'ユーザーをブロックしました');
                        onBlock?.();
                        onBack();
                    } catch (error) {
                        console.error('Error blocking:', error);
                        Alert.alert('エラー', 'ブロックに失敗しました');
                    }
                }
            }
        ]);
    };

    const handleMenuPress = () => {
        Alert.alert(
            'メニュー',
            '',
            [
                { text: '相手のプロフィールを見る', onPress: onPartnerProfilePress },
                {
                    text: '報告する',
                    onPress: handleReport
                },
                {
                    text: 'ブロックする',
                    style: 'destructive',
                    onPress: handleBlock
                },
                {
                    text: 'マッチング解除',
                    style: 'destructive',
                    onPress: handleUnmatch
                },
                { text: 'キャンセル', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    if (isMessagesLoading && !data) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#374151" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Image
                            source={{ uri: partnerImage }}
                            style={styles.headerAvatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <Text style={styles.headerName} numberOfLines={2} ellipsizeMode="tail">{partnerName}</Text>
                    </View>

                    <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messageListWithDates}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    inverted={true}
                    onEndReached={() => {
                        if (hasNextPage) fetchNextPage();
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#009688" /> : null}
                />

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    {/* Reply Preview */}
                    {replyingTo && (
                        <View style={styles.replyPreviewBar}>
                            <View style={styles.replyPreviewContent}>
                                <View style={styles.replyPreviewLine} />
                                <View>
                                    <Text style={styles.replyPreviewSender}>
                                        {replyingTo.sender === 'me' ? '自分' : partnerName}への返信
                                    </Text>
                                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                                        {replyingTo.text || '画像'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeReplyButton}>
                                <Ionicons name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Image Preview */}
                    {selectedImage && (
                        <View style={styles.imagePreviewBar}>
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.imagePreview}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.closeImageButton}>
                                <Ionicons name="close-circle" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} disabled={isSending}>
                            <Ionicons name="image-outline" size={24} color="#9ca3af" />
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="メッセージを入力..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                            editable={!isSending}
                        />

                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!inputText.trim() && !selectedImage) || isSending ? styles.sendButtonDisabled : null
                            ]}
                            onPress={handleSend}
                            disabled={(!inputText.trim() && !selectedImage) || isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons
                                    name="send"
                                    size={20}
                                    color={inputText.trim() || selectedImage ? 'white' : '#9ca3af'}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
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
        marginRight: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0, // Allow flex child to shrink
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        backgroundColor: '#e5e7eb',
        flexShrink: 0, // Prevent avatar from shrinking
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        flexShrink: 1, // Allow text to shrink
    },
    menuButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 16,
    },
    dateSeparatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        justifyContent: 'center',
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dateSeparatorText: {
        marginHorizontal: 12,
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    // LINE-style avatar for partner messages
    messageAvatarContainer: {
        marginRight: 8,
        alignSelf: 'flex-start',
    },
    messageAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e5e7eb',
    },
    senderName: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 4,
        marginLeft: 4,
    },
    bubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    timestampMe: {
        marginRight: 6,
        alignSelf: 'flex-end',
    },
    timestampOther: {
        marginLeft: 6,
        alignSelf: 'flex-end',
    },
    messageRow: {
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },
    messageContainer: {
        maxWidth: '75%',
        position: 'relative',
    },
    messageContainerMe: {
        alignItems: 'flex-end',
    },
    messageContainerOther: {
        alignItems: 'flex-start',
    },
    bubbleGradient: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    messageTextMe: {
        color: 'white',
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextOther: {
        color: '#1f2937',
        fontSize: 15,
        lineHeight: 22,
    },
    messageImageMe: {
        width: 200,
        height: 150,
        borderRadius: 12,
        marginBottom: 4,
    },
    messageImageOther: {
        width: 200,
        height: 150,
        borderRadius: 12,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 4,
        marginHorizontal: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    attachButton: {
        padding: 10,
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: '#1f2937',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0d9488',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#e5e7eb',
    },
    // Reply Styles
    replyPreviewBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    replyPreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    replyPreviewLine: {
        width: 4,
        height: 36,
        backgroundColor: '#0d9488',
        borderRadius: 2,
        marginRight: 12,
    },
    replyPreviewSender: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0d9488',
        marginBottom: 2,
    },
    replyPreviewText: {
        fontSize: 14,
        color: '#4B5563',
    },
    closeReplyButton: {
        padding: 8,
    },
    replyContainerMe: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        flexDirection: 'row',
    },
    replyContainerOther: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        flexDirection: 'row',
    },
    replyBarMe: {
        width: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 2,
        marginRight: 8,
    },
    replyBarOther: {
        width: 3,
        backgroundColor: '#0d9488',
        borderRadius: 2,
        marginRight: 8,
    },
    replyContent: {
        flex: 1,
    },
    replySenderMe: {
        fontSize: 11,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 2,
    },
    replySenderOther: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#0d9488',
        marginBottom: 2,
    },
    replyTextMe: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    replyTextOther: {
        fontSize: 13,
        color: '#6B7280',
    },
    swipeableContainer: {
        // Ensure swipeable doesn't mess up layout
    },
    replyActionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        height: '100%',
    },
    // Image Preview Styles
    imagePreviewBar: {
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        position: 'relative',
        alignItems: 'flex-start',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    closeImageButton: {
        position: 'absolute',
        top: 4,
        left: 104,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    // Image Modal Styles
    imageModalContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 10,
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
});


