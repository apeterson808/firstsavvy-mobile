import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Star, Users, X, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Contact {
  id: string;
  name: string;
  type: string;
  group_name: string | null;
  email: string | null;
  phone: string | null;
  color: string | null;
  status: string;
}

interface ChildProfile {
  id: string;
  child_name: string;
  first_name: string | null;
  display_name: string | null;
  stars_balance: number;
  cash_balance: number;
  current_permission_level: number;
  avatar_url: string | null;
  family_role: string | null;
}

interface PermissionLevel {
  level_number: number;
  level_name: string;
}

const EXPLICIT_GROUPS = ['My Family', 'My Business'];
const NAMED_GROUPS = new Set(EXPLICIT_GROUPS);

function initials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2);
}

function childDisplayName(child: ChildProfile) {
  return child.display_name ?? child.first_name ?? child.child_name;
}

function CollapsibleSection({
  label,
  icon,
  children,
  defaultOpen = true,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !open;
    setOpen(next);
    Animated.spring(rotation, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <View style={sectionStyles.wrap}>
      <TouchableOpacity style={sectionStyles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={sectionStyles.labelRow}>
          {icon}
          <Text style={sectionStyles.label}>{label.toUpperCase()}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ChevronDown size={16} color="#475569" />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, marginBottom: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  body: {},
});

export default function ContactsScreen() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [levelNames, setLevelNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    group_name: 'General Contact',
  });

  useEffect(() => { load(); }, [profile]);

  async function load() {
    if (!profile) {
      setLoading(false);
      return;
    }
    const [contactRes, childRes, levelRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, name, type, group_name, email, phone, color, status')
        .eq('profile_id', profile.id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('child_profiles')
        .select('id, child_name, first_name, display_name, stars_balance, cash_balance, current_permission_level, avatar_url, family_role')
        .eq('parent_profile_id', profile.id)
        .eq('is_active', true),
      supabase
        .from('permission_levels')
        .select('level_number, level_name'),
    ]);
    setContacts(contactRes.data ?? []);
    setChildren(childRes.data ?? []);
    const lvlMap: Record<number, string> = {};
    for (const lvl of ((levelRes.data ?? []) as PermissionLevel[])) {
      lvlMap[lvl.level_number] = lvl.level_name;
    }
    setLevelNames(lvlMap);
    setLoading(false);
    setRefreshing(false);
  }

  async function saveContact() {
    if (!form.name.trim() || !profile) return;
    setSaving(true);
    await supabase.from('contacts').insert({
      profile_id: profile.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      group_name: form.group_name,
      type: 'contact',
      status: 'active',
      color: '#6B7280',
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: '', email: '', phone: '', group_name: 'General Contact' });
    load();
  }

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const filteredChildren = useMemo(() => {
    if (!search.trim()) return children;
    const q = search.toLowerCase();
    return children.filter(c =>
      childDisplayName(c).toLowerCase().includes(q)
    );
  }, [children, search]);

  const grouped = useMemo(() => {
    const result: Array<{ label: string; contacts: Contact[] }> = [];
    for (const g of EXPLICIT_GROUPS) {
      const group = filteredContacts.filter(c => c.group_name === g);
      if (group.length > 0) result.push({ label: g, contacts: group });
    }
    const general = filteredContacts.filter(c => !c.group_name || !NAMED_GROUPS.has(c.group_name));
    if (general.length > 0) result.push({ label: 'General Contacts', contacts: general });
    return result;
  }, [filteredContacts]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Contacts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor="#475569"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
      >
        {/* Family Section */}
        {filteredChildren.length > 0 && (
          <CollapsibleSection
            label="My Family"
            icon={<Users size={14} color="#64748b" />}
            defaultOpen
          >
            <View style={styles.card}>
              {filteredChildren.map((child, idx) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.contactRow, idx > 0 && styles.rowBorder]}
                  onPress={() => router.push({ pathname: '/(tabs)/kids/[id]', params: { id: child.id, kind: 'child' } })}
                  activeOpacity={0.7}
                >
                  {child.avatar_url ? (
                    <Image source={{ uri: child.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: '#2563eb' }]}>
                      <Text style={styles.avatarText}>
                        {childDisplayName(child).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{childDisplayName(child)}</Text>
                    <Text style={styles.contactSub}>
                      {child.family_role === 'spouse_partner'
                        ? 'Partner'
                        : levelNames[child.current_permission_level] ?? `Level ${child.current_permission_level}`}
                    </Text>
                  </View>
                  {child.family_role !== 'spouse_partner' && (
                    <View style={styles.statPill}>
                      <Star size={11} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.statPillText}>{child.stars_balance ?? 0}</Text>
                    </View>
                  )}
                  <ChevronDown size={16} color="#334155" style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Grouped contacts */}
        {grouped.map(({ label, contacts: group }) => (
          <CollapsibleSection
            key={label}
            label={label}
            defaultOpen={false}
          >
            <View style={styles.card}>
              {group.map((contact, idx) => (
                <TouchableOpacity
                  key={contact.id}
                  style={[styles.contactRow, idx > 0 && styles.rowBorder]}
                  onPress={() => router.push({ pathname: '/(tabs)/kids/[id]', params: { id: contact.id, kind: 'contact' } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                  </View>
                  <ChevronDown size={16} color="#334155" style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        ))}

        {contacts.length === 0 && children.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color="#1e293b" />
            <Text style={styles.emptyTitle}>No Contacts Yet</Text>
            <Text style={styles.emptyText}>Add contacts from the web app or tap Add above.</Text>
          </View>
        )}

        {filteredContacts.length === 0 && filteredChildren.length === 0 && search.trim() !== '' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptyText}>Try a different name or email.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Contact</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.modalClose}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Jane Smith"
                placeholderTextColor="#334155"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholder="jane@example.com"
                placeholderTextColor="#334155"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="(555) 123-4567"
                placeholderTextColor="#334155"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Group</Text>
              <View style={styles.chipScroll}>
                {(['General Contact', 'My Family', 'My Business'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, form.group_name === g && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, group_name: g }))}
                  >
                    <Text style={[styles.chipText, form.group_name === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!form.name.trim() || saving) && styles.saveBtnDisabled]}
              onPress={saveContact}
              disabled={!form.name.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Save Contact</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  pageTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f1f5f9' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 20,
    marginBottom: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: '#334155',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, height: 44,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#f1f5f9',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarImg: {
    width: 44, height: 44, borderRadius: 22, marginRight: 14,
    borderWidth: 2, borderColor: '#2563eb',
  },
  avatarText: { fontFamily: 'Nunito-Bold', fontSize: 17, color: '#fff' },
  contactInfo: { flex: 1, marginRight: 8 },
  contactName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f1f5f9' },
  contactSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },

  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#1a1a2e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#78350f', marginRight: 8,
  },
  statPillText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#fbbf24' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: 20, color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  modal: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  modalTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#f1f5f9' },
  modalClose: { padding: 4 },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 20 },
  fieldLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#f1f5f9',
  },
  chipScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#1d4ed8', borderColor: '#2563eb' },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
