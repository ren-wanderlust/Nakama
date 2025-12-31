import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Modal,
    Dimensions,
    Image,
    ScrollView,
    Pressable,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../data/queryKeys';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessagesInfinite } from '../data/hooks/useMessagesInfinite';
import { Message } from '../data/api/messages';
import { ChatImagePickerModal } from './ChatImagePickerModal';
import LinkifyIt from 'linkify-it';

const linkify = new LinkifyIt();

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

const SEARCH_BAR_HEIGHT = 58;

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

async function getChatMutedStatus(params: { userId: string; type: 'dm' | 'group'; targetId: string }): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('chat_notification_settings')
            .select('muted')
            .eq('user_id', params.userId)
            .eq('type', params.type)
            .eq('target_id', params.targetId)
            .maybeSingle();
        if (error) throw error;
        return !!data?.muted;
    } catch (e) {
        console.log('Error fetching muted status:', e);
        return false;
    }
}

async function setChatMutedStatus(params: { userId: string; type: 'dm' | 'group'; targetId: string; muted: boolean }): Promise<void> {
    try {
        const { error } = await supabase
            .from('chat_notification_settings')
            .upsert({
                user_id: params.userId,
                type: params.type,
                target_id: params.targetId,
                muted: params.muted,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,type,target_id' });
        if (error) throw error;
    } catch (e) {
        console.log('Error saving muted status:', e);
    }
}

async function getTeamChatMemberIds(params: { chatRoomId: string; projectId?: string }): Promise<string[]> {
    try {
        let pid = params.projectId;
        if (!pid) {
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select('project_id')
                .eq('id', params.chatRoomId)
                .single();
            if (roomError) throw roomError;
            pid = room?.project_id;
        }
        if (!pid) return [];

        const [{ data: project, error: projectError }, { data: apps, error: appsError }] = await Promise.all([
            supabase.from('projects').select('owner_id').eq('id', pid).single(),
            supabase
                .from('project_applications')
                .select('user_id')
                .eq('project_id', pid)
                .eq('status', 'approved'),
        ]);

        if (projectError) throw projectError;
        if (appsError) throw appsError;

        const ids = [
            project?.owner_id,
            ...(apps ?? []).map((a: any) => a.user_id),
        ].filter((x): x is string => !!x);

        return Array.from(new Set(ids));
    } catch (e) {
        console.log('Error fetching team chat member ids:', e);
        return [];
    }
}

const ImageBatchBubble = ({
    messages,
    onReply,
    onPartnerProfilePress,
    onMemberProfilePress,
    isGroup,
    partnerImage,
}: {
    messages: Message[];
    onReply: (msg: Message) => void;
    onPartnerProfilePress: () => void;
    onMemberProfilePress?: (memberId: string) => void;
    isGroup?: boolean;
    partnerImage?: string;
}) => {
    const first = messages[0];
    const isMe = first.sender === 'me';
    const swipeableRef = useRef<any>(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [modalUri, setModalUri] = useState<string | null>(null);
    const anchorRef = useRef<View>(null);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [actionMenuAnchor, setActionMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

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

    const renderRightActions = (_progress: any, _dragX: any) => {
        return (
            <View style={styles.replyActionContainer}>
                <Ionicons name="arrow-undo" size={24} color="#0d9488" />
            </View>
        );
    };

    const handleSwipeOpen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReply(first);
        swipeableRef.current?.close();
    };

    const openActionMenu = () => {
        if (!anchorRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        anchorRef.current.measureInWindow((x, y, width, height) => {
            setActionMenuAnchor({ x, y, width, height });
            setActionMenuVisible(true);
        });
    };

    const closeActionMenu = () => {
        setActionMenuVisible(false);
    };

    const canCopyText = !!(first.text && first.text.trim().length > 0);

    return (
        <>
            {/* Long-press action menu (LINE-style) */}
            {actionMenuVisible && actionMenuAnchor && (
                <Modal
                    transparent
                    visible={actionMenuVisible}
                    onRequestClose={closeActionMenu}
                    animationType="fade"
                >
                    <Pressable style={styles.actionMenuBackdrop} onPress={closeActionMenu}>
                        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                            {(() => {
                                const { width: screenW, height: screenH } = Dimensions.get('window');
                                const MENU_W = 190;
                                const MENU_H = 94;
                                const PAD = 12;
                                const cx = actionMenuAnchor.x + actionMenuAnchor.width / 2;
                                const showAbove = actionMenuAnchor.y > MENU_H + 24;
                                const left = Math.max(PAD, Math.min(cx - MENU_W / 2, screenW - MENU_W - PAD));
                                const top = showAbove
                                    ? Math.max(PAD, actionMenuAnchor.y - MENU_H - 14)
                                    : Math.min(screenH - MENU_H - PAD, actionMenuAnchor.y + actionMenuAnchor.height + 14);

                                return (
                                    <>
                                        <View style={[styles.actionMenuPanel, { top, left, width: MENU_W }]}>
                                            <Pressable
                                                style={[styles.actionMenuButton, !canCopyText && styles.actionMenuButtonDisabled]}
                                                onPress={async () => {
                                                    if (!canCopyText) return;
                                                    closeActionMenu();
                                                    try {
                                                        await Clipboard.setStringAsync(first.text ?? '');
                                                    } catch (e) {
                                                        console.log('Failed to copy:', e);
                                                    }
                                                }}
                                            >
                                                <Ionicons
                                                    name="copy-outline"
                                                    size={24}
                                                    color={canCopyText ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                                                />
                                                <Text style={[styles.actionMenuLabel, !canCopyText && styles.actionMenuLabelDisabled]}>
                                                    テキストをコピー
                                                </Text>
                                            </Pressable>

                                            <View style={styles.actionMenuDivider} />

                                            <Pressable
                                                style={styles.actionMenuButton}
                                                onPress={() => {
                                                    closeActionMenu();
                                                    onReply(first);
                                                }}
                                            >
                                                <Ionicons name="arrow-undo" size={24} color="#FFFFFF" />
                                                <Text style={styles.actionMenuLabel}>リプライ</Text>
                                            </Pressable>
                                        </View>
                                    </>
                                );
                            })()}
                        </View>
                    </Pressable>
                </Modal>
            )}

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
                    {!isMe && avatarImage && (
                        <TouchableOpacity onPress={handleAvatarPress} style={styles.messageAvatarContainer}>
                            <Image source={{ uri: avatarImage }} style={styles.messageAvatar} />
                        </TouchableOpacity>
                    )}

                    <Pressable onLongPress={openActionMenu} delayLongPress={250}>
                        <View
                            ref={anchorRef}
                            collapsable={false}
                            style={[styles.messageContainer, isMe ? styles.messageContainerMe : styles.messageContainerOther]}
                        >
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
                                    {actionMenuVisible && (
                                        <View pointerEvents="none" style={styles.longPressOverlay} />
                                    )}
                                </View>

                                {!isMe && (
                                    <Text style={[styles.timestamp, styles.timestampOther]}>{first.timestamp}</Text>
                                )}
                            </View>
                        </View>
                    </Pressable>
                </View>
            </Swipeable>

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
    onScrollToReply,
    highlightQuery,
    replySenderNameById,
    replySenderImageById,
    currentUserName,
    currentUserImage,
}: {
    message: Message,
    onReply: (msg: Message) => void,
    onPartnerProfilePress: () => void,
    onMemberProfilePress?: (memberId: string) => void,
    isGroup?: boolean,
    partnerImage?: string,
    onScrollToReply?: (replyToId: string) => void,
    highlightQuery?: string,
    replySenderNameById?: Map<string, string>,
    replySenderImageById?: Map<string, string>,
    currentUserName?: string,
    currentUserImage?: string
}) => {
    if (message.isSystem) {
        return (
            <View style={styles.systemMessageContainer}>
                <Text style={styles.systemMessageTime}>{message.timestamp}</Text>
                <View style={styles.systemMessageBubble}>
                    <Text style={styles.systemMessageText}>{message.text}</Text>
                </View>
            </View>
        );
    }

    const isMe = message.sender === 'me';
    const swipeableRef = useRef<any>(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const anchorRef = useRef<View>(null);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [actionMenuAnchor, setActionMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    // For reply messages: track widths of each element to determine max width
    const [replySenderWidth, setReplySenderWidth] = useState(0);
    const [replyTextWidth, setReplyTextWidth] = useState(0);
    const [mainMessageWidth, setMainMessageWidth] = useState(0);
    const [twentyCharWidth, setTwentyCharWidth] = useState(0);

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

    const replyText = message.replyTo?.text ? message.replyTo.text : '';
    const replyImageUri = message.replyTo?.image_url ?? null;
    const resolvedReplySenderName = useMemo(() => {
        const id = message.replyTo?.id;
        if (!id) return message.replyTo?.senderName ?? '';
        const fromMap = replySenderNameById?.get(id);
        const name = fromMap ?? message.replyTo?.senderName ?? '';
        // Eliminate legacy "自分" placeholder in reply payloads
        if (name === '自分') return currentUserName ?? '';
        return name;
    }, [message.replyTo?.id, message.replyTo?.senderName, replySenderNameById]);
    const resolvedReplySenderImage = useMemo(() => {
        const id = message.replyTo?.id;
        if (!id) return null;
        return replySenderImageById?.get(id) ?? null;
    }, [message.replyTo?.id, replySenderImageById]);
    const bubbleMaxWidth = Math.min(
        // 20文字分のテキスト幅 + バブル左右パディング(16*2)
        (twentyCharWidth > 0 ? twentyCharWidth + 32 : defaultMaxWidth),
        defaultMaxWidth
    );

    const richTextNodes = useMemo(() => {
        const text = message.text ?? '';
        const q = (highlightQuery ?? '').trim();
        const matches = linkify.match(text) ?? [];
        const parts: Array<{ type: 'text'; text: string } | { type: 'url'; text: string; url: string }> = [];
        let cursor = 0;
        for (const m of matches) {
            const start = m.index;
            const end = m.lastIndex;
            if (start > cursor) parts.push({ type: 'text', text: text.slice(cursor, start) });
            const rawText = text.slice(start, end);
            parts.push({ type: 'url', text: rawText, url: m.url });
            cursor = end;
        }
        if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });

        const linkStyle = isMe ? styles.messageLinkMe : styles.messageLinkOther;

        const highlightText = (chunk: string) => {
            if (!q) return [<Text key="t">{chunk}</Text>];
            if (!chunk) return [<Text key="t">{chunk}</Text>];
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const segs = chunk.split(new RegExp(`(${escaped})`, 'g'));
            return segs.map((seg, idx) => {
                if (seg === q) {
                    return <Text key={`h-${idx}`} style={styles.searchHighlight}>{seg}</Text>;
                }
                return <Text key={`t-${idx}`}>{seg}</Text>;
            });
        };

        return (
            <Text style={isMe ? styles.messageTextMe : styles.messageTextOther}>
                {parts.map((p, idx) => {
                    if (p.type === 'url') {
                        return (
                            <Text
                                key={`u-${idx}`}
                                style={linkStyle}
                                onPress={async () => {
                                    const url = p.url.trim();
                                    if (!/^https?:\/\//i.test(url)) return;
                                    try {
                                        const ok = await Linking.canOpenURL(url);
                                        if (!ok) {
                                            Alert.alert('エラー', 'リンクを開けませんでした');
                                            return;
                                        }
                                        await Linking.openURL(url);
                                    } catch (e) {
                                        console.log('Failed to open url:', e);
                                        Alert.alert('エラー', 'リンクを開けませんでした');
                                    }
                                }}
                                suppressHighlighting={false}
                            >
                                {highlightText(p.text)}
                            </Text>
                        );
                    }
                    return <Text key={`p-${idx}`}>{highlightText(p.text)}</Text>;
                })}
            </Text>
        );
    }, [message.text, highlightQuery, isMe]);

    // Calculate max width from reply elements and main message
    // replyContainerOverhead = Padding(8*2) + Bar(3) + Margin(8) = 27
    const replyContainerOverhead = 27;
    // Add buffer (+4) to prevent unnatural line breaks due to rendering differences
    // If reply is an image, ensure the bubble width is at least the thumbnail width (44).
    const replyBodyWidth = replyImageUri ? 44 : replyTextWidth;
    const replyContentWidth = Math.max(replySenderWidth, replyBodyWidth) + 4;
    const totalReplyWidth = message.replyTo ? replyContentWidth + replyContainerOverhead : 0;

    // Message container max width stays normal; bubble itself is capped to 20-char width.
    const dynamicMaxWidth = defaultMaxWidth;

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

    const openActionMenu = () => {
        if (!anchorRef.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Android needs collapsable={false} on the measured view
        anchorRef.current.measureInWindow((x, y, width, height) => {
            setActionMenuAnchor({ x, y, width, height });
            setActionMenuVisible(true);
        });
    };

    const closeActionMenu = () => {
        setActionMenuVisible(false);
    };

    const canCopyText = !!(message.text && message.text.trim().length > 0);

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
            {/* Long-press action menu (LINE-style) */}
            {actionMenuVisible && actionMenuAnchor && (
                <Modal
                    transparent
                    visible={actionMenuVisible}
                    onRequestClose={closeActionMenu}
                    animationType="fade"
                >
                    <Pressable style={styles.actionMenuBackdrop} onPress={closeActionMenu}>
                        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                            {(() => {
                                const { width: screenW, height: screenH } = Dimensions.get('window');
                                const MENU_W = 190;
                                const MENU_H = 94;
                                const PAD = 12;
                                const cx = actionMenuAnchor.x + actionMenuAnchor.width / 2;
                                const showAbove = actionMenuAnchor.y > MENU_H + 24;
                                const left = Math.max(PAD, Math.min(cx - MENU_W / 2, screenW - MENU_W - PAD));
                                const top = showAbove
                                    ? Math.max(PAD, actionMenuAnchor.y - MENU_H - 14)
                                    : Math.min(screenH - MENU_H - PAD, actionMenuAnchor.y + actionMenuAnchor.height + 14);

                                return (
                                    <>
                                        <View style={[styles.actionMenuPanel, { top, left, width: MENU_W }]}>
                                            <Pressable
                                                style={[styles.actionMenuButton, !canCopyText && styles.actionMenuButtonDisabled]}
                                                onPress={async () => {
                                                    if (!canCopyText) return;
                                                    closeActionMenu();
                                                    try {
                                                        await Clipboard.setStringAsync(message.text ?? '');
                                                    } catch (e) {
                                                        console.log('Failed to copy:', e);
                                                    }
                                                }}
                                            >
                                                <Ionicons
                                                    name="copy-outline"
                                                    size={24}
                                                    color={canCopyText ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                                                />
                                                <Text style={[styles.actionMenuLabel, !canCopyText && styles.actionMenuLabelDisabled]}>
                                                    テキストをコピー
                                                </Text>
                                            </Pressable>

                                            <View style={styles.actionMenuDivider} />

                                            <Pressable
                                                style={styles.actionMenuButton}
                                                onPress={() => {
                                                    closeActionMenu();
                                                    onReply(message);
                                                }}
                                            >
                                                <Ionicons name="arrow-undo" size={24} color="#FFFFFF" />
                                                <Text style={styles.actionMenuLabel}>リプライ</Text>
                                            </Pressable>
                                        </View>
                                    </>
                                );
                            })()}
                        </View>
                    </Pressable>
                </Modal>
            )}

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
                    {/* Measure "20 chars" width to cap bubble width (no forced wrapping) */}
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
                                // Avoid jittery updates while scrolling
                                if (Math.abs(width - twentyCharWidth) > 0.5) setTwentyCharWidth(width);
                            }
                        }}
                    >
                        {'あ'.repeat(20)}
                    </Text>
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

                    <Pressable onLongPress={openActionMenu} delayLongPress={250}>
                        <View
                            ref={anchorRef}
                            collapsable={false}
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
                                                <View style={{ position: 'relative' }}>
                                                    <Image
                                                        source={{ uri: message.image_url }}
                                                        resizeMode="contain"
                                                        style={[styles.messageImageMe, { width: fittedImageSize.width, height: fittedImageSize.height }]}
                                                    />
                                                    {actionMenuVisible && (
                                                        <View pointerEvents="none" style={styles.longPressOverlay} />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        {/* Has text or reply - show bubble */}
                                        {(message.text || message.replyTo) && (
                                            <LinearGradient
                                                // 自分の吹き出しは「探す/いいね」系のトーンを保ちつつ、少しオレンジ寄りに
                                                colors={['#FFE7C2', '#FFE7C2']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[
                                                    styles.bubbleGradient,
                                                    { maxWidth: bubbleMaxWidth },
                                                    totalReplyWidth > 0 && { minWidth: Math.min(totalReplyWidth + 32, bubbleMaxWidth) } // cap to bubble max width
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
                                                            <View style={styles.replyContent}>
                                                                <View style={styles.replySenderRow}>
                                                                    {!!resolvedReplySenderImage && (
                                                                        <Image
                                                                            source={{ uri: resolvedReplySenderImage }}
                                                                            style={styles.replySenderAvatar}
                                                                        />
                                                                    )}
                                                                    <Text style={styles.replySenderMe}>{resolvedReplySenderName}</Text>
                                                                </View>
                                                                {replyImageUri ? (
                                                                    <Image
                                                                        source={{ uri: replyImageUri }}
                                                                        style={styles.replyImageThumb}
                                                                        resizeMode="cover"
                                                                    />
                                                                ) : (
                                                                    <Text style={styles.replyTextMe} numberOfLines={3} ellipsizeMode="tail">
                                                                        {replyText || ' '}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                {message.image_url && (
                                                    <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                        <View style={{ position: 'relative' }}>
                                                            <Image
                                                                source={{ uri: message.image_url }}
                                                                resizeMode="contain"
                                                                style={[styles.messageImageMe, { width: fittedImageSize.width, height: fittedImageSize.height }]}
                                                            />
                                                            {actionMenuVisible && (
                                                                <View pointerEvents="none" style={styles.longPressOverlay} />
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                {message.text ? richTextNodes : null}
                                                {actionMenuVisible && (
                                                    <View pointerEvents="none" style={styles.longPressOverlay} />
                                                )}
                                            </LinearGradient>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Image only - no bubble */}
                                        {message.image_url && !message.text && !message.replyTo && (
                                            <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                <View style={{ position: 'relative' }}>
                                                    <Image
                                                        source={{ uri: message.image_url }}
                                                        resizeMode="contain"
                                                        style={[styles.messageImageOther, { width: fittedImageSize.width, height: fittedImageSize.height }]}
                                                    />
                                                    {actionMenuVisible && (
                                                        <View pointerEvents="none" style={styles.longPressOverlay} />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        {/* Has text or reply - show bubble */}
                                        {(message.text || message.replyTo) && (
                                            <View
                                                style={[
                                                    styles.bubbleOther,
                                                    { maxWidth: bubbleMaxWidth },
                                                    totalReplyWidth > 0 && { minWidth: Math.min(totalReplyWidth + 32, bubbleMaxWidth) } // cap to bubble max width
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
                                                            <View style={styles.replyContent}>
                                                                <View style={styles.replySenderRow}>
                                                                    {!!resolvedReplySenderImage && (
                                                                        <Image
                                                                            source={{ uri: resolvedReplySenderImage }}
                                                                            style={styles.replySenderAvatar}
                                                                        />
                                                                    )}
                                                                    <Text style={styles.replySenderOther}>{resolvedReplySenderName}</Text>
                                                                </View>
                                                                {replyImageUri ? (
                                                                    <Image
                                                                        source={{ uri: replyImageUri }}
                                                                        style={styles.replyImageThumb}
                                                                        resizeMode="cover"
                                                                    />
                                                                ) : (
                                                                    <Text style={styles.replyTextOther} numberOfLines={3} ellipsizeMode="tail">
                                                                        {replyText || ' '}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                {message.image_url && (
                                                    <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                                        <View style={{ position: 'relative' }}>
                                                            <Image
                                                                source={{ uri: message.image_url }}
                                                                resizeMode="contain"
                                                                style={[styles.messageImageOther, { width: fittedImageSize.width, height: fittedImageSize.height }]}
                                                            />
                                                            {actionMenuVisible && (
                                                                <View pointerEvents="none" style={styles.longPressOverlay} />
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                {message.text ? richTextNodes : null}
                                                {actionMenuVisible && (
                                                    <View pointerEvents="none" style={styles.longPressOverlay} />
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}

                                {/* Timestamp for partner messages (right side) */}
                                {!isMe && (
                                    <Text style={[styles.timestamp, styles.timestampOther]}>{message.timestamp}</Text>
                                )}
                            </View>
                        </View>
                    </Pressable>
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
    const insets = useSafeAreaInsets();
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserImage, setCurrentUserImage] = useState<string>('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatMuted, setIsChatMuted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const searchInputRef = useRef<TextInput>(null);

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

    // Fetch current user's display name (used to avoid "自分" placeholder everywhere)
    useEffect(() => {
        if (!currentUserId) return;
        const fetchMyName = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('name,image')
                .eq('id', currentUserId)
                .single();
            if (error) return;
            setCurrentUserName((data?.name ?? '').trim());
            setCurrentUserImage((data?.image ?? '').trim());
        };
        fetchMyName();
    }, [currentUserId]);

    // Load muted status for this chat (per user)
    useEffect(() => {
        if (!currentUserId) return;
        const type: 'dm' | 'group' = isGroup ? 'group' : 'dm';
        const targetId = partnerId;
        getChatMutedStatus({ userId: currentUserId, type, targetId }).then(setIsChatMuted);
    }, [currentUserId, isGroup, partnerId]);

    // (Menu modal uses native slide-up animation)

    // Track keyboard height so we can keep the message list bottom aligned to the search bar.
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const listContentStyle = useMemo(() => {
        // NOTE: FlatList is inverted, so paddingTop acts as "bottom padding" visually.
        const basePadding = 16;
        // Search bar sits above keyboard. When keyboard is hidden, add safe area padding; when shown, keep it tight (no gap).
        const searchBarBottomPad = keyboardHeight > 0 ? 0 : insets.bottom;
        const reserve = isSearchMode ? keyboardHeight + SEARCH_BAR_HEIGHT + searchBarBottomPad : 0;
        return [styles.listContent, { paddingTop: basePadding + reserve }];
    }, [isSearchMode, keyboardHeight, insets.bottom]);

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

    // For group chats, partnerName is the project title, not a user name.
    // Build a lookup so reply previews can always show the original sender name.
    const senderNameByMessageId = useMemo(() => {
        const m = new Map<string, string>();
        for (const msg of messages) {
            const raw = msg.senderName ?? '';
            const name =
                raw && raw !== '自分'
                    ? raw
                    : (msg.sender === 'me'
                        ? (currentUserName || raw)
                        : (!isGroup ? partnerName : raw));
            if (name) m.set(msg.id, name);
        }
        return m;
    }, [messages, currentUserName, isGroup, partnerName]);

    const senderImageByMessageId = useMemo(() => {
        const m = new Map<string, string>();
        for (const msg of messages) {
            const uri =
                (msg.sender === 'me'
                    ? (currentUserImage || msg.senderImage || '')
                    : (msg.senderImage || (!isGroup ? (partnerImage ?? '') : ''))).trim();
            if (uri) m.set(msg.id, uri);
        }
        return m;
    }, [messages, currentUserImage, partnerImage, isGroup]);

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
                // Always show the original sender's name (including myself). Never use "自分".
                senderName:
                    (replyingTo.senderName && replyingTo.senderName !== '自分')
                        ? replyingTo.senderName
                        : (replyingTo.sender === 'me'
                            ? (currentUserName || replyingTo.senderName || '不明')
                            : ((!isGroup ? partnerName : replyingTo.senderName) || '不明')),
                image_url: replyingTo.image_url ?? null,
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
                    senderName: currentUserName || '不明',
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
                        senderName: currentUserName || '不明',
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
                    // If recipient muted this DM (their target_id is sender_id), don't send.
                    const muted = await getChatMutedStatus({ userId: partnerId, type: 'dm', targetId: currentUserId });
                    if (muted) return;
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
                } else {
                    // Team chat: notify all members except myself
                    const memberIds = await getTeamChatMemberIds({ chatRoomId: partnerId, projectId });
                    const recipients = memberIds.filter(id => id !== currentUserId);
                    if (recipients.length === 0) return;

                    const body = content
                        ? content
                        : (imagesToSend.length > 0 ? '画像が送信されました' : 'メッセージが送信されました');

                    // Exclude users who muted this group chat
                    let mutedUserIds: string[] = [];
                    try {
                        const { data, error } = await supabase
                            .from('chat_notification_settings')
                            .select('user_id')
                            .eq('type', 'group')
                            .eq('target_id', partnerId)
                            .in('user_id', recipients)
                            .eq('muted', true);
                        if (!error) mutedUserIds = (data ?? []).map((r: any) => r.user_id);
                    } catch { }

                    for (const userId of recipients.filter(id => !mutedUserIds.includes(id))) {
                        const tokens = await getUserPushTokens(userId);
                        for (const token of tokens) {
                            await sendPushNotification(
                                token,
                                partnerName || '新しいメッセージ',
                                body,
                                { type: 'message', senderId: currentUserId, chatRoomId: partnerId, isGroup: true }
                            );
                        }
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

    const scrollToMessageId = (messageId: string, opts?: { preferAboveSearchBar?: boolean }) => {
        const index = messageListWithDates.findIndex(
            item =>
                (item.type === 'message' && item.message?.id === messageId) ||
                (item.type === 'imageBatch' && item.messages?.some(m => m.id === messageId))
        );
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index,
                animated: true,
                // Keep the target message well above the keyboard/search bar when searching
                viewPosition: opts?.preferAboveSearchBar ? 0.7 : 0.4
            });
        }
    };

    const searchMatches = useMemo(() => {
        const q = searchQuery.trim();
        if (!q) return [];
        return messages
            .filter(m => (m.text ?? '').includes(q))
            .map(m => m.id);
    }, [messages, searchQuery]);

    useEffect(() => {
        setActiveMatchIndex(0);
    }, [searchQuery]);

    const renderItem = ({ item }: { item: MessageItem }) => {
        if (item.type === 'date') {
            return renderDateSeparator(item.dateLabel!);
        } else if (item.type === 'imageBatch') {
            return (
                <ImageBatchBubble
                    messages={item.messages!}
                    onReply={handleReply}
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
                    highlightQuery={isSearchMode ? searchQuery.trim() : ''}
                    replySenderNameById={senderNameByMessageId}
                    replySenderImageById={senderImageByMessageId}
                    currentUserName={currentUserName}
                    currentUserImage={currentUserImage}
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
        // Deprecated
    };

    const openSearchMode = () => {
        setIsSearchMode(true);
        // Focus after modal close animation
        setTimeout(() => searchInputRef.current?.focus(), 250);
    };

    const closeSearchMode = () => {
        setIsSearchMode(false);
        setSearchQuery('');
        setActiveMatchIndex(0);
    };

    const toggleMute = async () => {
        if (!currentUserId) return;
        const next = !isChatMuted;
        setIsChatMuted(next);
        const type: 'dm' | 'group' = isGroup ? 'group' : 'dm';
        await setChatMutedStatus({ userId: currentUserId, type, targetId: partnerId, muted: next });
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
                        {/* Fixed chat background (prevents watermark from shifting when keyboard/layout changes) */}
                        {isGroup && (
                            <View pointerEvents="none" style={styles.teamChatBackgroundLayer}>
                                <Image
                                    source={require('../assets/pogg_logo_orange_icon.png')}
                                    style={styles.teamChatWatermark}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                        {/* Header */}
                        <View style={styles.header}>
                            {isSearchMode ? (
                                <View style={styles.searchModeBar}>
                                    <TextInput
                                        ref={searchInputRef}
                                        style={styles.searchModeInput}
                                        placeholder="検索..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        returnKeyType="search"
                                        onSubmitEditing={() => {
                                            if (searchMatches.length > 0) {
                                                scrollToMessageId(searchMatches[0], { preferAboveSearchBar: true });
                                                setActiveMatchIndex(0);
                                            }
                                        }}
                                    />
                                    <Text style={styles.searchModeCount}>
                                        {searchQuery.trim()
                                            ? `${searchMatches.length === 0 ? 0 : (activeMatchIndex + 1)}/${searchMatches.length}`
                                            : ''}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.searchModeNavBtn, searchMatches.length === 0 && styles.searchModeNavBtnDisabled]}
                                        disabled={searchMatches.length === 0}
                                        onPress={() => {
                                            const n = searchMatches.length;
                                            if (n === 0) return;
                                            const next = (activeMatchIndex - 1 + n) % n;
                                            setActiveMatchIndex(next);
                                            scrollToMessageId(searchMatches[next], { preferAboveSearchBar: true });
                                        }}
                                    >
                                        <Ionicons name="chevron-up" size={18} color="#111827" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.searchModeNavBtn, searchMatches.length === 0 && styles.searchModeNavBtnDisabled]}
                                        disabled={searchMatches.length === 0}
                                        onPress={() => {
                                            const n = searchMatches.length;
                                            if (n === 0) return;
                                            const next = (activeMatchIndex + 1) % n;
                                            setActiveMatchIndex(next);
                                            scrollToMessageId(searchMatches[next], { preferAboveSearchBar: true });
                                        }}
                                    >
                                        <Ionicons name="chevron-down" size={18} color="#111827" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.searchModeCloseBtn} onPress={closeSearchMode}>
                                        <Ionicons name="close" size={20} color="#374151" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
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

                                    <View style={styles.headerRightArea}>
                                        <TouchableOpacity onPress={toggleMute} style={styles.headerIconButton}>
                                            <Ionicons
                                                name={isChatMuted ? 'notifications-off-outline' : 'notifications-outline'}
                                                size={24}
                                                color={isChatMuted ? '#9ca3af' : '#374151'}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={openSearchMode} style={styles.headerIconButton}>
                                            <Ionicons name="search-outline" size={24} color="#374151" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Messages List */}
                        <View
                            style={[
                                styles.messagesArea,
                                isGroup && styles.teamMessagesArea,
                                // No extra padding here; reserve space via FlatList contentContainerStyle to avoid unscrollable blank area.
                            ]}
                        >
                            <FlatList
                                style={[styles.messagesList, isGroup && { backgroundColor: 'transparent' }]}
                                ref={flatListRef}
                                data={messageListWithDates}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={listContentStyle as any}
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
                        </View>

                        {/* Input Area */}
                        {!isSearchMode && (
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                            >
                                {/* Reply Preview */}
                                {replyingTo && (
                                    <View style={styles.replyPreviewBar}>
                                        <View style={styles.replyPreviewContent}>
                                            <View>
                                                <View style={styles.replyPreviewSenderRow}>
                                                    {!!(replyingTo.sender === 'me' ? currentUserImage : replyingTo.senderImage) && (
                                                        <Image
                                                            source={{ uri: replyingTo.sender === 'me' ? currentUserImage : (replyingTo.senderImage as string) }}
                                                            style={styles.replyPreviewSenderAvatar}
                                                        />
                                                    )}
                                                    <Text style={styles.replyPreviewSender}>
                                                        {((replyingTo.senderName && replyingTo.senderName !== '自分')
                                                            ? replyingTo.senderName
                                                            : (replyingTo.sender === 'me'
                                                                ? (currentUserName || replyingTo.senderName || '不明')
                                                                : ((!isGroup ? partnerName : replyingTo.senderName) || '不明')))}への返信
                                                    </Text>
                                                </View>
                                                {replyingTo.image_url ? (
                                                    <Image
                                                        source={{ uri: replyingTo.image_url }}
                                                        style={styles.replyPreviewThumb}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                                                        {replyingTo.text || ' '}
                                                    </Text>
                                                )}
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
                        )}
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
        minHeight: 60, // Ensure minimum height consistency
    },
    messagesArea: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    teamMessagesArea: {
        backgroundColor: 'transparent',
    },
    messagesList: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    teamChatBackgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamChatWatermark: {
        width: 180,
        height: 180,
        opacity: 0.3,
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
        lineHeight: 20, // Explicit line height for calculations
    },
    headerRightArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Added gap for spacing between icons
    },
    headerIconButton: {
        padding: 4,
    },
    // Removed unused menu and bottom sheet styles
    // Removed unused searchModeBarWrapper and fixed positioning styles
    searchModeBar: {
        flex: 1, // Take full width in header
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // Removed borders/padding that conflicted with header container
    },
    searchModeInput: {
        flex: 1,
        height: 36,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 18, // More rounded for header style
        paddingHorizontal: 12,
        paddingVertical: 0, // Essential for text centering on Android/iOS within fixed height
        backgroundColor: '#f9fafb',
        color: '#111827',
        fontSize: 14,
    },
    searchModeCount: {
        minWidth: 40,
        textAlign: 'center', // Center align
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    searchModeNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    searchModeNavBtnDisabled: {
        opacity: 0.4,
    },
    searchModeCloseBtn: {
        padding: 4,
        marginLeft: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 16,
    },
    searchHighlight: {
        backgroundColor: '#FFF176', // 蛍光っぽい黄色
        color: '#111827',
        fontWeight: '700',
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
    systemMessageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        paddingHorizontal: 16,
    },
    systemMessageTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 6,
        fontWeight: '500',
    },
    systemMessageBubble: {
        backgroundColor: '#BDBDBD',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxWidth: '100%',
    },
    systemMessageText: {
        fontSize: 13,
        color: 'white',
        textAlign: 'center',
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
        color: '#111827',
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextOther: {
        color: '#1f2937',
        fontSize: 15,
        lineHeight: 22,
    },
    messageLinkMe: {
        color: '#007AFF',
        textDecorationLine: 'underline',
        fontWeight: 'normal',
    },
    messageLinkOther: {
        color: '#007AFF',
        textDecorationLine: 'underline',
        fontWeight: 'normal',
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
    actionMenuBackdrop: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    actionMenuPanel: {
        position: 'absolute',
        flexDirection: 'column',
        backgroundColor: 'rgba(17,24,39,0.95)',
        borderRadius: 18,
        overflow: 'hidden',
    },
    actionMenuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    actionMenuButtonDisabled: {
        opacity: 0.6,
    },
    actionMenuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    actionMenuLabel: {
        marginLeft: 10,
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    actionMenuLabelDisabled: {
        color: 'rgba(255,255,255,0.45)',
    },
    longPressOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 14,
    },
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
    replyPreviewSenderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    replyPreviewSenderAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#e5e7eb',
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
    replyPreviewThumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginTop: 6,
        backgroundColor: '#e5e7eb',
    },
    closeReplyButton: {
        padding: 8,
    },
    replyContainerMe: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    replyContainerOther: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    replySenderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    replySenderAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
    },
    replyContent: {
        flex: 1,
    },
    replyImageThumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginTop: 6,
        backgroundColor: '#e5e7eb',
    },
    replySenderMe: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#111827',
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
        color: '#4B5563',
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


