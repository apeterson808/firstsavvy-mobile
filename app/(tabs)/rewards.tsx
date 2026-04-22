import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Star, CircleCheck as CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  expires_at: string | null;
  redeemed_at: string | null;
}

interface Redemption {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  requested_at: string;
}

export default function RewardsScreen() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'active' | 'redeemed'>('active');

  useEffect(() => { load(); }, [profile]);

  async function load() {
    if (!profile) return;
    const [rewardRes, redemptionRes] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, title, description, category, image_url, is_active, expires_at, redeemed_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reward_redemptions')
        .select('id, reward_id, points_spent, status, requested_at')
        .order('requested_at', { ascending: false })
        .limit(20),
    ]);
    setRewards(rewardRes.data ?? []);
    setRedemptions(redemptionRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  const activeRewards = rewards.filter(r => r.is_active && !r.redeemed_at);
  const redeemedRewards = rewards.filter(r => r.redeemed_at);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
      >
        <Text style={styles.pageTitle}>Rewards</Text>
        <Text style={styles.pageSubtitle}>Manage rewards for your kids to earn</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
              Active ({activeRewards.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'redeemed' && styles.tabBtnActive]}
            onPress={() => setTab('redeemed')}
          >
            <Text style={[styles.tabText, tab === 'redeemed' && styles.tabTextActive]}>
              Redeemed ({redeemedRewards.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Rewards */}
        {tab === 'active' && (
          <>
            {activeRewards.length === 0 && (
              <View style={styles.emptyState}>
                <Gift size={48} color="#334155" />
                <Text style={styles.emptyTitle}>No Active Rewards</Text>
                <Text style={styles.emptyText}>Create rewards in the Savvy web app for your kids to earn.</Text>
              </View>
            )}
            {activeRewards.map(reward => (
              <View key={reward.id} style={styles.rewardCard}>
                {reward.image_url ? (
                  <Image source={{ uri: reward.image_url }} style={styles.rewardImage} />
                ) : (
                  <View style={styles.rewardImagePlaceholder}>
                    <Gift size={28} color="#475569" />
                  </View>
                )}
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  {reward.description && (
                    <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
                  )}
                  {reward.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{reward.category}</Text>
                    </View>
                  )}
                  {reward.expires_at && (
                    <Text style={styles.expiresText}>
                      Expires {new Date(reward.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Redeemed Rewards */}
        {tab === 'redeemed' && (
          <>
            {redeemedRewards.length === 0 && (
              <View style={styles.emptyState}>
                <CheckCircle size={48} color="#334155" />
                <Text style={styles.emptyTitle}>No Redeemed Rewards</Text>
                <Text style={styles.emptyText}>Rewards your kids redeem will appear here.</Text>
              </View>
            )}
            {redeemedRewards.map(reward => (
              <View key={reward.id} style={[styles.rewardCard, styles.redeemedCard]}>
                <View style={styles.rewardImagePlaceholder}>
                  <CheckCircle size={28} color="#4ade80" />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.redeemedDate}>
                    Redeemed {new Date(reward.redeemed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recent Redemptions */}
        {redemptions.length > 0 && tab === 'active' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Redemptions</Text>
            {redemptions.slice(0, 5).map(r => (
              <View key={r.id} style={styles.redemptionRow}>
                <View style={styles.redemptionIcon}>
                  <Star size={14} color="#fbbf24" fill="#fbbf24" />
                </View>
                <View style={styles.redemptionInfo}>
                  <Text style={styles.redemptionPoints}>{r.points_spent} stars spent</Text>
                  <Text style={styles.redemptionDate}>
                    {new Date(r.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.redemptionStatus, r.status === 'fulfilled' && styles.statusFulfilled]}>
                  <Text style={[styles.redemptionStatusText, r.status === 'fulfilled' && styles.statusFulfilledText]}>
                    {r.status}
                  </Text>
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
  pageTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f1f5f9' },
  pageSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', marginBottom: 20, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#334155',
  },
  tabBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#2563eb' },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  tabTextActive: { color: '#60a5fa' },
  rewardCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  redeemedCard: { opacity: 0.7 },
  rewardImage: { width: 64, height: 64, borderRadius: 10, marginRight: 14 },
  rewardImagePlaceholder: {
    width: 64, height: 64, borderRadius: 10, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9' },
  rewardDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: '#0f172a',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6,
  },
  categoryText: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  expiresText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#f59e0b', marginTop: 4 },
  redeemedDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#4ade80', marginTop: 4 },
  section: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    marginTop: 8, borderWidth: 1, borderColor: '#334155',
  },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9', marginBottom: 12 },
  redemptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#0f172a' },
  redemptionIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#1c1a0e',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  redemptionInfo: { flex: 1 },
  redemptionPoints: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#f1f5f9' },
  redemptionDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b', marginTop: 2 },
  redemptionStatus: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#334155',
  },
  statusFulfilled: { backgroundColor: '#052e16', borderColor: '#16a34a' },
  redemptionStatusText: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  statusFulfilledText: { color: '#4ade80' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
