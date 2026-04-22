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
import { PieChart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface BudgetItem {
  id: string;
  name: string;
  account_type: string | null;
  allocated: number;
  spent: number;
  rollover_enabled: boolean;
  accumulated_rollover: number;
}

const TYPE_GROUP_LABELS: Record<string, string> = {
  earned_income: 'Income',
  fixed_expenses: 'Fixed Expenses',
  variable_expenses: 'Variable Expenses',
  discretionary_expenses: 'Discretionary',
  savings: 'Savings',
};

const GROUP_ORDER = [
  'earned_income',
  'fixed_expenses',
  'variable_expenses',
  'discretionary_expenses',
  'savings',
  'other',
];

function pct(spent: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.min(spent / allocated, 1);
}

function barColor(ratio: number, isIncome: boolean): string {
  if (isIncome) return '#22c55e';
  if (ratio >= 1) return '#ef4444';
  if (ratio >= 0.8) return '#f59e0b';
  return '#3b82f6';
}

export default function BudgetScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => { load(); }, [profile]);

  async function load() {
    if (!profile) return;

    const startDate = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
    const endMonth = month.month === 12 ? 1 : month.month + 1;
    const endYear = month.month === 12 ? month.year + 1 : month.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const [budgetRes, txRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('id, custom_name, allocated_amount, cadence, rollover_enabled, accumulated_rollover, chart_account_id, user_chart_of_accounts(display_name, account_type)')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .order('order', { ascending: true }),
      supabase
        .from('transactions')
        .select('amount, type, category_account_id')
        .eq('profile_id', profile.id)
        .gte('date', startDate)
        .lt('date', endDate),
    ]);

    const spendByCategory: Record<string, number> = {};
    for (const tx of txRes.data ?? []) {
      if (!tx.category_account_id) continue;
      spendByCategory[tx.category_account_id] =
        (spendByCategory[tx.category_account_id] ?? 0) + Math.abs(tx.amount);
    }

    const mapped: BudgetItem[] = (budgetRes.data ?? []).map((b: any) => {
      const acct = b.user_chart_of_accounts;
      return {
        id: b.id,
        name: b.custom_name || acct?.display_name || 'Unnamed',
        account_type: acct?.account_type ?? null,
        allocated: parseFloat(b.allocated_amount) || 0,
        spent: spendByCategory[b.chart_account_id] ?? 0,
        rollover_enabled: b.rollover_enabled,
        accumulated_rollover: parseFloat(b.accumulated_rollover) || 0,
      };
    });

    setItems(mapped);
    setLoading(false);
    setRefreshing(false);
  }

  const grouped = GROUP_ORDER.reduce<Record<string, BudgetItem[]>>((acc, key) => {
    const group = items.filter(i => (i.account_type ?? 'other') === key);
    if (group.length > 0) acc[key] = group;
    return acc;
  }, {});

  const totalAllocated = items.reduce((s, i) => {
    if (i.account_type === 'earned_income') return s;
    return s + i.allocated;
  }, 0);
  const totalSpent = items.reduce((s, i) => {
    if (i.account_type === 'earned_income') return s;
    return s + i.spent;
  }, 0);
  const totalIncome = items.filter(i => i.account_type === 'earned_income').reduce((s, i) => s + i.allocated, 0);

  const monthLabel = new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
        <Text style={styles.pageTitle}>Budget</Text>
        <Text style={styles.monthLabel}>{monthLabel}</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.summaryLabel}>Income</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                ${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.summaryLabel}>Budgeted</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, totalSpent > totalAllocated && styles.overBudget]}>
                ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.summaryLabel}>Spent</Text>
            </View>
          </View>

          {/* Overall progress bar */}
          <View style={styles.overallBarTrack}>
            <View
              style={[
                styles.overallBarFill,
                {
                  width: `${Math.min(pct(totalSpent, totalAllocated) * 100, 100)}%` as any,
                  backgroundColor: barColor(pct(totalSpent, totalAllocated), false),
                },
              ]}
            />
          </View>
          <Text style={styles.overallBarLabel}>
            ${(totalAllocated - totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining
          </Text>
        </View>

        {/* Groups */}
        {Object.entries(grouped).map(([type, groupItems]) => (
          <View key={type} style={styles.group}>
            <Text style={styles.groupLabel}>
              {TYPE_GROUP_LABELS[type] ?? 'Other'}
            </Text>
            <View style={styles.groupCard}>
              {groupItems.map((item, idx) => {
                const ratio = pct(item.spent, item.allocated);
                const isIncome = item.account_type === 'earned_income';
                const color = barColor(ratio, isIncome);
                const remaining = item.allocated - item.spent;

                return (
                  <View key={item.id} style={[styles.budgetRow, idx > 0 && styles.budgetBorder]}>
                    <View style={styles.budgetTop}>
                      <Text style={styles.budgetName} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.budgetAmounts, remaining < 0 && styles.overBudget]}>
                        ${item.spent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        <Text style={styles.budgetAllocated}>
                          {' '}/ ${item.allocated.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${ratio * 100}%` as any,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.budgetRemaining, remaining < 0 && styles.overBudget]}>
                      {remaining >= 0
                        ? `$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left`
                        : `$${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} over`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <PieChart size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Budgets Yet</Text>
            <Text style={styles.emptyText}>Set up budgets in the Savvy web app to track your spending here.</Text>
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
  monthLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', marginTop: 2, marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#f1f5f9' },
  summaryLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#334155' },
  overallBarTrack: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  overallBarFill: { height: 8, borderRadius: 4 },
  overallBarLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', textAlign: 'right' },
  group: { marginBottom: 20 },
  groupLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  budgetRow: { paddingVertical: 14 },
  budgetBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetName: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#cbd5e1', flex: 1, marginRight: 8 },
  budgetAmounts: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  budgetAllocated: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569' },
  barTrack: {
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  barFill: { height: 6, borderRadius: 3 },
  budgetRemaining: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b', textAlign: 'right' },
  overBudget: { color: '#ef4444' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
