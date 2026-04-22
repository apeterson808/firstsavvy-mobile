import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

type Mode = 'parent' | 'child';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('parent');

  // Parent fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Child fields
  const [username, setUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParentLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
  }

  async function handleChildLogin() {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your username.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('child_profiles')
      .select('id, display_name, first_name, child_name, login_enabled, account_locked')
      .eq('username', trimmed)
      .eq('login_enabled', true)
      .maybeSingle();

    setLoading(false);

    if (dbError || !data) {
      setError('Username not found. Please check with a parent.');
      return;
    }
    if (data.account_locked) {
      setError('This account is locked. Please ask a parent to unlock it.');
      return;
    }

    router.push({ pathname: '/(child)/pin', params: { childId: data.id } });
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setEmail('');
    setPassword('');
    setUsername('');
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrapper}>
            <Text style={styles.logoMark}>$</Text>
          </View>
          <Text style={styles.brand}>Savvy</Text>
          <Text style={styles.tagline}>Family Finance, Made Simple</Text>

          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'parent' && styles.toggleBtnActive]}
              onPress={() => switchMode('parent')}
            >
              <Text style={[styles.toggleText, mode === 'parent' && styles.toggleTextActive]}>
                Parent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'child' && styles.toggleBtnActive]}
              onPress={() => switchMode('child')}
            >
              <Text style={[styles.toggleText, mode === 'child' && styles.toggleTextActive]}>
                I'm a Kid
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {mode === 'parent' ? (
              <>
                <Text style={styles.title}>Welcome back</Text>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleParentLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkRow}>
                  <Text style={styles.linkText}>
                    Don't have an account? <Text style={styles.link}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Kid Login</Text>
                <Text style={styles.subtitle}>Enter your username to get started</Text>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. tucker"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.button, styles.buttonChild, loading && styles.buttonDisabled]}
                  onPress={handleChildLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  logoMark: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 36,
    color: '#fff',
  },
  brand: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#fff',
  },
  card: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#f1f5f9',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    color: '#f1f5f9',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonChild: {
    backgroundColor: '#d97706',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
  },
  link: {
    fontFamily: 'Inter-SemiBold',
    color: '#60a5fa',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#f87171',
    backgroundColor: '#450a0a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
});
