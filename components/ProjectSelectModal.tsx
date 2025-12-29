import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type SimpleProject = {
  id: string;
  title: string;
  status?: string;
  pendingCount?: number;
};

interface ProjectSelectModalProps {
  visible: boolean;
  onClose: () => void;
  projects: SimpleProject[];
  selectedProjectId: string | null;
  onSelectProject: (project: SimpleProject) => void;
  onClearSelection: () => void;
  title?: string;
  subtitle?: string;
}

/**
 * 探すタブの「絞り込み検索」と同系統のボトムシートUIで、
 * 募集中プロジェクト（= status !== 'closed'）から1件選択するためのモーダル。
 */
export function ProjectSelectModal({
  visible,
  onClose,
  projects,
  selectedProjectId,
  onSelectProject,
  onClearSelection,
  title = '絞り込み',
  subtitle = '募集中のプロジェクトを選択',
}: ProjectSelectModalProps) {
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // 検索はタイトルに対してだけ（軽量）
  const filteredProjects = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return projects;
    return projects.filter(p => p.title.toLowerCase().includes(trimmed));
  }, [projects, search]);

  const selectedTitle = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => p.id === selectedProjectId)?.title ?? null;
  }, [projects, selectedProjectId]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="options" size={20} color="#009688" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedTitle ? `選択中: ${selectedTitle}` : subtitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Search */}
            <View style={styles.section}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="プロジェクト名で検索"
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton} activeOpacity={0.8}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {selectedProjectId && (
                <TouchableOpacity
                  style={styles.clearSelectionButton}
                  onPress={() => {
                    onClearSelection();
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text style={styles.clearSelectionText}>選択を解除</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <View style={styles.section}>
              {filteredProjects.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>該当するプロジェクトがありません</Text>
                  <Text style={styles.emptySubText}>別のキーワードで検索してください</Text>
                </View>
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.projectRow, isSelected && styles.projectRowSelected]}
                      onPress={() => {
                        onSelectProject(p);
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.projectRowLeft}>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'folder-outline'}
                          size={20}
                          color={isSelected ? '#009688' : '#9CA3AF'}
                        />
                        <Text style={[styles.projectTitle, isSelected && styles.projectTitleSelected]} numberOfLines={1}>
                          {p.title}
                        </Text>
                      </View>
                      <View style={styles.projectRowRight}>
                        {!!p.pendingCount && p.pendingCount > 0 && (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>{p.pendingCount}</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Footer spacer (safe area) */}
          <View style={[styles.footerSpacer, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#009688',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  clearSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    gap: 8,
  },
  clearSelectionText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  projectRowSelected: {
    backgroundColor: '#E0F2F1',
    borderColor: '#009688',
  },
  projectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  projectRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectTitle: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  projectTitleSelected: {
    color: '#00695C',
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FF7F11',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
  },
  footerSpacer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});


