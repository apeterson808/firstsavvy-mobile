import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Clock,
  CircleCheck,
  CircleX,
  Pencil,
  Trash2,
  MoreVertical,
  Music,
  Bed,
  Tooth,
  Utensils,
  BookOpen,
  Dumbbell,
  Bike,
  ShoppingCart,
  Dog,
  Brush,
  Heart,
  Leaf,
  Sun,
  Moon,
  Smile,
  Gamepad2,
  Bath,
  Gift,
  Lock,
  type LucideProps,
} from 'lucide-react-native';
import type { FC } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface ChildProfile {
  id: string;
  child_name: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  date_of_birth: string | null;
  stars_balance: number;
  cash_balance: number;
  current_permission_level: number;
  avatar_url: string | null;
  family_role: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  star_reward: number | null;
}

interface Completion {
  id: string;
  task_id: string;
  status: string;
  stars_earned: number;
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  star_cost: number | null;
  icon: string | null;
  color: string | null;
  status: string | null;
  image_url: string | null;
}

interface PermissionLevel {
  level_number: number;
  level_name: string;
}

const ICON_MAP: Record<string, FC<LucideProps>> = {
  Music, Bed, Tooth, Utensils, Trash2, BookOpen, Dumbbell, Bike,
  ShoppingCart, Dog, Brush, Heart, Leaf, Sun, Moon, Smile,
  Gamepad2, Bath, Star, Gift,
};

function TaskIcon({ name, color }: { name: string | null; color: string | null }) {
  const bg = color ?? '#334155';
  const Icon = name ? (ICON_MAP[name] ?? Star) : Star;
  return (
    <View style={[styles.taskIconWrap, { backgroundColor: bg + '25' }]}>
      <Icon size={17} color={bg} strokeWidth={2} />
    </View>
  );
}

function childDisplayName(c: ChildProfile) {
  return c.display_name ?? c.first_name ?? c.child_name;
}

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const TABS = ['Tasks', 'Rewards'] as const;
type Tab = typeof TABS[number];

interface MenuState {
  visible: boolean;
  itemId: string | null;
  type: 'task' | 'reward';
}

export default function ChildDetailScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { profile } = useAuth();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [levelName, setLevelName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Tasks');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>({ visible: false, itemId: null, type: 'task' });

  const tabUnderlineX = useRef(new Animated.Value(0)).current;
  const tabBarWidth = useRef(0);

  useEffect(() => { load(); }, [childId]);

  async function load() {
    if (!childId || !profile) return;
    const [childRes, taskRes, completionRes, rewardRes] = await Promise.all([
      supabase
        .from('child_profiles')
        .select('id, child_name, first_name, last_name, display_name, date_of_birth, stars_balance, cash_balance, current_permission_level, avatar_url, family_role')
        .eq('id', childId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('id, title, description, icon, color, star_reward')
        .eq('profile_id', profile.id)
        .eq('assigned_to_child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_completions')
        .select('id, task_id, status, stars_earned, created_at')
        .eq('child_profile_id', childId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('rewards')
        .select('id, title, description, star_cost, icon, color, status, image_url')
        .eq('profile_id', profile.id)
        .eq('assigned_to_child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    const childData = childRes.data;
    setChild(childData);
    setTasks(taskRes.data ?? []);
    setCompletions(completionRes.data ?? []);
    setRewards(rewardRes.data ?? []);

    if (childData?.current_permission_level != null) {
      const { data: lvl } = await supabase
        .from('permission_levels')
        .select('level_number, level_name')
        .eq('level_number', childData.current_permission_level)
        .maybeSingle();
      setLevelName((lvl as PermissionLevel | null)?.level_name ?? null);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function approveCompletion(completionId: string) {
    setActionLoading(completionId);
    await supabase
      .from('task_completions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', completionId);
    await load();
    setActionLoading(null);
  }

  async function rejectCompletion(completionId: string) {
    setActionLoading(completionId);
    await supabase
      .from('task_completions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', completionId);
    await load();
    setActionLoading(null);
  }

  async function redeemReward(reward: Reward) {
    if (!childId) return;
    const cost = reward.star_cost ?? 0;
    setActionLoading('redeem-' + reward.id);
    await supabase
      .from('rewards')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString(), redeemed_by_child_id: childId })
      .eq('id', reward.id);
    await supabase
      .from('child_profiles')
      .update({ stars_balance: (child?.stars_balance ?? 0) - cost })
      .eq('id', childId);
    await load();
    setActionLoading(null);
  }

  async function awardStars(task: Task) {
    if (!childId) return;
    setActionLoading('award-' + task.id);
    const stars = task.star_reward ?? 0;
    await supabase.from('task_completions').insert({
      task_id: task.id,
      child_profile_id: childId,
      status: 'approved',
      stars_earned: stars,
      completed_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    });
    await supabase
      .from('child_profiles')
      .update({ stars_balance: (child?.stars_balance ?? 0) + stars })
      .eq('id', childId);
    await load();
    setActionLoading(null);
  }

  function openMenu(itemId: string, type: 'task' | 'reward') {
    setMenu({ visible: true, itemId, type });
  }

  function closeMenu() {
    setMenu({ visible: false, itemId: null, type: 'task' });
  }

  function handleMenuDelete() {
    closeMenu();
    if (!menu.itemId) return;
    const id = menu.itemId;
    const isTask = menu.type === 'task';
    Alert.alert(
      isTask ? 'Delete Task' : 'Delete Reward',
      isTask ? 'Remove this task from the child?' : 'Remove this reward?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase
              .from(isTask ? 'tasks' : 'rewards')
              .update({ is_active: false })
              .eq('id', id);
            load();
          },
        },
      ]
    );
  }

  function latestActiveCompletion(taskId: string) {
    return completions.find(c => c.task_id === taskId && c.status !== 'rejected') ?? null;
  }

  function switchTab(tab: Tab) {
    const idx = TABS.indexOf(tab);
    setActiveTab(tab);
    Animated.spring(tabUnderlineX, {
      toValue: idx * (tabBarWidth.current / TABS.length),
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.loadingCenter}>
        <Text style={styles.errorText}>Child not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const name = childDisplayName(child);
  const childAge = calcAge(child.date_of_birth);
  const pendingApprovals = completions.filter(c => c.status === 'pending_approval');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Three-dot dropdown menu modal */}
      <Modal transparent visible={menu.visible} animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <View style={styles.menuPopover}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); }}>
              <Pencil size={15} color="#60a5fa" />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleMenuDelete}>
              <Trash2 size={15} color="#f87171" />
              <Text style={[styles.menuItemText, { color: '#f87171' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#60a5fa"
          />
        }
      >
        {/* Profile card */}
        <LinearGradient colors={['#1e3a5f', '#0f172a']} style={styles.profileCard}>
          <View style={styles.starsBadge}>
            <Star size={13} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.starsBadgeText}>{child.stars_balance ?? 0}</Text>
          </View>
          {child.avatar_url ? (
            <Image source={{ uri: child.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{name}</Text>
          <View style={styles.profileMeta}>
            {levelName && (
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{levelName}</Text>
              </View>
            )}
            {childAge !== null && (
              <Text style={styles.ageText}>Age {childAge}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Pending approvals banner */}
        {pendingApprovals.length > 0 && (
          <View style={styles.approvalBanner}>
            <View style={styles.approvalBannerHeader}>
              <Clock size={15} color="#fbbf24" />
              <Text style={styles.approvalBannerTitle}>Needs Approval</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingApprovals.length}</Text>
              </View>
            </View>
            {pendingApprovals.map(c => {
              const task = tasks.find(t => t.id === c.task_id);
              const busy = actionLoading === c.id;
              return (
                <View key={c.id} style={styles.approvalRow}>
                  <TaskIcon name={task?.icon ?? null} color={task?.color ?? null} />
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalTitle}>{task?.title ?? 'Task'}</Text>
                    <View style={styles.starRow}>
                      <Star size={10} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.approvalStars}>{c.stars_earned} star{c.stars_earned !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.approvalBtn, styles.approvalRejectBtn]}
                    onPress={() => rejectCompletion(c.id)}
                    disabled={busy}
                  >
                    <CircleX size={13} color="#f87171" />
                    <Text style={styles.approvalRejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approvalBtn, styles.approvalApproveBtn]}
                    onPress={() => approveCompletion(c.id)}
                    disabled={busy}
                  >
                    {busy
                      ? <ActivityIndicator size={12} color="#fff" />
                      : <CircleCheck size={13} color="#fff" />
                    }
                    <Text style={styles.approvalApproveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsCard}>
          <View
            style={styles.tabBar}
            onLayout={e => { tabBarWidth.current = e.nativeEvent.layout.width; }}
          >
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={styles.tabBtn}
                onPress={() => switchTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
            <Animated.View
              style={[
                styles.tabUnderline,
                { width: `${100 / TABS.length}%` as any, transform: [{ translateX: tabUnderlineX }] },
              ]}
            />
          </View>

          {/* Tasks panel */}
          {activeTab === 'Tasks' && (
            <View>
              {tasks.length === 0 && (
                <Text style={styles.emptyMsg}>No tasks assigned yet.</Text>
              )}
              {tasks.map((task, idx) => {
                const completion = latestActiveCompletion(task.id);
                const isPending = completion?.status === 'pending_approval';
                const isApproved = completion?.status === 'approved';
                const busyAward = actionLoading === 'award-' + task.id;

                return (
                  <View key={task.id} style={[styles.taskRow, idx > 0 && styles.taskRowBorder]}>
                    <TaskIcon name={task.icon} color={task.color} />

                    {/* Title + stars stacked */}
                    <View style={styles.taskMeta}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <View style={styles.starRow}>
                        <Star size={10} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.taskStars}>
                          {task.star_reward ?? 0} star{(task.star_reward ?? 0) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Right-side actions */}
                    {isPending ? (
                      <>
                        <TouchableOpacity
                          style={[styles.compactBtn, styles.rejectBtn]}
                          onPress={() => rejectCompletion(completion!.id)}
                          disabled={actionLoading === completion!.id}
                        >
                          <CircleX size={13} color="#f87171" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.compactBtn, styles.approveBtn]}
                          onPress={() => approveCompletion(completion!.id)}
                          disabled={actionLoading === completion!.id}
                        >
                          {actionLoading === completion!.id
                            ? <ActivityIndicator size={12} color="#fff" />
                            : <CircleCheck size={13} color="#fff" />
                          }
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.compactBtn, styles.awardBtn, isApproved && styles.awardBtnDim]}
                        onPress={() => awardStars(task)}
                        disabled={busyAward}
                      >
                        {busyAward
                          ? <ActivityIndicator size={12} color="#fbbf24" />
                          : <Star size={13} color="#fbbf24" />
                        }
                        <Text style={styles.awardBtnText}>Award</Text>
                      </TouchableOpacity>
                    )}

                    {/* Three-dot menu */}
                    <TouchableOpacity
                      style={styles.dotsBtn}
                      onPress={() => openMenu(task.id, 'task')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MoreVertical size={17} color="#475569" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Rewards panel */}
          {activeTab === 'Rewards' && (
            <View>
              {rewards.length === 0 && (
                <Text style={styles.emptyMsg}>No rewards assigned yet.</Text>
              )}
              {rewards.map((reward, idx) => {
                const cost = reward.star_cost ?? 0;
                const balance = child?.stars_balance ?? 0;
                const canAfford = balance >= cost;
                const progress = cost > 0 ? Math.min(balance / cost, 1) : 1;
                const moreNeeded = Math.max(cost - balance, 0);
                return (
                  <View key={reward.id} style={[styles.rewardCard, idx > 0 && styles.taskRowBorder]}>
                    {/* Top row: icon + title + star cost + dots */}
                    <View style={styles.rewardCardTop}>
                      {reward.image_url ? (
                        <Image source={{ uri: reward.image_url }} style={styles.rewardThumb} />
                      ) : (
                        <TaskIcon name={reward.icon} color={reward.color} />
                      )}
                      <View style={styles.taskMeta}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{reward.title}</Text>
                        <View style={styles.starRow}>
                          <Star size={10} color="#fbbf24" fill="#fbbf24" />
                          <Text style={styles.taskStars}>{cost} stars</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.dotsBtn}
                        onPress={() => openMenu(reward.id, 'reward')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical size={17} color="#475569" />
                      </TouchableOpacity>
                    </View>

                    {reward.status === 'redeemed' ? (
                      <View style={[styles.statusPill, styles.statusRedeemed, { alignSelf: 'flex-start', marginTop: 8 }]}>
                        <Text style={[styles.statusPillText, styles.statusRedeemedText]}>Redeemed</Text>
                      </View>
                    ) : (
                      <>
                        {/* Progress bar */}
                        <View style={styles.rewardProgressRow}>
                          <Text style={styles.rewardProgressLabel}>
                            {canAfford ? 'Ready to redeem!' : `${moreNeeded} more star${moreNeeded !== 1 ? 's' : ''} needed`}
                          </Text>
                          <Text style={styles.rewardProgressFraction}>{balance} / {cost}</Text>
                        </View>
                        <View style={styles.rewardProgressTrack}>
                          <View style={[styles.rewardProgressFill, { width: `${progress * 100}%` as any }]} />
                        </View>

                        {/* Redeem button */}
                        <TouchableOpacity
                          style={[styles.redeemFullBtn, !canAfford && styles.redeemFullBtnLocked]}
                          onPress={() => canAfford && redeemReward(reward)}
                          disabled={!canAfford || actionLoading === 'redeem-' + reward.id}
                        >
                          {actionLoading === 'redeem-' + reward.id
                            ? <ActivityIndicator size={13} color={canAfford ? '#fff' : '#475569'} />
                            : canAfford
                              ? <Gift size={13} color="#fff" />
                              : <Lock size={13} color="#475569" />
                          }
                          <Text style={[styles.redeemFullBtnText, !canAfford && styles.redeemFullBtnLockedText]}>
                            {canAfford ? 'Redeem' : 'Locked'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 16, color: '#94a3b8', marginBottom: 16 },
  backBtnAlt: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnAltText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#60a5fa' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  profileCard: {
    borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f', position: 'relative',
  },
  starsBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#78350f', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#b45309',
  },
  starsBadgeText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#fbbf24' },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    marginBottom: 14, borderWidth: 3, borderColor: '#2563eb',
  },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarFallbackText: { fontFamily: 'Nunito-ExtraBold', fontSize: 34, color: '#fff' },
  profileName: { fontFamily: 'Nunito-ExtraBold', fontSize: 26, color: '#f1f5f9', marginBottom: 10 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelChip: {
    backgroundColor: '#166534', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#16a34a',
  },
  levelChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#4ade80' },
  ageText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },

  // Approval banner
  approvalBanner: {
    backgroundColor: '#1c1a0e', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#78350f',
  },
  approvalBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  approvalBannerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fbbf24', flex: 1 },
  badge: { backgroundColor: '#7c3500', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#fbbf24' },
  approvalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2d1f00',
  },
  approvalInfo: { flex: 1 },
  approvalTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#f1f5f9' },
  approvalStars: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#92400e' },
  approvalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7,
  },
  approvalRejectBtn: { backgroundColor: '#2d0a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  approvalRejectText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f87171' },
  approvalApproveBtn: { backgroundColor: '#166534' },
  approvalApproveText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },

  // Tabs card
  tabsCard: {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155',
    position: 'relative',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#475569' },
  tabLabelActive: { color: '#60a5fa' },
  tabUnderline: {
    position: 'absolute', bottom: 0, height: 2,
    backgroundColor: '#60a5fa', borderRadius: 2,
  },

  emptyMsg: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569',
    textAlign: 'center', paddingVertical: 24,
  },

  // Compact task row
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  taskRowBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  taskIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  taskMeta: { flex: 1, minWidth: 0 },
  taskTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9', marginBottom: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskStars: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#92400e' },

  // Compact action buttons
  compactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexShrink: 0,
  },
  rejectBtn: { backgroundColor: '#2d0a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  rejectBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f87171' },
  approveBtn: { backgroundColor: '#166534' },
  approveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },
  awardBtn: { backgroundColor: '#1c1a0e', borderWidth: 1, borderColor: '#78350f' },
  awardBtnDim: { opacity: 0.5 },
  awardBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fbbf24' },
  redeemBtn: { backgroundColor: '#1d4ed8' },
  redeemBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },

  // Reward card layout
  rewardCard: {
    paddingHorizontal: 14, paddingVertical: 12, gap: 0,
  },
  rewardThumb: {
    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
  },
  rewardCardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  rewardProgressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, marginBottom: 4,
  },
  rewardProgressLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8' },
  rewardProgressFraction: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b' },
  rewardProgressTrack: {
    height: 6, borderRadius: 3, backgroundColor: '#1e293b', overflow: 'hidden', marginBottom: 10,
  },
  rewardProgressFill: {
    height: '100%', borderRadius: 3, backgroundColor: '#3b82f6',
  },
  redeemFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8, backgroundColor: '#1d4ed8',
  },
  redeemFullBtnLocked: { backgroundColor: '#1e293b' },
  redeemFullBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  redeemFullBtnLockedText: { color: '#475569' },

  // Three-dot button
  dotsBtn: {
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  // Reward status pill
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, flexShrink: 0 },
  statusPillText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  statusRedeemed: { backgroundColor: '#052e16' },
  statusRedeemedText: { color: '#4ade80' },
  statusAvailable: { backgroundColor: '#172554' },
  statusAvailableText: { color: '#60a5fa' },

  // Dropdown menu
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuPopover: {
    backgroundColor: '#1e293b', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
    width: 160, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 16,
  },
  menuItemText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  menuDivider: { height: 1, backgroundColor: '#334155' },
});
