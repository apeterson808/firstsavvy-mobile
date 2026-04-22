import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Star, Music, Bed, Trash2, Smile, Gift, Trophy, Sparkles, Plane, ShoppingBag, Heart, Zap, BookOpen, Utensils, Hop as Home, CircleCheck, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Task {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  star_reward: number | null;
}

interface TaskCompletion {
  id: string;
  task_id: string;
  status: string;
  stars_earned: number;
}

interface Reward {
  id: string;
  title: string;
  star_cost: number | null;
  image_url: string | null;
  icon: string | null;
  color: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Music, Bed, Star, Trash2, Smile, Gift, Plane, ShoppingBag,
  Heart, Zap, BookOpen, Utensils, Home, Trophy, Sparkles,
};

function TaskIcon({ name, color, size = 20 }: { name: string | null; color: string | null; size?: number }) {
  const bg = color ?? '#60a5fa';
  const IconComp = name ? (ICON_MAP[name] ?? Star) : Star;
  return (
    <View style={[styles.taskIconWrap, { backgroundColor: bg + '25', borderColor: bg + '40' }]}>
      <IconComp size={size} color={bg} strokeWidth={2} />
    </View>
  );
}

export default function ChildHomeScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { activeChild, setActiveChild, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [childData, setChildData] = useState<{ child_name: string; avatar_url: string | null; stars_balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const pagerRef = useRef<ScrollView>(null);

  const resolvedChildId = childId ?? activeChild?.id;

  useEffect(() => { load(); }, [resolvedChildId]);

  async function load() {
    if (!resolvedChildId) { setLoading(false); return; }
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${supabaseUrl}/functions/v1/get-child-data?childId=${resolvedChildId}`,
      { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
    );
    const json = await res.json();
    setChildData(json.child ?? null);
    setTasks(json.tasks ?? []);
    setCompletions(json.completions ?? []);
    setRewards(json.rewards ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  async function submitCompletion() {
    if (!resolvedChildId || !selectedTask) return;
    setSubmitting(selectedTask.id);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    await fetch(`${supabaseUrl}/functions/v1/get-child-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ childId: resolvedChildId, taskId: selectedTask.id, starsEarned: selectedTask.star_reward ?? 1 }),
    });
    setSubmitting(null);
    setSelectedTask(null);
    load();
  }

  function taskStatus(taskId: string): 'pending' | 'none' {
    const c = completions.find(c => c.task_id === taskId && c.status === 'pending_approval');
    return c ? 'pending' : 'none';
  }

  function onPageScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePage(page);
  }

  function goToPage(page: number) {
    pagerRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setActivePage(page);
  }

  const childName = childData?.child_name ?? activeChild?.child_name ?? 'Explorer';
  const firstName = childName.split(' ')[0];
  const stars = childData?.stars_balance ?? activeChild?.stars_balance ?? 0;
  const avatarUrl = childData?.avatar_url ?? null;

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#f59e0b" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Fixed top section */}
      <View style={styles.fixedTop}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{firstName[0]}</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hi, {firstName}!</Text>
              <Text style={styles.tagline}>Ready to earn some stars?</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setActiveChild(null);
              if (profile) {
                router.replace('/(tabs)/kids');
              } else {
                router.replace('/(auth)/login');
              }
            }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Stars card */}
        <View style={styles.starsCard}>
          <View style={styles.starsCardInner}>
            <Star size={36} color="#f59e0b" fill="#f59e0b" />
            <View>
              <Text style={styles.starsLabel}>YOUR STARS</Text>
              <Text style={styles.starsValue}>{stars}</Text>
            </View>
          </View>
        </View>

        {/* Page dots */}
        <View style={styles.pageDots}>
          <TouchableOpacity onPress={() => goToPage(0)} style={styles.dotWrap}>
            <View style={[styles.dot, activePage === 0 && styles.dotActive]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToPage(1)} style={styles.dotWrap}>
            <View style={[styles.dot, activePage === 1 && styles.dotActive]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal pager */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPageScroll}
        style={styles.pager}
      >
        {/* Page 1: Tasks */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.pageContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionIconWrap}>
                <Trophy size={16} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Your Tasks</Text>
            </View>
          </View>

          <View style={styles.taskList}>
            {tasks.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tasks assigned yet!</Text>
              </View>
            )}
            {tasks.map(task => {
              const status = taskStatus(task.id);
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, status !== 'none' && styles.taskCardDone]}
                  onPress={() => status === 'none' && setSelectedTask(task)}
                  disabled={status !== 'none'}
                  activeOpacity={0.75}
                >
                  <TaskIcon name={task.icon} color={task.color} />
                  <Text style={[styles.taskTitle, status === 'pending' && styles.taskTitleMuted]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <View style={styles.taskRight}>
                    {status === 'pending' && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    )}
                    {status === 'none' && (
                      <View style={styles.starReward}>
                        <Star size={14} color="#f59e0b" strokeWidth={1.5} />
                        <Text style={styles.starRewardText}>{task.star_reward ?? 1}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Page 2: Rewards */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionIconWrap, styles.rewardIconBg]}>
                <Sparkles size={16} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Rewards</Text>
            </View>
          </View>

          <View style={styles.taskList}>
            {rewards.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No rewards yet!</Text>
              </View>
            )}
            {rewards.map(reward => (
              <View key={reward.id} style={styles.taskCard}>
                {reward.image_url ? (
                  <Image source={{ uri: reward.image_url }} style={styles.rewardThumb} />
                ) : (
                  <TaskIcon name={reward.icon} color={reward.color} />
                )}
                <Text style={styles.taskTitle} numberOfLines={1}>{reward.title}</Text>
                <View style={styles.starReward}>
                  <Star size={14} color="#f59e0b" strokeWidth={1.5} />
                  <Text style={styles.starRewardText}>{reward.star_cost ?? '?'}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Task completion modal */}
      <Modal
        visible={!!selectedTask}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTask(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTask(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {/* Close button */}
            <TouchableOpacity style={styles.sheetClose} onPress={() => setSelectedTask(null)}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Task icon */}
            <View style={[
              styles.modalIconWrap,
              { backgroundColor: (selectedTask?.color ?? '#60a5fa') + '20', borderColor: (selectedTask?.color ?? '#60a5fa') + '40' }
            ]}>
              {(() => {
                const IconComp = selectedTask?.icon ? (ICON_MAP[selectedTask.icon] ?? Star) : Star;
                return <IconComp size={36} color={selectedTask?.color ?? '#60a5fa'} strokeWidth={1.5} />;
              })()}
            </View>

            <Text style={styles.modalTaskTitle}>{selectedTask?.title}</Text>
            <Text style={styles.modalSubtitle}>Complete this task to earn stars!</Text>

            {/* Stars reward pill */}
            <View style={styles.modalStarsPill}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.modalStarsText}>
                {selectedTask?.star_reward ?? 1} {(selectedTask?.star_reward ?? 1) === 1 ? 'star' : 'stars'}
              </Text>
            </View>

            <Text style={styles.modalNote}>
              Your parent will review and approve your submission.
            </Text>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting === selectedTask?.id && styles.submitBtnDisabled]}
              onPress={submitCompletion}
              disabled={!!submitting}
              activeOpacity={0.85}
            >
              {submitting === selectedTask?.id ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <CircleCheck size={20} color="#000" strokeWidth={2.5} />
                  <Text style={styles.submitBtnText}>Submit for Approval</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedTask(null)}>
              <Text style={styles.cancelBtnText}>Not yet</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1117' },

  fixedTop: { paddingHorizontal: 16, paddingTop: 4 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#f59e0b' },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1e3a5f', borderWidth: 2, borderColor: '#f59e0b',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#f59e0b' },
  headerText: { flex: 1 },
  greeting: { fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#f1f5f9', lineHeight: 26 },
  tagline: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginTop: 1 },
  logoutBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1,
    borderColor: '#334155', backgroundColor: '#1e293b',
  },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#94a3b8' },

  // Stars card
  starsCard: {
    borderRadius: 18, marginBottom: 14, overflow: 'hidden',
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#f59e0b40',
  },
  starsCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, backgroundColor: 'rgba(245,158,11,0.08)',
  },
  starsLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#f59e0b',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  starsValue: { fontFamily: 'Nunito-ExtraBold', fontSize: 44, color: '#f59e0b', lineHeight: 52 },

  // Page dots
  pageDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 14 },
  dotWrap: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  dotActive: { backgroundColor: '#f59e0b', width: 24 },

  // Pager
  pager: { flex: 1 },
  pageContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
  },
  rewardIconBg: { backgroundColor: '#0d6b3e' },
  sectionTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 18, color: '#f1f5f9' },


  // Task list
  taskList: { gap: 8 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#131c2e', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#1e293b',
  },
  taskCardDone: { opacity: 0.55 },
  taskIconWrap: {
    width: 42, height: 42, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  taskTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#e2e8f0', flex: 1 },
  taskTitleMuted: { color: '#475569' },
  taskRight: { flexShrink: 0 },
  starReward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starRewardText: { fontFamily: 'Nunito-ExtraBold', fontSize: 15, color: '#f59e0b' },
  pendingBadge: {
    backgroundColor: '#1c1a0e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  pendingBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f59e0b' },
  rewardThumb: { width: 42, height: 42, borderRadius: 10 },
  emptyCard: {
    backgroundColor: '#131c2e', borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#131c2e',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', marginBottom: 20,
  },
  sheetClose: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  modalTaskTitle: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 24, color: '#f1f5f9',
    textAlign: 'center', marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b',
    textAlign: 'center', marginBottom: 20,
  },
  modalStarsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#f59e0b40',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 40,
    marginBottom: 20,
  },
  modalStarsText: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#f59e0b',
  },
  modalNote: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569',
    textAlign: 'center', marginBottom: 28, paddingHorizontal: 16,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Nunito-ExtraBold', fontSize: 17, color: '#000' },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#475569' },
});
