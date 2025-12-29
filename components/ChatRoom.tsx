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
    Dimensions,
    Image,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../data/queryKeys';

import { useMessagesInfinite } from '../data/hooks/useMessagesInfinite';
import { Message } from '../data/api/messages';
import { ChatImagePickerModal } from './ChatImagePickerModal';

interface MessageItem {
    type: 'date' | 'message' | 'imageBatch';
    id: string;
    dateLabel?: string; // For date separators
    message?: Message; // For actual messages
    messages?: Message[]; // For image batches
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
    projectId?: string; // For group chats, the project ID
    onViewProjectDetail?: (projectId: string) => void; // Callback to view project detail
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

// Cache aspect ratios to avoid repeated Image.getSize calls while scrolling.
const imageAspectRatioCache = new Map<string, number>();

function useImageAspectRatio(uri?: string) {
    const [aspectRatio, setAspectRatio] = useState<number | null>(() => {
        if (!uri) return null;
        return imageAspectRatioCache.get(uri) ?? null;
    });

    useEffect(() => {
        if (!uri) {
            setAspectRatio(null);
            return;
        }

        const cached = imageAspectRatioCache.get(uri);
        if (cached) {
            setAspectRatio(cached);
            return;
        }

        let cancelled = false;
        Image.getSize(
            uri,
            (width, height) => {
                if (cancelled) return;
                if (!width || !height) return;
                const r = width / height;
                imageAspectRatioCache.set(uri, r);
                setAspectRatio(r);
            },
            () => {
                // If we can't read size (e.g., temporary URL), fall back to a sane default.
                if (!cancelled) setAspectRatio(null);
            }
        );

        return () => {
            cancelled = true;
        };
    }, [uri]);

    return aspectRatio;
}

const isPureImageMessage = (m: Message) => {
    const text = (m.text ?? '').trim();
    return !!m.image_url && text.length === 0 && !m.replyTo;
};

const parseTimeMs = (iso?: string) => {
    if (!iso) return NaN;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : NaN;
};

const getBatchKeyFromImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null;
    try {
        const u = new URL(imageUrl);
        const path = decodeURIComponent(u.pathname);
        const m = path.match(/\/batches\/([^/]+)\//);
        return m?.[1] ?? null;
    } catch {
        // If it's not an absolute URL (e.g. file://), try a simple match
        const m = imageUrl.match(/\/batches\/([^/]+)\//);
        return m?.[1] ?? null;
    }
};

const ImageBatchBubble = ({
    messages,
    onPartnerProfilePress,
    onMemberProfilePress,
    isGroup,
    partnerImage,
}: {
    messages: Message[];
    onPartnerProfilePress: () => void;
    onMemberProfilePress?: (memberId: string) => void;
    isGroup?: boolean;
    partnerImage?: string;
}) => {
    const first = messages[0];
    const isMe = first.sender === 'me';
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [modalUri, setModalUri] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;
    const gridWidth = screenWidth * 0.64;
    const gap = 6;
    const cellWidth = (gridWidth - gap) / 2;
    const cellHeight = cellWidth * 0.95; // 長方形（少し縦長に）

    const uris = messages.map(m => m.image_url).filter((u): u is string => !!u);
    const isOddLastWide = uris.length % 2 === 1;

    const handleAvatarPress = () => {
        if (isGroup && first.senderId && onMemberProfilePress) {
            onMemberProfilePress(first.senderId);
        } else {
            onPartnerProfilePress();
        }
    };

    const avatarImage = isGroup && first.senderImage
        ? first.senderImage
        : partnerImage;

    return (
        <>
            <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                {!isMe && avatarImage && (
                    <TouchableOpacity onPress={handleAvatarPress} style={styles.messageAvatarContainer}>
                        <Image source={{ uri: avatarImage }} style={styles.messageAvatar} />
                    </TouchableOpacity>
                )}

                <View style={[styles.messageContainer, isMe ? styles.messageContainerMe : styles.messageContainerOther]}>
                    <View style={styles.bubbleRow}>
                        {isMe && (
                            <Text style={[styles.timestamp, styles.timestampMe]}>{first.timestamp}</Text>
                        )}

                        <View style={[styles.imageBatchGrid, { width: gridWidth }]}>
                            {uris.map((uri, idx) => (
                                // 奇数枚の最後は2枚分の幅（横長）で表示
                                (() => {
                                    const isLast = idx === uris.length - 1;
                                    const isWide = isOddLastWide && isLast;
                                    const width = isWide ? gridWidth : cellWidth;
                                    const height = cellHeight;
                                    const marginRight = isWide ? 0 : (idx % 2 === 0 ? gap : 0);
                                    const marginBottom = gap;
                                    return (
                                <TouchableOpacity
                                    key={`${uri}-${idx}`}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        setModalUri(uri);
                                        setImageModalVisible(true);
                                    }}
                                    style={[
                                        styles.imageBatchCell,
                                        { width, height, marginRight, marginBottom }
                                    ]}
                                >
                                    <Image source={{ uri }} style={styles.imageBatchImage} resizeMode="cover" />
                                </TouchableOpacity>
                                    );
                                })()
                            ))}
                        </View>

                        {!isMe && (
                            <Text style={[styles.timestamp, styles.timestampOther]}>{first.timestamp}</Text>
                        )}
                    </View>
                </View>
            </View>

            <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.imageModalContainer}>
                    <TouchableOpacity style={styles.imageModalCloseButton} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {modalUri ? (
                        <Image
                            source={{ uri: modalUri }}
                            resizeMode="contain"
                            style={styles.fullScreenImage}
                        />
                    ) : null}
                </View>
            </Modal>
        </>
    );
};

// Message Bubble Component with Swipeable
const MessageBubble = ({
    message,
    onReply,
    onPartnerProfilePress,
    onMemberProfilePress,
    isGroup,
    partnerImage,
    onScrollToReply
}: {
    message: Message,
    onReply: (msg: Message) => void,
    onPartnerProfilePress: () => void,
    onMemberProfilePress?: (memberId: string) => void,
    isGroup?: boolean,
    partnerImage?: string,
    onScrollToReply?: (replyToId: string) => void
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
    const maxImageWidth = screenWidth * 0.6;
    const maxImageHeight = screenWidth * 0.7;

    const imageUri = message.image_url;
    const imageAspectRatio = useImageAspectRatio(imageUri);
    const fittedImageSize = useMemo(() => {
        const r = imageAspectRatio ?? (4 / 3);
        let width = maxImageWidth;
        let height = width / r;
        if (height > maxImageHeight) {
            height = maxImageHeight;
            width = height * r;
        }
        return { width, height };
    }, [imageAspectRatio, maxImageWidth, maxImageHeight]);

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

    const renderRightActions = (_progress: any, dragX: any) => {
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
                renderRightActions={renderRightActions}
                onSwipeableOpen={handleSwipeOpen}
                friction={2}
                enableTrackpadTwoFingerGesture
                rightThreshold={40}
                containerStyle={styles.swipeableContainer}
            >
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                    {/* Partner/Member Avatar (LINE style) */}
                    {!isMe && avatarImage && (
                        <TouchableOpacity onPress={handleAvatarPress} style={styles.messageAvatarContainer}>
                            <Image
                                source={{ uri: avatarImage }}
                                style={styles.messageAvatar}
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
                                                resizeMode="contain"
                                                style={[styles.messageImageMe, { width: fittedImageSize.width, height: fittedImageSize.height }]}
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
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (message.replyTo?.id && onScrollToReply) {
                                                            onScrollToReply(message.replyTo.id);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.replyContainerMe}>
                                                        <View style={styles.replyBarMe} />
                                                        <View style={styles.replyContent}>
                                                            <Text style={styles.replySenderMe}>{message.replyTo.senderName}</Text>
                                                            <Text style={styles.replyTextMe}>{replyText}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                            {message.image_url && (
                                                <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                    <Image
                                                        source={{ uri: message.image_url }}
                                                        resizeMode="contain"
                                                        style={[styles.messageImageMe, { width: fittedImageSize.width, height: fittedImageSize.height }]}
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
                                                resizeMode="contain"
                                                style={[styles.messageImageOther, { width: fittedImageSize.width, height: fittedImageSize.height }]}
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
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            if (message.replyTo?.id && onScrollToReply) {
                                                                onScrollToReply(message.replyTo.id);
                                                            }
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.replyContainerOther}>
                                                            <View style={styles.replyBarOther} />
                                                            <View style={styles.replyContent}>
                                                                <Text style={styles.replySenderOther}>{message.replyTo.senderName}</Text>
                                                                <Text style={styles.replyTextOther}>{replyText}</Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                {message.image_url && (
                                                    <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                        <Image
                                                            source={{ uri: message.image_url }}
                                                            resizeMode="contain"
                                                            style={[styles.messageImageOther, { width: fittedImageSize.width, height: fittedImageSize.height }]}
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
                        resizeMode="contain"
                        style={styles.fullScreenImage}
                    />
                </View>
            </Modal >
        </>
    );
};

export function ChatRoom({ onBack, partnerId, partnerName, partnerImage, onPartnerProfilePress, onMemberProfilePress, isGroup = false, onBlock, projectId, onViewProjectDetail }: ChatRoomProps) {
    const queryClient = useQueryClient();
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);
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

    // Create message list with date separators (for Inverted List)
    const messageListWithDates = useMemo(() => {
        const items: MessageItem[] = [];

        // messages is [Newest, ..., Oldest]
        let i = 0;
        while (i < messages.length) {
            const m = messages[i];

            // Group consecutive pure-image messages from same sender within a short window
            if (isPureImageMessage(m)) {
                const batchKey = getBatchKeyFromImageUrl(m.image_url);
                const group: Message[] = [m];
                let j = i + 1;
                const maxGapMs = 5_000; // レガシー画像の推定まとめ（短めにして誤結合を防ぐ）
                while (j < messages.length) {
                    const n = messages[j];
                    if (!isPureImageMessage(n)) break;
                    if (n.sender !== m.sender) break;
                    if ((n.senderId ?? '') !== (m.senderId ?? '')) break;
                    if ((n.date ?? '') !== (m.date ?? '')) break;

                    // New behavior: if URLs include a batch key, only group within the same batch.
                    if (batchKey) {
                        const nextKey = getBatchKeyFromImageUrl(n.image_url);
                        if (nextKey !== batchKey) break;
                    } else {
                    const prevTime = parseTimeMs(group[group.length - 1].created_at);
                    const nextTime = parseTimeMs(n.created_at);
                    if (Number.isFinite(prevTime) && Number.isFinite(nextTime)) {
                        const gap = Math.abs(prevTime - nextTime);
                        if (gap > maxGapMs) break;
                    }
                    }

                    group.push(n);
                    j++;
                    if (group.length >= 10) break; // UI負荷対策
                }

                if (group.length >= 2) {
                    items.push({
                        type: 'imageBatch',
                        id: batchKey ? `image-batch-${batchKey}` : `image-batch-${group[0].id}`,
                        messages: group,
                    });
                } else {
                    items.push({
                        type: 'message',
                        id: m.id,
                        message: m,
                    });
                }

                const lastProcessed = group[group.length - 1];
                const nextMessage = messages[j];
                if (!nextMessage || nextMessage.date !== lastProcessed.date) {
                    items.push({
                        type: 'date',
                        id: `date-${lastProcessed.date}`,
                        dateLabel: getDateLabel(lastProcessed.date),
                    });
                }

                i = j;
                continue;
            }

            items.push({
                type: 'message',
                id: m.id,
                message: m,
            });

            const nextMessage = messages[i + 1];
            if (!nextMessage || nextMessage.date !== m.date) {
                items.push({
                    type: 'date',
                    id: `date-${m.date}`,
                    dateLabel: getDateLabel(m.date),
                });
            }
            i++;
        }

        return items;
    }, [messages]);

    const handlePickImage = async () => {
        setImagePickerVisible(true);
    };

    const handleSend = async () => {
        if ((!inputText.trim() && selectedImages.length === 0) || !currentUserId || isSending) return;

        setIsSending(true);
        const content = inputText.trim();
        const imagesToSend = [...selectedImages];
        let sentCount = 0;

        // Reset inputs immediately for UX
        setInputText('');
        setSelectedImages([]);
        setReplyingTo(null);
        // Explicitly clear TextInput
        inputRef.current?.clear();

        try {
            const replyData = replyingTo ? {
                id: replyingTo.id,
                text: replyingTo.text || '画像',
                senderName: replyingTo.sender === 'me' ? '自分' : partnerName
            } : null;

            const queryKey = queryKeys.messages.list(partnerId);

            const sendOne = async ({
                messageText,
                imageUri,
                reply,
                batchId,
            }: {
                messageText: string;
                imageUri?: string;
                reply: typeof replyData;
                batchId?: string;
            }) => {
                let uploadedImageUrl: string | null = null;

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
                    const safeExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
                    const fileName = batchId
                        ? `${currentUserId}/batches/${batchId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`
                        : `${currentUserId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

                    const contentType = safeExt === 'jpg' ? 'image/jpeg' : `image/${safeExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('chat-images')
                        .upload(fileName, arrayBuffer, {
                            contentType,
                            upsert: false,
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('chat-images')
                        .getPublicUrl(fileName);

                    uploadedImageUrl = publicUrl;
                }

                // Optimistic Update
                const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                const nowIso = new Date().toISOString();
                const optimisticMessage: Message = {
                    id: tempId,
                    text: messageText,
                    image_url: uploadedImageUrl || undefined,
                    sender: 'me',
                    senderId: currentUserId,
                    senderName: '自分',
                    timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                    date: nowIso.split('T')[0],
                    created_at: nowIso,
                    replyTo: reply || undefined,
                };

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

                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }, 100);

                const { data, error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: currentUserId,
                        receiver_id: isGroup ? currentUserId : partnerId,
                        chat_room_id: isGroup ? partnerId : null,
                        content: messageText,
                        image_url: uploadedImageUrl,
                        reply_to: reply,
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
                        replyTo: reply || undefined,
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
            };

            if (imagesToSend.length > 0) {
                // 選択順に送信（awaitで順番を保証）
                // 画像+テキストの場合は「画像→テキスト」の順（テキストは最後に別メッセージで送信）
                const batchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                for (let i = 0; i < imagesToSend.length; i++) {
                    const imageUri = imagesToSend[i];
                    const messageText = '';
                    // 画像のみ（テキスト無し）の場合は最初の画像に返信情報を付与（従来互換）
                    const reply = !content && i === 0 ? replyData : null;
                    await sendOne({ messageText, imageUri, reply, batchId });
                    sentCount++;
                }

                // テキストがある場合は最後に送る（画像と同じメッセージにまとめない）
                if (content) {
                    await sendOne({ messageText: content, reply: replyData });
                }
            } else {
                // テキストのみ
                await sendOne({ messageText: content, reply: replyData });
            }

            // Invalidate chat rooms query once to update chat list in TalkPage immediately
            if (currentUserId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.chatRooms.list(currentUserId),
                    refetchType: 'active',
                });
            }

            // Send push notification once (direct messages only)
            try {
                if (!isGroup) {
                    const tokens = await getUserPushTokens(partnerId);
                    const body = content
                        ? content
                        : (imagesToSend.length > 0 ? '画像が送信されました' : 'メッセージが送信されました');
                    for (const token of tokens) {
                        await sendPushNotification(
                            token,
                            '新しいメッセージ',
                            body,
                            { type: 'message', senderId: currentUserId }
                        );
                    }
                }
            } catch (notifError) {
                console.log('Push notification error:', notifError);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            Alert.alert('エラー', `メッセージの送信に失敗しました: ${error.message || error}`);
            // Restore inputs on error
            setInputText(content);
            // 途中まで送れている可能性があるので、未送信分だけ戻す
            setSelectedImages(imagesToSend.slice(sentCount));
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

    // Handle scroll to reply message
    const handleScrollToReply = (replyToId: string) => {
        const index = messageListWithDates.findIndex(
            item =>
                (item.type === 'message' && item.message?.id === replyToId) ||
                (item.type === 'imageBatch' && item.messages?.some(m => m.id === replyToId))
        );
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5 // Center the item
            });
            // Haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const renderItem = ({ item }: { item: MessageItem }) => {
        if (item.type === 'date') {
            return renderDateSeparator(item.dateLabel!);
        } else if (item.type === 'imageBatch') {
            return (
                <ImageBatchBubble
                    messages={item.messages!}
                    onPartnerProfilePress={onPartnerProfilePress}
                    onMemberProfilePress={onMemberProfilePress}
                    isGroup={isGroup}
                    partnerImage={partnerImage}
                />
            );
        } else {
            return (
                <MessageBubble
                    message={item.message!}
                    onReply={handleReply}
                    onPartnerProfilePress={onPartnerProfilePress}
                    onMemberProfilePress={onMemberProfilePress}
                    isGroup={isGroup}
                    partnerImage={partnerImage}
                    onScrollToReply={handleScrollToReply}
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
                            details: 'Reported from chat'
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

                        // ブロック成功: 関連するキャッシュを無効化して自動更新
                        queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
                        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
                        queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.all });
                        queryClient.invalidateQueries({ queryKey: queryKeys.receivedLikes.all });

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
        if (isGroup) {
            // Group chat menu - simplified
            Alert.alert(
                'メニュー',
                '',
                [
                    {
                        text: 'プロジェクト詳細を見る',
                        onPress: () => {
                            if (projectId && onViewProjectDetail) {
                                onViewProjectDetail(projectId);
                            }
                        }
                    },
                    { text: 'キャンセル', style: 'cancel' },
                ],
                { cancelable: true }
            );
        } else {
            // Individual chat menu
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
        }
    };

    if (isMessagesLoading && !data) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    // Handle swipe back gesture (like LINE)
    const handleSwipeBack = (event: any) => {
        const { nativeEvent } = event;
        if (nativeEvent.state === State.END) {
            // If swiped right more than 80px with sufficient velocity
            if (nativeEvent.translationX > 80) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBack();
            }
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PanGestureHandler
                onHandlerStateChange={handleSwipeBack}
                activeOffsetX={[-1000, 20]} // Activate when moved 20px right
                failOffsetY={[-15, 15]} // Fail for vertical swipes
            >
                <View style={{ flex: 1 }}>
                    <SafeAreaView style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={28} color="#374151" />
                            </TouchableOpacity>

                            {/* Header Info - Tappable for group chats to view project detail */}
                            {isGroup && projectId && onViewProjectDetail ? (
                                <TouchableOpacity
                                    style={styles.headerInfo}
                                    onPress={() => onViewProjectDetail(projectId)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: partnerImage }}
                                        style={styles.headerAvatar}
                                    />
                                    <Text style={styles.headerName} numberOfLines={2} ellipsizeMode="tail">{partnerName}</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.headerInfo}>
                                    <Image
                                        source={{ uri: partnerImage }}
                                        style={styles.headerAvatar}
                                    />
                                    <Text style={styles.headerName} numberOfLines={2} ellipsizeMode="tail">{partnerName}</Text>
                                </View>
                            )}

                            <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
                                <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages List */}
                        <FlatList
                            style={{ backgroundColor: '#F5F5F5' }}
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
                            onScrollToIndexFailed={(info) => {
                                // If scroll fails, wait and retry
                                setTimeout(() => {
                                    flatListRef.current?.scrollToIndex({
                                        index: info.index,
                                        animated: true,
                                        viewPosition: 0.5
                                    });
                                }, 100);
                            }}
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
                            {selectedImages.length > 0 && (
                                <View style={styles.imagePreviewBar}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.imagePreviewList}
                                    >
                                        {selectedImages.map((uri, idx) => (
                                            <View key={`${uri}-${idx}`} style={styles.imagePreviewItem}>
                                                <Image
                                                    source={{ uri }}
                                                    style={styles.imagePreview}
                                                />
                                                <View style={styles.imagePreviewIndexBadge}>
                                                    <Text style={styles.imagePreviewIndexText}>{idx + 1}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedImages(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    style={styles.closeImageButton}
                                                >
                                                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
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
                                        (!inputText.trim() && selectedImages.length === 0) || isSending ? styles.sendButtonDisabled : null
                                    ]}
                                    onPress={handleSend}
                                    disabled={(!inputText.trim() && selectedImages.length === 0) || isSending}
                                >
                                    {isSending ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Ionicons
                                            name="send"
                                            size={20}
                                            color={inputText.trim() || selectedImages.length > 0 ? 'white' : '#9ca3af'}
                                        />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </View>
            </PanGestureHandler>

            <ChatImagePickerModal
                visible={imagePickerVisible}
                maxSelection={10}
                onClose={() => setImagePickerVisible(false)}
                onConfirm={(pickedUris) => {
                    setSelectedImages(prev => {
                        const combined = [...prev, ...pickedUris];
                        const unique = combined.filter((u, idx) => combined.indexOf(u) === idx);
                        return unique.slice(0, 10);
                    });
                    setImagePickerVisible(false);
                }}
            />

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
        borderRadius: 12,
        marginBottom: 4,
    },
    messageImageOther: {
        borderRadius: 12,
        marginBottom: 4,
    },
    imageBatchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
    },
    imageBatchCell: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
    },
    imageBatchImage: {
        width: '100%',
        height: '100%',
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
    },
    imagePreviewList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    imagePreviewItem: {
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    imagePreviewIndexBadge: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    imagePreviewIndexText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
    closeImageButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(255,255,255,0.95)',
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


