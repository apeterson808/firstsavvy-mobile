import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Star, DollarSign, SquareCheck as CheckSquare, Gift, LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  color: string | null;
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
  description: string | null;
  is_active: boolean;
}

export default function ChildHomeScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { activeChild, setActiveChild, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const child = activeChild;

  useEffect(() => { load(); }, [childId]);

  async function load() {
    if (!childId) return;

    // Look up the child's parent_profile_id so we can load their tasks/rewards
    // without needing an active parent session (e.g. when a child logs in directly).
    const { data: childRow } = await supabase
      .from('child_profiles')
      .select('parent_profile_id')
      .eq('id', childId)
      .maybeSingle();

    const parentProfileId = childRow?.parent_profile_id ?? profile?.id;
    if (!parentProfileId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [taskRes, completionRes, rewardRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, description, category, icon, color')
        .eq('profile_id', parentProfileId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_completions')
        .select('id, task_id, status, stars_earned')
        .eq('child_profile_id', childId),
      supabase
        .from('rewards')
        .select('id, title, description, is_active')
        .eq('profile_id', parentProfileId)
        .eq('is_active', true)
        .is('redeemed_at', null)
        .limit(3),
    ]);
    setTasks(taskRes.data ?? []);
    setCompletions(completionRes.data ?? []);
    setRewards(rewardRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  async function markDone(taskId: string) {
    if (!childId) return;
    const existing = completions.find(c => c.task_id === taskId && c.status !== 'rejected');
    if (existing) return;
    setSubmitting(taskId);
    await supabase.from('task_completions').insert({
      child_profile_id: childId,
      task_id: taskId,
      status: 'pending_approval',
      stars_earned: 5,
    });
    setSubmitting(null);
    load();
  }

  function taskStatus(taskId: string): 'done' | 'pending' | 'none' {
    const c = completions.find(c => c.task_id === taskId);
    if (!c) return 'none';
    if (c.status === 'approved') return 'done';
    if (c.status === 'pending_approval') return 'pending';
    return 'none';
  }

  const childName = child?.display_name ?? child?.first_name ?? child?.child_name ?? 'Explorer';

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#fbbf24" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#fbbf24" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.childName}>{childName}!</Text>
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
            <LogOut size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <LinearGradient colors={['#d97706', '#92400e']} style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Star size={20} color="#fef3c7" fill="#fef3c7" />
              <Text style={styles.balanceValue}>{child?.stars_balance ?? 0}</Text>
              <Text style={styles.balanceLabel}>Stars</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <DollarSign size={20} color="#fef3c7" />
              <Text style={styles.balanceValue}>${(child?.cash_balance ?? 0).toFixed(2)}</Text>
              <Text style={styles.balanceLabel}>Cash</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckSquare size={18} color="#60a5fa" />
            <Text style={styles.sectionTitle}>My Chores</Text>
          </View>

          {tasks.length === 0 && (
            <Text style={styles.emptySmall}>No chores assigned yet!</Text>
          )}

          {tasks.map(task => {
            const status = taskStatus(task.id);
            return (
              <View key={task.id} style={[styles.taskRow, status !== 'none' && styles.taskDone]}>
                <View style={[styles.taskIconWrap, { backgroundColor: (task.color ?? '#2563eb') + '20' }]}>
                  <Text style={styles.taskIconEmoji}>{task.icon ?? '✅'}</Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, status === 'done' && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  {task.description && (
                    <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
                  )}
                </View>
                {status === 'done' && (
                  <View style={styles.doneTag}>
                    <Text style={styles.doneTagText}>Done!</Text>
                  </View>
                )}
                {status === 'pending' && (
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingTagText}>Waiting</Text>
                  </View>
                )}
                {status === 'none' && (
                  <TouchableOpacity
                    style={[styles.markBtn, submitting === task.id && styles.markBtnDisabled]}
                    onPress={() => markDone(task.id)}
                    disabled={submitting === task.id}
                  >
                    {submitting === task.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.markBtnText}>Done</Text>}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Rewards */}
        {rewards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Gift size={18} color="#fbbf24" />
              <Text style={styles.sectionTitle}>Rewards I Can Earn</Text>
            </View>
            {rewards.map(reward => (
              <View key={reward.id} style={styles.rewardRow}>
                <View style={styles.rewardIconWrap}>
                  <Gift size={18} color="#fbbf24" />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  {reward.description && (
                    <Text style={styles.rewardDesc} numberOfLines={1}>{reward.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
  childName: { fontFamily: 'Nunito-ExtraBold', fontSize: 30, color: '#f1f5f9' },
  logoutBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 10 },
  balanceCard: {
    borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: '#d97706', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  balanceStat: { flex: 1, alignItems: 'center', gap: 4 },
  balanceValue: { fontFamily: 'Nunito-ExtraBold', fontSize: 34, color: '#fff' },
  balanceLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#fef3c7' },
  balanceDivider: { width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },
  section: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#f1f5f9' },
  emptySmall: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569', textAlign: 'center', paddingVertical: 12 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#0f172a',
  },
  taskDone: { opacity: 0.6 },
  taskIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  taskIconEmoji: { fontSize: 20 },
  taskInfo: { flex: 1 },
  taskTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#475569' },
  taskDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
  markBtn: {
    backgroundColor: '#2563eb', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 8, minWidth: 56, alignItems: 'center',
  },
  markBtnDisabled: { opacity: 0.5 },
  markBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  doneTag: { backgroundColor: '#052e16', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  doneTagText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#4ade80' },
  pendingTag: { backgroundColor: '#1c1a0e', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  pendingTagText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fbbf24' },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#0f172a',
  },
  rewardIconWrap: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#1c1a0e',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  rewardDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
});
