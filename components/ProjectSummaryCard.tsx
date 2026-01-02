import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getImageSource } from '../constants/DefaultImages';
import { FONTS } from '../constants/DesignSystem';
import { getThemeTagColor, getThemeTagTextColor, getThemeEmoji, getThemeOptionByTitle } from '../constants/ThemeConstants';

type ProjectLike = {
  id?: string;
  title?: string;
  tagline?: string | null;
  created_at?: string | null;
  deadline?: string | null;
  cover_image?: string | null;
  tags?: string[] | null;
  content_tags?: string[] | null;
  pendingCount?: number | null;
  applicantCount?: number | null;
};

export type ProjectSummaryCardProps = {
  project: ProjectLike;
  ownerName?: string;
  ownerImage?: string | null;
  onPress: () => void;
  containerStyle?: ViewStyle;
  overlay?: React.ReactNode; // 右上バッジ等
};

const formatCreatedDate = (createdAt?: string | null) => {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  // 未来日付などはフォールバックで絶対日付表示
  if (diffMs < 0) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}/${m}/${day}`;
  }

  const HOUR = 1000 * 60 * 60;
  const DAY = HOUR * 24;

  // 24時間前より短い → （時間）前
  if (diffMs < DAY) {
    const hours = Math.max(1, Math.floor(diffMs / HOUR));
    return `${hours}時間前`;
  }

  // 1ヶ月前より短い → （日数）前（= 同じ月）
  const nowMonthKey = now.getFullYear() * 12 + now.getMonth();
  const createdMonthKey = d.getFullYear() * 12 + d.getMonth();
  const monthDiff = nowMonthKey - createdMonthKey;
  if (monthDiff === 0) {
    const days = Math.max(1, Math.floor(diffMs / DAY));
    return `${days}日前`;
  }

  // 10ヶ月前より短い → （月数）前
  if (monthDiff > 0 && monthDiff < 10) {
    return `${monthDiff}ヶ月前`;
  }

  // それ以上 → 年/月/日（現在通り）
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
};

const formatDeadline = (deadline?: string | null) => {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}まで`;
};

export function ProjectSummaryCard({
  project,
  ownerName,
  ownerImage,
  onPress,
  containerStyle,
  overlay,
}: ProjectSummaryCardProps) {
  const coverImage = project?.cover_image;
  const headline = (project?.tagline || '').trim() || (project?.title || '');
  const createdDateText = formatCreatedDate(project?.created_at);
  const deadlineText = formatDeadline(project?.deadline);
  const themeTag = project?.tags?.[0] || '';
  const contentTags = (project?.content_tags || []).filter(Boolean) as string[];
  const applicantCount = typeof project?.applicantCount === 'number' ? project.applicantCount : 0;

  // Zennスタイル: カバー画像がない場合はテーマに応じた絵文字を表示
  const themeOption = getThemeOptionByTitle(themeTag);
  const themeEmoji = getThemeEmoji(themeTag);
  const themeBgColor = themeOption?.bgColor || '#F3F4F6';

  return (
    <TouchableOpacity
      style={[styles.card, containerStyle]}
      onPress={onPress}
      activeOpacity={0.88}
    >


      {/* 上段 */}
      <View style={styles.topSection}>
        <View style={[styles.thumbnail, !coverImage && { backgroundColor: themeBgColor }]}>
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={styles.thumbnailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Text style={styles.emojiDisplay}>{themeEmoji}</Text>
          )}
        </View>

        <View style={styles.topRight}>
          <View style={styles.topUpper}>
            <Text style={styles.headline} numberOfLines={2}>
              {headline}
            </Text>

            {!!project?.tagline && !!project?.title && (
              <Text style={styles.projectTitle} numberOfLines={1}>
                {project.title}
              </Text>
            )}

            <View style={styles.metaRow}>
              <Image source={getImageSource(ownerImage || undefined)} style={styles.ownerAvatar} />
              <Text style={styles.ownerName} numberOfLines={1}>
                {ownerName || '不明'}
              </Text>
              {!!createdDateText && (
                <Text style={styles.createdAt} numberOfLines={1}>
                  {createdDateText}
                </Text>
              )}
              {!!deadlineText && (
                <View style={styles.deadlineBadge}>
                  <Ionicons name="calendar-outline" size={10} color="#EF4444" />
                  <Text style={styles.deadlineText}>{deadlineText}</Text>
                </View>
              )}
              {/* ステータスバッジ（日時横へ移動） */}
              {!!overlay && <View style={styles.statusBadgeContainer}>{overlay}</View>}
            </View>
          </View>
        </View>
      </View>

      {/* 下段: タグ */}
      <View style={styles.bottomSection}>
        <View style={styles.bottomRow}>
          {/* テーマタグは固定表示 */}
          <View style={styles.tagsLeftArea}>
            {!!themeTag && (
              <View style={[styles.themeTag, { backgroundColor: getThemeTagColor(themeTag) }]}>
                <Text style={[styles.themeTagText, { color: getThemeTagTextColor(themeTag) }]}>
                  {themeTag}
                </Text>
              </View>
            )}

            {/* 内容タグは省略表示（スクロールさせない） */}
            <View style={styles.contentTagsContainer}>
              {contentTags.slice(0, 4).map((tag, idx) => (
                <View key={`${project?.id || 'project'}:content:${idx}`} style={styles.contentTag}>
                  <Text style={styles.contentTagText} numberOfLines={1}>{tag}</Text>
                </View>
              ))}
              {contentTags.length > 4 && (
                <Text style={styles.moreTagsDots}>...</Text>
              )}
            </View>
          </View>

          {/* 右端固定: 参加申請数 */}
          <View style={styles.pendingCountBox}>
            <Ionicons name="thumbs-up" size={14} color="#9CA3AF" />
            <Text style={styles.pendingCountText}>{applicantCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadgeContainer: {
    marginLeft: 'auto', // 右寄せ
  },
  topSection: {
    flexDirection: 'row',
    height: 108, // TalkPage の projectTopSection と同じ
  },
  thumbnail: {
    width: 108, // TalkPage の projectCardThumbnail と同じ
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  emojiDisplay: {
    fontSize: 48,
    textAlign: 'center',
  },
  topRight: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  topUpper: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 0,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: FONTS.bold,
    color: '#111827',
  },
  projectTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
  },
  ownerName: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
  createdAt: {
    flexShrink: 0,
    marginLeft: 6,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deadlineText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: '#EF4444',
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tagsLeftArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contentTagsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  moreTagsDots: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
    marginLeft: -2,
  },
  pendingCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
  },
  pendingCountText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
  },
  themeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  themeTagText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  contentTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  contentTagText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
});


