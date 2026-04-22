import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Account {
  id: string;
  display_name: string;
  account_type: string;
  current_balance: number;
  available_balance: number | null;
  credit_limit: number | null;
  institution_name: string | null;
  color: string | null;
  icon: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
  cash: 'Cash',
};

const TYPE_GROUPS: Record<string, string[]> = {
  'Cash & Bank': ['checking', 'savings', 'cash'],
  'Credit': ['credit_card', 'loan'],
  'Investments': ['investment'],
};

function accountIcon(type: string, color: string) {
  const size = 20;
  switch (type) {
    case 'credit_card': return <CreditCard size={size} color={color} />;
    case 'investment': return <TrendingUp size={size} color={color} />;
    case 'loan': return <Landmark size={size} color={color} />;
    default: return <Wallet size={size} color={color} />;
  }
}

export default function AccountsScreen() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    if (!profile) return;
    const { data } = await supabase
      .from('user_chart_of_accounts')
      .select('id, display_name, account_type, current_balance, available_balance, credit_limit, institution_name, color, icon')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .order('account_type');
    setAccounts(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

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
        <Text style={styles.pageTitle}>Accounts</Text>

        {Object.entries(TYPE_GROUPS).map(([groupName, types]) => {
          const groupAccounts = accounts.filter(a => types.includes(a.account_type));
          if (groupAccounts.length === 0) return null;
          const groupTotal = groupAccounts.reduce((sum, a) => {
            if (a.account_type === 'credit_card' || a.account_type === 'loan') return sum - (a.current_balance ?? 0);
            return sum + (a.current_balance ?? 0);
          }, 0);

          return (
            <View key={groupName} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{groupName}</Text>
                <Text style={[styles.groupTotal, groupTotal < 0 && styles.negative]}>
                  {groupTotal < 0 ? '-' : ''}${Math.abs(groupTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              {groupAccounts.map((account, idx) => (
                <View key={account.id} style={[styles.accountCard, idx > 0 && styles.accountBorder]}>
                  <View style={[styles.iconWrap, { backgroundColor: (account.color ?? '#2563eb') + '20' }]}>
                    {accountIcon(account.account_type, account.color ?? '#60a5fa')}
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.display_name}</Text>
                    <Text style={styles.accountMeta}>
                      {account.institution_name ?? TYPE_LABELS[account.account_type] ?? account.account_type}
                    </Text>
                    {account.credit_limit != null && (
                      <Text style={styles.accountMeta}>
                        Limit: ${account.credit_limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.accountRight}>
                    <Text style={[styles.accountBalance, account.current_balance < 0 && styles.negative]}>
                      {account.current_balance < 0 ? '-' : ''}${Math.abs(account.current_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    {account.available_balance != null && (
                      <Text style={styles.availLabel}>
                        Avail: ${account.available_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {accounts.length === 0 && (
          <View style={styles.emptyState}>
            <CreditCard size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Accounts Yet</Text>
            <Text style={styles.emptyText}>Add accounts in the Savvy web app to see them here.</Text>
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
  pageTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f1f5f9', marginBottom: 20 },
  group: { marginBottom: 20 },
  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, paddingHorizontal: 4,
  },
  groupName: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupTotal: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9' },
  accountCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', padding: 16, borderRadius: 0,
    borderWidth: 0, borderColor: '#334155',
  },
  accountBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  accountInfo: { flex: 1 },
  accountName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9' },
  accountMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
  accountRight: { alignItems: 'flex-end' },
  accountBalance: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#f1f5f9' },
  availLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#475569', marginTop: 2 },
  negative: { color: '#f87171' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
