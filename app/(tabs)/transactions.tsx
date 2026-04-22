import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  status: string;
  payment_method: string | null;
  notes: string | null;
}

const FILTERS = ['All', 'Income', 'Expense'];

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('id, description, amount, type, date, status, payment_method, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);
    setTransactions(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = transactions.filter(tx => {
    if (filter === 'Income') return tx.type === 'income';
    if (filter === 'Expense') return tx.type !== 'income';
    return true;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);

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
        <Text style={styles.pageTitle}>Transactions</Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#052e16' }]}>
            <TrendingUp size={18} color="#4ade80" />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: '#4ade80' }]}>
              +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#450a0a' }]}>
            <TrendingDown size={18} color="#f87171" />
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: '#f87171' }]}>
              -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <ArrowLeftRight size={40} color="#334155" />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          )}
          {filtered.map((tx, idx) => (
            <View key={tx.id} style={[styles.txRow, idx > 0 && styles.txBorder]}>
              <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? '#052e16' : '#1e293b' }]}>
                {tx.type === 'income'
                  ? <TrendingUp size={16} color="#4ade80" />
                  : <TrendingDown size={16} color="#f87171" />}
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <View style={styles.txMeta}>
                  <Text style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {tx.status && tx.status !== 'posted' && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{tx.status}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.txAmount, tx.type === 'income' ? styles.positive : styles.negativeText]}>
                {tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>
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
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1e293b',
  },
  summaryLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 6, marginBottom: 2 },
  summaryValue: { fontFamily: 'Inter-Bold', fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  filterTextActive: { color: '#fff' },
  list: { backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#f1f5f9' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  txDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#475569' },
  statusBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 10, color: '#60a5fa', textTransform: 'capitalize' },
  txAmount: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  positive: { color: '#4ade80' },
  negativeText: { color: '#f87171' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', marginTop: 12 },
});
