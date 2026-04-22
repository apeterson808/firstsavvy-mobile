import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Delete } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ChildProfile {
  id: string;
  child_name: string;
  first_name: string | null;
  display_name: string | null;
  pin_hash: string | null;
  stars_balance: number;
  cash_balance: number;
  current_permission_level: number;
  avatar_url: string | null;
}

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function ChildPinScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { setActiveChild } = useAuth();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChild() {
      const { data } = await supabase
        .from('child_profiles')
        .select('id, child_name, first_name, display_name, pin_hash, stars_balance, cash_balance, current_permission_level, avatar_url')
        .eq('id', childId)
        .maybeSingle();
      setChild(data);
      setLoading(false);
    }
    if (childId) loadChild();
  }, [childId]);

  function handleKey(key: string) {
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      setError(null);
      return;
    }
    if (key === '') return;
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) verify(next);
  }

  async function verify(enteredPin: string) {
    if (!child) return;
    const { data } = await supabase
      .from('child_profiles')
      .select('pin_plaintext')
      .eq('id', child.id)
      .maybeSingle();

    const storedPin = (data as any)?.pin_plaintext ?? null;

    if (storedPin && enteredPin === storedPin) {
      setActiveChild({
        id: child.id,
        child_name: child.child_name,
        first_name: child.first_name,
        display_name: child.display_name,
        avatar_url: child.avatar_url,
        stars_balance: child.stars_balance,
        cash_balance: child.cash_balance,
        current_permission_level: child.current_permission_level,
      });
      router.replace({ pathname: '/(child)/home', params: { childId: child.id } });
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  }

  const childName = child?.display_name ?? child?.first_name ?? child?.child_name ?? '';

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#fbbf24" size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1c1a0e']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitial}>{childName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.hello}>Hi, {childName}!</Text>
          <Text style={styles.prompt}>Enter your PIN</Text>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Keypad */}
          <View style={styles.pad}>
            {PAD.map((key, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.padKey, key === '' && styles.padKeyEmpty]}
                onPress={() => handleKey(key)}
                disabled={key === ''}
                activeOpacity={0.7}
              >
                {key === 'del'
                  ? <Delete size={22} color="#94a3b8" />
                  : <Text style={styles.padKeyText}>{key}</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#d97706', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, shadowColor: '#d97706', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  avatarInitial: { fontFamily: 'Nunito-ExtraBold', fontSize: 36, color: '#fff' },
  hello: { fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f1f5f9', marginBottom: 6 },
  prompt: { fontFamily: 'Inter-Regular', fontSize: 16, color: '#94a3b8', marginBottom: 32 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#475569', backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  errorText: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#f87171',
    marginBottom: 16, marginTop: 8,
  },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 16, maxWidth: 280, marginTop: 8,
  },
  padKey: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  padKeyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  padKeyText: { fontFamily: 'Nunito-Bold', fontSize: 26, color: '#f1f5f9' },
  backBtn: { marginTop: 32 },
  backText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#60a5fa' },
});
