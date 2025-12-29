import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  maxSelection?: number;
  onClose: () => void;
  onConfirm: (uris: string[]) => void; // file://... URIs in selection order
};

export function ChatImagePickerModal({ visible, maxSelection = 10, onClose, onConfirm }: Props) {
  const [permissionStatus, setPermissionStatus] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    selectedIds.forEach((id, idx) => m.set(id, idx + 1));
    return m;
  }, [selectedIds]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    const init = async () => {
      setIsLoading(true);
      try {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (cancelled) return;
        setPermissionStatus(perm.status);

        if (perm.status !== 'granted') {
          setAssets([]);
          setAfter(undefined);
          setHasNextPage(false);
          return;
        }

        const page = await MediaLibrary.getAssetsAsync({
          mediaType: ['photo'],
          sortBy: [MediaLibrary.SortBy.creationTime],
          first: 60,
        });
        if (cancelled) return;
        setAssets(page.assets);
        setAfter(page.endCursor ?? undefined);
        setHasNextPage(page.hasNextPage);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const loadMore = async () => {
    if (isLoading) return;
    if (!hasNextPage) return;
    if (!after) return;
    if (permissionStatus !== 'granted') return;

    setIsLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 60,
        after,
      });
      setAssets(prev => [...prev, ...page.assets]);
      setAfter(page.endCursor ?? undefined);
      setHasNextPage(page.hasNextPage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const existingIndex = prev.indexOf(id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        return next;
      }
      if (prev.length >= maxSelection) return prev;
      return [...prev, id];
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const uris: string[] = [];
      for (const id of selectedIds) {
        const info = await MediaLibrary.getAssetInfoAsync(id);
        const uri = info.localUri ?? info.uri;
        if (uri) uris.push(uri);
      }
      onConfirm(uris);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const order = selectedIndexMap.get(item.id);
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => toggleSelect(item.id)} style={styles.thumbWrap}>
        <ExpoImage source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
        {order ? (
          <View style={styles.orderBadge}>
            <Text style={styles.orderText}>{order}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>写真を選択（{selectedIds.length}/{maxSelection}）</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selectedIds.length === 0 || isLoading}
            style={[styles.headerButton, (selectedIds.length === 0 || isLoading) && styles.headerButtonDisabled]}
          >
            <Text style={[styles.headerButtonText, (selectedIds.length === 0 || isLoading) && styles.headerButtonTextDisabled]}>完了</Text>
          </TouchableOpacity>
        </View>

        {permissionStatus === 'denied' ? (
          <View style={styles.center}>
            <Ionicons name="images-outline" size={32} color="#9ca3af" />
            <Text style={styles.permissionText}>写真へのアクセスが許可されていません</Text>
            <Text style={styles.permissionSubText}>端末設定から写真アクセスを許可してください。</Text>
          </View>
        ) : (
          <FlatList
            data={assets}
            renderItem={renderItem}
            keyExtractor={(a) => a.id}
            numColumns={3}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading ? <ActivityIndicator style={{ padding: 12 }} /> : null}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerButtonTextDisabled: {
    color: '#9ca3af',
  },
  thumbWrap: {
    width: '33.3333%',
    aspectRatio: 1,
    padding: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  orderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    marginTop: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionSubText: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});


