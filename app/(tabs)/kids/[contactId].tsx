import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail, Phone, MapPin, Globe, Building2, Tag, FileText, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Contact {
  id: string;
  name: string;
  type: string;
  group_name: string | null;
  email: string | null;
  phone: string | null;
  color: string | null;
  status: string;
  notes: string | null;
  address: string | null;
  company_name: string | null;
  website: string | null;
  tags: string[] | null;
}

function initials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2);
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]} numberOfLines={3}>
          {value}
        </Text>
      </View>
      {onPress && <ExternalLink size={14} color="#60a5fa" />}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

export default function ContactDetailScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { profile } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [contactId]);

  async function load() {
    if (!contactId || !profile) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, name, type, group_name, email, phone, color, status, notes, address, company_name, website, tags')
      .eq('id', contactId)
      .eq('profile_id', profile.id)
      .maybeSingle();
    setContact(data);
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

  if (!contact) {
    return (
      <View style={styles.loadingCenter}>
        <Text style={styles.errorText}>Contact not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarColor = contact.color ?? '#334155';
  const hasDetails = contact.email || contact.phone || contact.address || contact.company_name || contact.website;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contact.name}</Text>
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
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.profileCard}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials(contact.name)}</Text>
          </View>
          <Text style={styles.profileName}>{contact.name}</Text>
          <View style={styles.metaRow}>
            {contact.group_name && (
              <View style={styles.groupChip}>
                <Text style={styles.groupChipText}>{contact.group_name}</Text>
              </View>
            )}
            {contact.company_name && (
              <Text style={styles.companyText}>{contact.company_name}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Quick actions */}
        {(contact.email || contact.phone) && (
          <View style={styles.quickActions}>
            {contact.email && (
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIcon}>
                  <Mail size={20} color="#60a5fa" />
                </View>
                <Text style={styles.quickActionLabel}>Email</Text>
              </TouchableOpacity>
            )}
            {contact.phone && (
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIcon}>
                  <Phone size={20} color="#34d399" />
                </View>
                <Text style={styles.quickActionLabel}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Details card */}
        {hasDetails && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 4 }]}>Contact Info</Text>
            {contact.email && (
              <InfoRow
                icon={<Mail size={15} color="#60a5fa" />}
                label="Email"
                value={contact.email}
                onPress={() => Linking.openURL(`mailto:${contact.email}`)}
              />
            )}
            {contact.phone && (
              <InfoRow
                icon={<Phone size={15} color="#34d399" />}
                label="Phone"
                value={contact.phone}
                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              />
            )}
            {contact.address && (
              <InfoRow
                icon={<MapPin size={15} color="#fb923c" />}
                label="Address"
                value={contact.address}
              />
            )}
            {contact.company_name && (
              <InfoRow
                icon={<Building2 size={15} color="#a78bfa" />}
                label="Company"
                value={contact.company_name}
              />
            )}
            {contact.website && (
              <InfoRow
                icon={<Globe size={15} color="#38bdf8" />}
                label="Website"
                value={contact.website}
                onPress={() => {
                  const url = contact.website!.startsWith('http') ? contact.website! : `https://${contact.website}`;
                  Linking.openURL(url);
                }}
              />
            )}
          </View>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Tag size={14} color="#64748b" />
              <Text style={styles.cardTitle}>Tags</Text>
            </View>
            <View style={styles.tagsWrap}>
              {contact.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {contact.notes && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <FileText size={14} color="#64748b" />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{contact.notes}</Text>
          </View>
        )}

        {!hasDetails && !contact.notes && (!contact.tags || contact.tags.length === 0) && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No additional details on file for this contact.</Text>
          </View>
        )}
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
    marginBottom: 12, borderWidth: 1, borderColor: '#1e293b',
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarText: { fontFamily: 'Nunito-ExtraBold', fontSize: 32, color: '#fff' },
  profileName: { fontFamily: 'Nunito-ExtraBold', fontSize: 26, color: '#f1f5f9', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  groupChip: {
    backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#3b82f6',
  },
  groupChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#93c5fd' },
  companyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },

  quickActions: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
  },
  quickAction: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  quickActionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center',
  },
  quickActionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#94a3b8' },

  card: {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155',
    padding: 16, marginBottom: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#0f172a',
  },
  infoIcon: { width: 32, alignItems: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#475569', marginBottom: 2 },
  infoValue: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#f1f5f9' },
  infoValueLink: { color: '#60a5fa' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#334155',
  },
  tagText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#94a3b8' },

  notesText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8', lineHeight: 22 },

  emptyCard: {
    backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155',
    padding: 24, alignItems: 'center',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569', textAlign: 'center' },
});
