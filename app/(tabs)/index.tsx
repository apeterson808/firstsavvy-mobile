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
import { router } from 'expo-router';
import { TrendingUp, TrendingDown, ChevronRight, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Account {
  id: string;
  display_name: string;
  account_type: string;
  current_balance: number;
  color: string | null;
  icon: string | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
}

interface ChildProfile {
  id: string;
  display_name: string | null;
  child_name: string;
  stars_balance: number;
  avatar_url: string | null;
  family_role: string | null;
}

export default function DashboardScreen() {
  const { profile, user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    if (!profile) {
      setLoading(false);
      return;
    }
    const [acctRes, txRes, childRes] = await Promise.all([
      supabase
        .from('user_chart_of_accounts')
        .select('id, display_name, account_type, current_balance, color, icon')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .order('current_balance', { ascending: false })
        .limit(5),
      supabase
        .from('transactions')
        .select('id, description, amount, type, date')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(5),
      supabase
        .from('child_profiles')
        .select('id, display_name, child_name, stars_balance, avatar_url, family_role')
        .eq('parent_profile_id', profile.id)
        .eq('is_active', true),
    ]);
    setAccounts(acctRes.data ?? []);
    setTransactions(txRes.data ?? []);
    setChildren(childRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  const totalBalance = accounts.reduce((sum, a) => {
    if (a.account_type === 'credit_card' || a.account_type === 'loan') return sum - (a.current_balance ?? 0);
    return sum + (a.current_balance ?? 0);
  }, 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const name = profile?.display_name?.split(' ')[0] ?? 'there';

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>
            {totalBalance < 0 ? '-' : ''}${Math.abs(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.netWorthSub}>{accounts.length} accounts connected</Text>
        </View>

        {/* Accounts */}
        {accounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accounts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/accounts')}>
                <Text style={styles.seeAll}>See all <ChevronRight size={12} color="#60a5fa" /></Text>
              </TouchableOpacity>
            </View>
            {accounts.slice(0, 3).map(account => (
              <View key={account.id} style={styles.accountRow}>
                <View style={[styles.accountDot, { backgroundColor: account.color ?? '#2563eb' }]} />
                <Text style={styles.accountName} numberOfLines={1}>{account.display_name}</Text>
                <Text style={[styles.accountBalance, account.current_balance < 0 && styles.negative]}>
                  ${Math.abs(account.current_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? '#052e16' : '#450a0a' }]}>
                  {tx.type === 'income'
                    ? <TrendingUp size={16} color="#4ade80" />
                    : <TrendingDown size={16} color="#f87171" />}
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
                <Text style={[styles.txAmount, tx.type === 'income' ? styles.positive : styles.negative]}>
                  {tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Kids */}
        {children.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Family</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/kids')}>
                <Text style={styles.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.kidsRow}>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.kidCard}
                  onPress={() => router.push(`/(tabs)/kids/${child.id}`)}
                >
                  <View style={styles.kidAvatar}>
                    <Text style={styles.kidInitial}>
                      {(child.display_name ?? child.child_name).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.kidName} numberOfLines={1}>
                    {child.display_name ?? child.child_name}
                  </Text>
                  {child.family_role !== 'spouse_partner' && (
                    <View style={styles.kidStars}>
                      <Star size={12} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.kidStarCount}>{child.stars_balance ?? 0}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {accounts.length === 0 && transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Welcome to Savvy!</Text>
            <Text style={styles.emptyText}>
              Head to the web app to set up your accounts and start tracking your finances.
            </Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
  name: { fontFamily: 'Nunito-ExtraBold', fontSize: 26, color: '#f1f5f9' },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8 },
  signOutText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#94a3b8' },
  netWorthCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  netWorthLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b', marginBottom: 8 },
  netWorthValue: { fontFamily: 'Nunito-ExtraBold', fontSize: 38, color: '#f1f5f9' },
  netWorthSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569', marginTop: 6 },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9' },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#60a5fa' },
  accountRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#0f172a' },
  accountDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  accountName: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#cbd5e1' },
  accountBalance: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  negative: { color: '#f87171' },
  positive: { color: '#4ade80' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#0f172a' },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#cbd5e1' },
  txDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#475569', marginTop: 2 },
  txAmount: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  kidsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kidCard: { alignItems: 'center', width: 80 },
  kidAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  kidInitial: { fontFamily: 'Nunito-Bold', fontSize: 22, color: '#fff' },
  kidName: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#cbd5e1', textAlign: 'center' },
  kidStars: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  kidStarCount: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fbbf24' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9', marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
