import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  Pressable,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  CircleCheck,
  CircleX,
  Pencil,
  Trash2,
  Plus,
  MoreVertical,
  Music,
  Bed,
  Zap,
  Utensils,
  BookOpen,
  Dumbbell,
  Bike,
  ShoppingCart,
  Dog,
  Brush,
  Heart,
  Leaf,
  Sun,
  Moon,
  Smile,
  Gamepad2,
  Bath,
  Gift,
  Lock,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Tag,
  FileText,
  ExternalLink,
  Check,
  type LucideProps,
} from 'lucide-react-native';
import type { FC } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChildProfile {
  id: string;
  child_name: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  date_of_birth: string | null;
  stars_balance: number;
  cash_balance: number;
  current_permission_level: number;
  avatar_url: string | null;
  family_role: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  star_reward: number | null;
  reset_mode: string;
}

interface Completion {
  id: string;
  task_id: string;
  status: string;
  stars_earned: number;
  note: string | null;
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  star_cost: number | null;
  icon: string | null;
  color: string | null;
  status: string | null;
  image_url: string | null;
}

interface PermissionLevel {
  level_number: number;
  level_name: string;
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
  notes: string | null;
  address: string | null;
  company_name: string | null;
  website: string | null;
  tags: string[] | null;
}

// ─── Icon/Color picker ───────────────────────────────────────────────────────

const ICON_LABELS: Record<string, string> = {
  Utensils: 'Utensils', Zap: 'Zap', Music: 'Music', Bed: 'Bed',
  BookOpen: 'Book', Dumbbell: 'Dumbbell', Bike: 'Bike',
  ShoppingCart: 'Shopping', Dog: 'Dog', Brush: 'Brush', Heart: 'Heart',
  Leaf: 'Leaf', Sun: 'Sun', Moon: 'Moon', Smile: 'Smile',
  Gamepad2: 'Gaming', Bath: 'Bath', Gift: 'Gift', Star: 'Star',
  Trash2: 'Trash',
};

interface IconColorPickerProps {
  icon: string | null;
  color: string | null;
  onChangeIcon: (icon: string) => void;
  onChangeColor: (color: string) => void;
  label?: string;
}

function IconColorPicker({ icon, color, onChangeIcon, onChangeColor, label = 'Icon & Color' }: IconColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'icon' | 'color'>('icon');
  const [search, setSearch] = useState('');
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);

  const activeColor = color ?? '#60a5fa';
  const PreviewIcon = icon ? (ICON_MAP[icon] ?? Star) : Star;

  function openPicker() {
    setPendingIcon(icon);
    setSearch('');
    setStep('icon');
    setOpen(true);
  }

  function selectIcon(key: string) {
    setPendingIcon(key);
    onChangeIcon(key);
    setStep('color');
  }

  function selectColor(c: string) {
    onChangeColor(c);
    setOpen(false);
    setStep('icon');
    setSearch('');
  }

  const filtered = EDIT_ICONS.filter(({ key }) =>
    search.trim() === '' || (ICON_LABELS[key] ?? key).toLowerCase().includes(search.toLowerCase())
  );

  const DisplayIcon = pendingIcon ? (ICON_MAP[pendingIcon] ?? Star) : PreviewIcon;

  return (
    <>
      <Text style={icpStyles.label}>{label}</Text>
      <TouchableOpacity style={icpStyles.previewBtn} onPress={openPicker} activeOpacity={0.75}>
        <View style={[icpStyles.previewIcon, { backgroundColor: activeColor + '22' }]}>
          <PreviewIcon size={22} color={activeColor} strokeWidth={1.8} />
        </View>
        <View style={icpStyles.previewText}>
          <Text style={icpStyles.previewTitle}>{icon ? (ICON_LABELS[icon] ?? icon) : 'Default'}</Text>
          <Text style={icpStyles.previewSub}>Tap to change</Text>
        </View>
        <View style={[icpStyles.colorDot, { backgroundColor: activeColor }]} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={icpStyles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={icpStyles.panel} onPress={() => {}}>
            {/* Header */}
            <View style={icpStyles.panelHeader}>
              <Text style={icpStyles.panelTitle}>
                {step === 'icon' ? 'Choose an Icon' : 'Choose a Color'}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CircleX size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Step indicators */}
            <View style={icpStyles.stepRow}>
              <TouchableOpacity onPress={() => setStep('icon')} style={[icpStyles.stepPill, step === 'icon' && icpStyles.stepPillActive]}>
                <Text style={[icpStyles.stepText, step === 'icon' && icpStyles.stepTextActive]}>1  Icon</Text>
              </TouchableOpacity>
              <View style={icpStyles.stepDivider} />
              <View style={[icpStyles.stepPill, step === 'color' && icpStyles.stepPillActive]}>
                <Text style={[icpStyles.stepText, step === 'color' && icpStyles.stepTextActive]}>2  Color</Text>
              </View>
            </View>

            {step === 'icon' && (
              <>
                <TextInput
                  style={icpStyles.searchInput}
                  placeholder="Search icons…"
                  placeholderTextColor="#334155"
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                />
                <ScrollView style={icpStyles.iconScroll} contentContainerStyle={icpStyles.iconGrid} showsVerticalScrollIndicator={false}>
                  {filtered.map(({ key, Icon }) => {
                    const sel = (pendingIcon ?? icon) === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[icpStyles.iconCell, sel && { borderColor: activeColor, backgroundColor: activeColor + '18' }]}
                        onPress={() => selectIcon(key)}
                        activeOpacity={0.7}
                      >
                        <Icon size={20} color={sel ? activeColor : '#64748b'} strokeWidth={1.8} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {step === 'color' && (
              <View style={icpStyles.colorStepWrap}>
                <View style={icpStyles.colorPreviewRow}>
                  <View style={[icpStyles.colorPreviewIcon, { backgroundColor: (color ?? '#60a5fa') + '22' }]}>
                    <DisplayIcon size={28} color={color ?? '#60a5fa'} strokeWidth={1.8} />
                  </View>
                  <Text style={icpStyles.colorPreviewHint}>Pick a color</Text>
                  <TouchableOpacity onPress={() => setStep('icon')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={icpStyles.backLink}>Back</Text>
                  </TouchableOpacity>
                </View>
                <View style={icpStyles.colorGrid}>
                  {EDIT_COLORS.map(c => {
                    const sel = color === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[icpStyles.colorCell, { backgroundColor: c }, sel && icpStyles.colorCellSelected]}
                        onPress={() => selectColor(c)}
                        activeOpacity={0.75}
                      >
                        {sel && <Check size={16} color="#fff" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const icpStyles = StyleSheet.create({
  label: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f1e33', borderWidth: 1.5, borderColor: '#1e3a5f',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  previewIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewText: { flex: 1 },
  previewTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#e2e8f0' },
  previewSub: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#475569', marginTop: 2 },
  colorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, height: 420,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  panelTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#e2e8f0' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155',
  },
  stepPillActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  stepText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#475569' },
  stepTextActive: { color: '#60a5fa' },
  stepDivider: { flex: 1, height: 1.5, backgroundColor: '#1e293b' },
  searchInput: {
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#e2e8f0', marginBottom: 10,
  },
  iconScroll: { flex: 1 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  iconCell: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155',
    justifyContent: 'center', alignItems: 'center',
  },
  colorStepWrap: { flex: 1, justifyContent: 'center' },
  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  colorPreviewIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  colorPreviewHint: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', flex: 1 },
  backLink: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#3b82f6' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  colorCell: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  colorCellSelected: { borderWidth: 3, borderColor: '#fff' },
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ICON_MAP: Record<string, FC<LucideProps>> = {
  Music, Bed, Zap, Utensils, Trash2, BookOpen, Dumbbell, Bike,
  ShoppingCart, Dog, Brush, Heart, Leaf, Sun, Moon, Smile,
  Gamepad2, Bath, Star, Gift,
};

function TaskIcon({ name, color }: { name: string | null; color: string | null }) {
  const bg = color ?? '#334155';
  const Icon = name ? (ICON_MAP[name] ?? Star) : Star;
  return (
    <View style={[styles.taskIconWrap, { backgroundColor: bg + '25' }]}>
      <Icon size={17} color={bg} strokeWidth={2} />
    </View>
  );
}

function childDisplayName(c: ChildProfile) {
  return c.display_name ?? c.first_name ?? c.child_name;
}

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function initials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2);
}

// ─── Contact detail ───────────────────────────────────────────────────────────

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
  const inner = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]} numberOfLines={3}>{value}</Text>
      </View>
      {onPress && <ExternalLink size={14} color="#60a5fa" />}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>
  ) : inner;
}

function ContactDetail({ contact }: { contact: Contact }) {
  const avatarColor = contact.color ?? '#334155';
  const hasDetails = contact.email || contact.phone || contact.address || contact.company_name || contact.website;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.profileCard}>
        <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarFallbackText}>{initials(contact.name)}</Text>
        </View>
        <Text style={styles.profileName}>{contact.name}</Text>
        <View style={styles.profileMeta}>
          {contact.group_name && (
            <View style={styles.groupChip}>
              <Text style={styles.groupChipText}>{contact.group_name}</Text>
            </View>
          )}
          {contact.company_name && (
            <Text style={styles.ageText}>{contact.company_name}</Text>
          )}
        </View>
      </LinearGradient>

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

      {hasDetails && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Contact Info</Text>
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

      {contact.tags && contact.tags.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Tag size={14} color="#64748b" />
            <Text style={styles.cardSectionTitle}>Tags</Text>
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

      {contact.notes && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <FileText size={14} color="#64748b" />
            <Text style={styles.cardSectionTitle}>Notes</Text>
          </View>
          <Text style={styles.notesText}>{contact.notes}</Text>
        </View>
      )}

      {!hasDetails && !contact.notes && (!contact.tags || contact.tags.length === 0) && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={styles.emptyMsg}>No additional details on file.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Child detail ─────────────────────────────────────────────────────────────

const EDIT_ICONS: { key: string; Icon: FC<LucideProps> }[] = [
  { key: 'Utensils', Icon: Utensils },
  { key: 'Zap', Icon: Zap },
  { key: 'Music', Icon: Music },
  { key: 'Bed', Icon: Bed },
  { key: 'BookOpen', Icon: BookOpen },
  { key: 'Dumbbell', Icon: Dumbbell },
  { key: 'Bike', Icon: Bike },
  { key: 'ShoppingCart', Icon: ShoppingCart },
  { key: 'Dog', Icon: Dog },
  { key: 'Brush', Icon: Brush },
  { key: 'Heart', Icon: Heart },
  { key: 'Leaf', Icon: Leaf },
  { key: 'Sun', Icon: Sun },
  { key: 'Moon', Icon: Moon },
  { key: 'Smile', Icon: Smile },
  { key: 'Gamepad2', Icon: Gamepad2 },
  { key: 'Bath', Icon: Bath },
  { key: 'Gift', Icon: Gift },
  { key: 'Star', Icon: Star },
  { key: 'Trash2', Icon: Trash2 },
];

const EDIT_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
  '#06b6d4', '#8b5cf6', '#ec4899', '#f97316',
  '#84cc16', '#64748b',
];

const TABS = ['Tasks', 'Rewards', 'Activity'] as const;
type Tab = typeof TABS[number];

interface MenuState { visible: boolean; itemId: string | null; type: 'task' | 'reward'; }

function ChildDetail({ childId, profile }: { childId: string; profile: { id: string } }) {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [levelName, setLevelName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [activityCompletions, setActivityCompletions] = useState<Completion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Tasks');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>({ visible: false, itemId: null, type: 'task' });
  const [activityLimit, setActivityLimit] = useState(10);
  const [awardModal, setAwardModal] = useState<{ task: Task } | null>(null);
  const [awardStarsInput, setAwardStarsInput] = useState('0');
  const [awardNote, setAwardNote] = useState('');

  const [editSheet, setEditSheet] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editStars, setEditStars] = useState('1');
  const [editResetMode, setEditResetMode] = useState<'instant' | 'daily' | 'weekly' | 'monthly'>('instant');
  const [editSaving, setEditSaving] = useState(false);

  const [createSheet, setCreateSheet] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createIcon, setCreateIcon] = useState<string | null>(null);
  const [createColor, setCreateColor] = useState<string | null>(null);
  const [createStars, setCreateStars] = useState('1');
  const [createResetMode, setCreateResetMode] = useState<'instant' | 'daily' | 'weekly' | 'monthly'>('instant');
  const [createSaving, setCreateSaving] = useState(false);

  const [createRewardSheet, setCreateRewardSheet] = useState(false);
  const [createRewardTitle, setCreateRewardTitle] = useState('');
  const [createRewardDescription, setCreateRewardDescription] = useState('');
  const [createRewardIcon, setCreateRewardIcon] = useState<string | null>(null);
  const [createRewardColor, setCreateRewardColor] = useState<string | null>(null);
  const [createRewardStars, setCreateRewardStars] = useState('10');
  const [createRewardSaving, setCreateRewardSaving] = useState(false);

  const tabUnderlineX = useRef(new Animated.Value(0)).current;
  const tabBarWidth = useRef(0);

  useEffect(() => { load(); }, [childId]);

  async function load() {
    const todayStart = new Date(new Date().toLocaleDateString('en-CA')).toISOString();

    const [childRes, taskRes, completionRes, activityRes, rewardRes] = await Promise.all([
      supabase
        .from('child_profiles')
        .select('id, child_name, first_name, last_name, display_name, date_of_birth, stars_balance, cash_balance, current_permission_level, avatar_url, family_role')
        .eq('id', childId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('id, title, description, icon, color, star_reward, reset_mode')
        .eq('assigned_to_child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_completions')
        .select('id, task_id, status, stars_earned, note, created_at')
        .eq('child_profile_id', childId)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_completions')
        .select('id, task_id, status, stars_earned, note, created_at')
        .eq('child_profile_id', childId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('rewards')
        .select('id, title, description, star_cost, icon, color, status, image_url')
        .eq('profile_id', profile.id)
        .eq('assigned_to_child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    const childData = childRes.data;
    setChild(childData);
    setTasks(taskRes.data ?? []);
    setCompletions(completionRes.data ?? []);
    setActivityCompletions(activityRes.data ?? []);
    setRewards(rewardRes.data ?? []);

    if (childData?.current_permission_level != null) {
      const { data: lvl } = await supabase
        .from('permission_levels')
        .select('level_number, level_name')
        .eq('level_number', childData.current_permission_level)
        .maybeSingle();
      setLevelName((lvl as PermissionLevel | null)?.level_name ?? null);
    }

    setActivityLimit(10);
    setLoading(false);
    setRefreshing(false);
  }

  async function approveCompletion(completionId: string) {
    setActionLoading(completionId);
    await supabase.rpc('approve_task_completion', { p_completion_id: completionId });
    await load();
    setActionLoading(null);
  }

  async function rejectCompletion(completionId: string) {
    setActionLoading(completionId);
    await supabase.from('task_completions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', completionId);
    await load();
    setActionLoading(null);
  }

  async function redeemReward(reward: Reward) {
    const cost = reward.star_cost ?? 0;
    setActionLoading('redeem-' + reward.id);
    await supabase.from('rewards').update({ status: 'redeemed', redeemed_at: new Date().toISOString(), redeemed_by_child_id: childId }).eq('id', reward.id);
    await supabase.from('child_profiles').update({ stars_balance: (child?.stars_balance ?? 0) - cost }).eq('id', childId);
    await load();
    setActionLoading(null);
  }

  function openAwardModal(task: Task) {
    setAwardStarsInput(String(task.star_reward ?? 0));
    setAwardNote('');
    setAwardModal({ task });
  }

  async function confirmAward() {
    if (!awardModal) return;
    const task = awardModal.task;
    const stars = Math.max(0, parseInt(awardStarsInput, 10) || 0);
    setAwardModal(null);
    setActionLoading('award-' + task.id);
    await supabase.from('task_completions').insert({
      task_id: task.id,
      child_profile_id: childId,
      status: 'approved',
      stars_earned: stars,
      note: awardNote.trim() || null,
      completed_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    });
    await supabase.from('child_profiles').update({ stars_balance: (child?.stars_balance ?? 0) + stars }).eq('id', childId);
    await load();
    setActionLoading(null);
  }

  function openEditSheet(task: Task) {
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditIcon(task.icon);
    setEditColor(task.color);
    setEditStars(String(task.star_reward ?? 1));
    setEditResetMode((['instant', 'daily', 'weekly', 'monthly'].includes(task.reset_mode) ? task.reset_mode : 'instant') as 'instant' | 'daily' | 'weekly' | 'monthly');
    setEditSheet(task);
  }

  async function saveEdit() {
    if (!editSheet || !editTitle.trim()) return;
    setEditSaving(true);
    await supabase.from('tasks').update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      icon: editIcon,
      color: editColor,
      star_reward: Math.max(0, parseInt(editStars, 10) || 0),
      reset_mode: editResetMode,
      // legacy web-app fields kept in sync with reset_mode
      frequency: editResetMode === 'instant' ? 'always_available' : 'once',
      repeatable: editResetMode === 'instant',
    }).eq('id', editSheet.id);
    setEditSheet(null);
    setEditSaving(false);
    await load();
  }

  function openCreateSheet() {
    setCreateTitle('');
    setCreateDescription('');
    setCreateIcon(null);
    setCreateColor(null);
    setCreateStars('1');
    setCreateResetMode('instant');
    setCreateSheet(true);
  }

  async function saveCreate() {
    if (!createTitle.trim() || !profile) return;
    setCreateSaving(true);
    await supabase.from('tasks').insert({
      title: createTitle.trim(),
      description: createDescription.trim() || null,
      icon: createIcon,
      color: createColor,
      star_reward: Math.max(0, parseInt(createStars, 10) || 0),
      reset_mode: createResetMode,
      // legacy web-app fields kept in sync with reset_mode
      frequency: createResetMode === 'instant' ? 'always_available' : 'once',
      repeatable: createResetMode === 'instant',
      requires_approval: true,
      assigned_to_child_id: childId,
      profile_id: profile.id,
      is_active: true,
    });
    setCreateSheet(false);
    setCreateSaving(false);
    await load();
  }

  function openCreateRewardSheet() {
    setCreateRewardTitle('');
    setCreateRewardDescription('');
    setCreateRewardIcon(null);
    setCreateRewardColor(null);
    setCreateRewardStars('10');
    setCreateRewardSheet(true);
  }

  async function saveCreateReward() {
    if (!createRewardTitle.trim() || !profile) return;
    setCreateRewardSaving(true);
    await supabase.from('rewards').insert({
      title: createRewardTitle.trim(),
      description: createRewardDescription.trim() || null,
      icon: createRewardIcon,
      color: createRewardColor,
      star_cost: Math.max(0, parseInt(createRewardStars, 10) || 0),
      assigned_to_child_id: childId,
      profile_id: profile.id,
      is_active: true,
      status: 'active',
    });
    setCreateRewardSheet(false);
    setCreateRewardSaving(false);
    await load();
  }

  function openMenu(itemId: string, type: 'task' | 'reward') { setMenu({ visible: true, itemId, type }); }
  function closeMenu() { setMenu({ visible: false, itemId: null, type: 'task' }); }

  function handleMenuEdit() {
    if (!menu.itemId || menu.type !== 'task') { closeMenu(); return; }
    const task = tasks.find(t => t.id === menu.itemId);
    closeMenu();
    if (task) openEditSheet(task);
  }

  function handleMenuDelete() {
    closeMenu();
    if (!menu.itemId) return;
    const id = menu.itemId;
    const isTask = menu.type === 'task';
    Alert.alert(
      isTask ? 'Delete Task' : 'Delete Reward',
      isTask ? 'Remove this task from the child?' : 'Remove this reward?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from(isTask ? 'tasks' : 'rewards').update({ is_active: false }).eq('id', id); load(); } },
      ]
    );
  }

  function latestActiveCompletion(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    const resetMode = task?.reset_mode ?? 'daily';
    const completion = completions.find(c => c.task_id === taskId && c.status !== 'rejected') ?? null;
    if (resetMode === 'instant' && completion?.status === 'approved') return null;
    return completion;
  }

  function switchTab(tab: Tab) {
    const idx = TABS.indexOf(tab);
    setActiveTab(tab);
    Animated.spring(tabUnderlineX, { toValue: idx * (tabBarWidth.current / TABS.length), useNativeDriver: true, tension: 60, friction: 10 }).start();
  }

  if (loading) {
    return <View style={styles.loadingCenter}><ActivityIndicator color="#60a5fa" size="large" /></View>;
  }

  if (!child) {
    return (
      <View style={styles.loadingCenter}>
        <Text style={styles.errorText}>Not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const name = childDisplayName(child);
  const childAge = calcAge(child.date_of_birth);

  return (
    <>
      <Modal transparent visible={menu.visible} animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <View style={styles.menuPopover}>
            <TouchableOpacity style={styles.menuItem} onPress={handleMenuEdit}>
              <Pencil size={15} color="#60a5fa" />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleMenuDelete}>
              <Trash2 size={15} color="#f87171" />
              <Text style={[styles.menuItemText, { color: '#f87171' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={!!awardModal} animationType="slide" onRequestClose={() => setAwardModal(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setAwardModal(null)}>
          <Pressable style={styles.awardSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.sheetClose} onPress={() => setAwardModal(null)}>
              <CircleX size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={[styles.awardSheetIcon, { backgroundColor: (awardModal?.task.color ?? '#f59e0b') + '20', borderColor: (awardModal?.task.color ?? '#f59e0b') + '40' }]}>
              {(() => {
                const IconComp = awardModal?.task.icon ? (ICON_MAP[awardModal.task.icon] ?? Star) : Star;
                return <IconComp size={36} color={awardModal?.task.color ?? '#f59e0b'} strokeWidth={1.5} />;
              })()}
            </View>

            <Text style={styles.sheetTitle}>{awardModal?.task.title}</Text>

            <View style={styles.awardStarRow}>
              <TouchableOpacity
                style={styles.awardStepBtn}
                onPress={() => setAwardStarsInput(s => String(Math.max(0, (parseInt(s, 10) || 0) - 1)))}
                activeOpacity={0.7}
              >
                <Text style={styles.awardStepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.awardStarInputWrap}>
                <Star size={15} color="#f59e0b" fill="#f59e0b" />
                <TextInput
                  style={styles.awardStarInput}
                  value={awardStarsInput}
                  onChangeText={v => setAwardStarsInput(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
              <TouchableOpacity
                style={styles.awardStepBtn}
                onPress={() => setAwardStarsInput(s => String((parseInt(s, 10) || 0) + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.awardStepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.awardNoteInput}
              value={awardNote}
              onChangeText={setAwardNote}
              placeholder="Add a message, e.g. Great job! (optional)"
              placeholderTextColor="#475569"
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.awardConfirmBtn} onPress={confirmAward} activeOpacity={0.85}>
              <Star size={20} color="#000" fill="#000" />
              <Text style={styles.awardConfirmText}>Award {awardStarsInput || '0'} Stars</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.awardCancelBtn} onPress={() => setAwardModal(null)}>
              <Text style={styles.awardCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={!!editSheet} animationType="slide" onRequestClose={() => setEditSheet(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setEditSheet(null)}>
          <Pressable style={[styles.awardSheet, { alignItems: 'stretch', paddingBottom: 48 }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { alignSelf: 'center' }]} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => setEditSheet(null)}>
              <CircleX size={18} color="#64748b" />
            </TouchableOpacity>

            <Text style={[styles.sheetTitle, { textAlign: 'left', fontSize: 20, marginBottom: 20 }]}>Edit Task</Text>

            {/* Title */}
            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Task title"
              placeholderTextColor="#475569"
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={styles.editLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Short description..."
              placeholderTextColor="#475569"
              multiline
              returnKeyType="done"
            />

            {/* Stars */}
            <Text style={styles.editLabel}>Stars</Text>
            <View style={styles.editStarRow}>
              <TouchableOpacity style={styles.awardStepBtn} onPress={() => setEditStars(s => String(Math.max(0, (parseInt(s, 10) || 0) - 1)))} activeOpacity={0.7}>
                <Text style={styles.awardStepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.editStarInputWrap}>
                <Star size={15} color="#f59e0b" fill="#f59e0b" />
                <TextInput
                  style={styles.awardStarInput}
                  value={editStars}
                  onChangeText={v => setEditStars(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
              <TouchableOpacity style={styles.awardStepBtn} onPress={() => setEditStars(s => String((parseInt(s, 10) || 0) + 1))} activeOpacity={0.7}>
                <Text style={styles.awardStepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <IconColorPicker
              icon={editIcon}
              color={editColor}
              onChangeIcon={setEditIcon}
              onChangeColor={setEditColor}
            />

            {/* Reset mode */}
            <Text style={[styles.editLabel, { marginTop: 16 }]}>Resets</Text>
            <View style={styles.resetScheduleRow}>
              <View style={styles.resetScheduleLeft}>
                <Text style={styles.resetScheduleLabel}>Set a schedule</Text>
                <Text style={styles.resetScheduleSub}>Reset on a recurring interval</Text>
              </View>
              <TouchableOpacity
                style={[styles.resetToggle, editResetMode !== 'instant' && styles.resetToggleOn]}
                onPress={() => setEditResetMode(editResetMode === 'instant' ? 'daily' : 'instant')}
                activeOpacity={0.8}
              >
                <View style={[styles.resetToggleThumb, editResetMode !== 'instant' && styles.resetToggleThumbOn]} />
              </TouchableOpacity>
            </View>
            {editResetMode !== 'instant' && (
              <View style={styles.scheduleOptionsRow}>
                {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.scheduleChip, editResetMode === mode && styles.scheduleChipActive]}
                    onPress={() => setEditResetMode(mode)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scheduleChipText, editResetMode === mode && styles.scheduleChipTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.awardConfirmBtn, { marginTop: 24, backgroundColor: '#2563eb' }, (!editTitle.trim() || editSaving) && { opacity: 0.5 }]}
              onPress={saveEdit}
              disabled={!editTitle.trim() || editSaving}
              activeOpacity={0.85}
            >
              {editSaving
                ? <ActivityIndicator color="#fff" size={18} />
                : <><Check size={18} color="#fff" strokeWidth={2.5} /><Text style={[styles.awardConfirmText, { color: '#fff' }]}>Save Changes</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.awardCancelBtn} onPress={() => setEditSheet(null)}>
              <Text style={styles.awardCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={createSheet} animationType="slide" onRequestClose={() => setCreateSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setCreateSheet(false)}>
          <Pressable style={[styles.awardSheet, { alignItems: 'stretch', paddingBottom: 48 }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { alignSelf: 'center' }]} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => setCreateSheet(false)}>
              <CircleX size={18} color="#64748b" />
            </TouchableOpacity>

            <Text style={[styles.sheetTitle, { textAlign: 'left', fontSize: 20, marginBottom: 20 }]}>New Task</Text>

            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              value={createTitle}
              onChangeText={setCreateTitle}
              placeholder="Task title"
              placeholderTextColor="#475569"
              returnKeyType="next"
            />

            <Text style={styles.editLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={createDescription}
              onChangeText={setCreateDescription}
              placeholder="Short description..."
              placeholderTextColor="#475569"
              multiline
              returnKeyType="done"
            />

            <Text style={styles.editLabel}>Stars</Text>
            <View style={styles.editStarRow}>
              <TouchableOpacity style={styles.awardStepBtn} onPress={() => setCreateStars(s => String(Math.max(0, (parseInt(s, 10) || 0) - 1)))} activeOpacity={0.7}>
                <Text style={styles.awardStepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.editStarInputWrap}>
                <Star size={15} color="#f59e0b" fill="#f59e0b" />
                <TextInput
                  style={styles.awardStarInput}
                  value={createStars}
                  onChangeText={v => setCreateStars(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
              <TouchableOpacity style={styles.awardStepBtn} onPress={() => setCreateStars(s => String((parseInt(s, 10) || 0) + 1))} activeOpacity={0.7}>
                <Text style={styles.awardStepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <IconColorPicker
              icon={createIcon}
              color={createColor}
              onChangeIcon={setCreateIcon}
              onChangeColor={setCreateColor}
            />

            <Text style={[styles.editLabel, { marginTop: 4 }]}>Resets</Text>
            <View style={styles.resetScheduleRow}>
              <View style={styles.resetScheduleLeft}>
                <Text style={styles.resetScheduleLabel}>Set a schedule</Text>
                <Text style={styles.resetScheduleSub}>Reset on a recurring interval</Text>
              </View>
              <TouchableOpacity
                style={[styles.resetToggle, createResetMode !== 'instant' && styles.resetToggleOn]}
                onPress={() => setCreateResetMode(createResetMode === 'instant' ? 'daily' : 'instant')}
                activeOpacity={0.8}
              >
                <View style={[styles.resetToggleThumb, createResetMode !== 'instant' && styles.resetToggleThumbOn]} />
              </TouchableOpacity>
            </View>
            {createResetMode !== 'instant' && (
              <View style={styles.scheduleOptionsRow}>
                {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.scheduleChip, createResetMode === mode && styles.scheduleChipActive]}
                    onPress={() => setCreateResetMode(mode)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scheduleChipText, createResetMode === mode && styles.scheduleChipTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.awardConfirmBtn, { marginTop: 24, backgroundColor: '#2563eb' }, (!createTitle.trim() || createSaving) && { opacity: 0.5 }]}
              onPress={saveCreate}
              disabled={!createTitle.trim() || createSaving}
              activeOpacity={0.85}
            >
              {createSaving
                ? <ActivityIndicator color="#fff" size={18} />
                : <><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={[styles.awardConfirmText, { color: '#fff' }]}>Add Task</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.awardCancelBtn} onPress={() => setCreateSheet(false)}>
              <Text style={styles.awardCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Reward sheet */}
      <Modal transparent visible={createRewardSheet} animationType="slide" onRequestClose={() => setCreateRewardSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setCreateRewardSheet(false)}>
          <Pressable style={[styles.awardSheet, { alignItems: 'stretch', paddingBottom: 48 }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { alignSelf: 'center' }]} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => setCreateRewardSheet(false)}>
              <CircleX size={18} color="#64748b" />
            </TouchableOpacity>

            <Text style={[styles.sheetTitle, { textAlign: 'left', fontSize: 20, marginBottom: 20 }]}>New Reward</Text>

            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              placeholder="e.g. Pizza night, Movie time…"
              placeholderTextColor="#334155"
              value={createRewardTitle}
              onChangeText={setCreateRewardTitle}
              maxLength={60}
            />

            <Text style={[styles.editLabel, { marginTop: 14 }]}>Star Cost</Text>
            <TextInput
              style={styles.editInput}
              placeholder="10"
              placeholderTextColor="#334155"
              value={createRewardStars}
              onChangeText={setCreateRewardStars}
              keyboardType="numeric"
              maxLength={5}
            />

            <IconColorPicker
              icon={createRewardIcon}
              color={createRewardColor}
              onChangeIcon={setCreateRewardIcon}
              onChangeColor={setCreateRewardColor}
            />

            <TouchableOpacity
              style={[styles.awardConfirmBtn, { marginTop: 24, backgroundColor: '#f59e0b' }, (!createRewardTitle.trim() || createRewardSaving) && { opacity: 0.5 }]}
              onPress={saveCreateReward}
              disabled={!createRewardTitle.trim() || createRewardSaving}
              activeOpacity={0.85}
            >
              {createRewardSaving
                ? <ActivityIndicator color="#000" size={18} />
                : <><Gift size={18} color="#000" strokeWidth={2.5} /><Text style={[styles.awardConfirmText, { color: '#000' }]}>Add Reward</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.awardCancelBtn} onPress={() => setCreateRewardSheet(false)}>
              <Text style={styles.awardCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
      >
        <LinearGradient colors={['#1e3a5f', '#0f172a']} style={styles.profileCard}>
          {child.avatar_url ? (
            <Image source={{ uri: child.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarFallbackText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>
            {child.family_role === 'spouse_partner' ? (
              <View style={[styles.levelChip, styles.partnerChip]}>
                <Text style={[styles.levelChipText, styles.partnerChipText]}>Partner</Text>
              </View>
            ) : levelName ? (
              <View style={styles.levelChip}>
                <View style={styles.levelDot} />
                <Text style={styles.levelChipText}>{levelName}</Text>
              </View>
            ) : null}
          </View>
          {child.family_role !== 'spouse_partner' && (
            <View style={styles.starsBadge}>
              <Star size={13} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.starsBadgeText}>{child.stars_balance ?? 0}</Text>
            </View>
          )}
        </LinearGradient>

        {child.family_role !== 'spouse_partner' && (
          <View style={styles.tabsCard}>
            <View style={styles.tabBar} onLayout={e => { tabBarWidth.current = e.nativeEvent.layout.width; }}>
              {TABS.map(tab => (
                <TouchableOpacity key={tab} style={styles.tabBtn} onPress={() => switchTab(tab)} activeOpacity={0.7}>
                  <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
              <Animated.View style={[styles.tabUnderline, { width: `${100 / TABS.length}%` as any, transform: [{ translateX: tabUnderlineX }] }]} />
            </View>

            {activeTab === 'Tasks' && (
              <View>
                <TouchableOpacity style={styles.addTaskBtn} onPress={openCreateSheet} activeOpacity={0.7}>
                  <Plus size={15} color="#60a5fa" />
                  <Text style={styles.addTaskBtnText}>Add Task</Text>
                </TouchableOpacity>
                {tasks.length === 0 && <Text style={styles.emptyMsg}>No tasks assigned yet.</Text>}
                {[...tasks].sort((a, b) => {
                  const aPending = latestActiveCompletion(a.id)?.status === 'pending' ? 0 : 1;
                  const bPending = latestActiveCompletion(b.id)?.status === 'pending' ? 0 : 1;
                  return aPending - bPending;
                }).map((task, idx) => {
                  const completion = latestActiveCompletion(task.id);
                  const isPending = completion?.status === 'pending';
                  const isApproved = completion?.status === 'approved';
                  const busyAward = actionLoading === 'award-' + task.id;
                  return (
                    <View key={task.id} style={[styles.taskRow, idx > 0 && styles.taskRowBorder, isPending && styles.taskRowPending]}>
                      <TaskIcon name={task.icon} color={task.color} />
                      <View style={styles.taskMeta}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                        <View style={styles.starRow}>
                          <Star size={10} color="#fbbf24" fill="#fbbf24" />
                          <Text style={styles.taskStars}>{task.star_reward ?? 0} star{(task.star_reward ?? 0) !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                      {isPending ? (
                        <>
                          <TouchableOpacity style={[styles.compactBtn, styles.rejectBtn]} onPress={() => rejectCompletion(completion!.id)} disabled={actionLoading === completion!.id}>
                            <CircleX size={13} color="#f87171" />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.compactBtn, styles.approveBtn]} onPress={() => approveCompletion(completion!.id)} disabled={actionLoading === completion!.id}>
                            {actionLoading === completion!.id ? <ActivityIndicator size={12} color="#fff" /> : <CircleCheck size={13} color="#fff" />}
                            <Text style={styles.approveBtnText}>Approve</Text>
                          </TouchableOpacity>
                        </>
                      ) : isApproved ? (
                        <View style={[styles.compactBtn, styles.doneBtn]}>
                          <CircleCheck size={13} color="#4ade80" />
                          <Text style={styles.doneBtnText}>Done</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={[styles.compactBtn, styles.awardBtn]} onPress={() => openAwardModal(task)} disabled={busyAward}>
                          {busyAward ? <ActivityIndicator size={12} color="#1a0f00" /> : <Star size={13} color="#1a0f00" fill="#1a0f00" />}
                          <Text style={styles.awardBtnText}>Award</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.dotsBtn} onPress={() => openMenu(task.id, 'task')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MoreVertical size={17} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {activeTab === 'Activity' && (
              <View>
                {activityCompletions.length === 0 && <Text style={styles.emptyMsg}>No activity yet.</Text>}
                {activityCompletions.slice(0, activityLimit).map((c, idx) => {
                  const task = tasks.find(t => t.id === c.task_id);
                  const date = new Date(c.created_at);
                  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                  const isApproved = c.status === 'approved';
                  const isPending = c.status === 'pending';
                  return (
                    <View key={c.id} style={[styles.activityRow, idx > 0 && styles.taskRowBorder]}>
                      <View style={[styles.activityDot, isApproved ? styles.activityDotApproved : isPending ? styles.activityDotPending : styles.activityDotRejected]} />
                      <View style={styles.taskMeta}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{task?.title ?? 'Task'}</Text>
                        <Text style={styles.activityTime}>{label} at {time}</Text>
                        {c.note ? <Text style={styles.activityNote} numberOfLines={2}>{c.note}</Text> : null}
                      </View>
                      <View style={[styles.statusPill, isApproved ? styles.statusApproved : isPending ? styles.statusPending : styles.statusRedeemed]}>
                        <Text style={[styles.statusPillText, isApproved ? styles.statusApprovedText : isPending ? styles.statusPendingText : styles.statusRedeemedText]}>
                          {isApproved ? `+${c.stars_earned} ★` : isPending ? 'Pending' : 'Rejected'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {completions.length > activityLimit && (
                  <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setActivityLimit(n => n + 10)} activeOpacity={0.7}>
                    <Text style={styles.loadMoreText}>Load more ({completions.length - activityLimit} remaining)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'Rewards' && (
              <View>
                <TouchableOpacity style={styles.addTaskBtn} onPress={openCreateRewardSheet} activeOpacity={0.7}>
                  <Plus size={15} color="#f59e0b" />
                  <Text style={[styles.addTaskBtnText, { color: '#f59e0b' }]}>Add Reward</Text>
                </TouchableOpacity>
                {rewards.length === 0 && <Text style={styles.emptyMsg}>No rewards assigned yet.</Text>}
                {rewards.map((reward, idx) => {
                  const cost = reward.star_cost ?? 0;
                  const balance = child?.stars_balance ?? 0;
                  const canAfford = balance >= cost;
                  const progress = cost > 0 ? Math.min(balance / cost, 1) : 1;
                  const moreNeeded = Math.max(cost - balance, 0);
                  return (
                    <View key={reward.id} style={[styles.rewardCard, idx > 0 && styles.taskRowBorder]}>
                      <View style={styles.rewardCardTop}>
                        {reward.image_url ? (
                          <Image source={{ uri: reward.image_url }} style={styles.rewardThumb} />
                        ) : (
                          <TaskIcon name={reward.icon} color={reward.color} />
                        )}
                        <View style={styles.taskMeta}>
                          <Text style={styles.taskTitle} numberOfLines={1}>{reward.title}</Text>
                          <View style={styles.starRow}>
                            <Star size={10} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.taskStars}>{cost} stars</Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.dotsBtn} onPress={() => openMenu(reward.id, 'reward')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MoreVertical size={17} color="#475569" />
                        </TouchableOpacity>
                      </View>
                      {reward.status === 'redeemed' ? (
                        <View style={[styles.statusPill, styles.statusRedeemed, { alignSelf: 'flex-start', marginTop: 8 }]}>
                          <Text style={[styles.statusPillText, styles.statusRedeemedText]}>Redeemed</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.rewardProgressRow}>
                            <Text style={styles.rewardProgressLabel}>{canAfford ? 'Ready to redeem!' : `${moreNeeded} more star${moreNeeded !== 1 ? 's' : ''} needed`}</Text>
                            <Text style={styles.rewardProgressFraction}>{balance} / {cost}</Text>
                          </View>
                          <View style={styles.rewardProgressTrack}>
                            <View style={[styles.rewardProgressFill, { width: `${progress * 100}%` as any }]} />
                          </View>
                          <TouchableOpacity
                            style={[styles.redeemFullBtn, !canAfford && styles.redeemFullBtnLocked]}
                            onPress={() => canAfford && redeemReward(reward)}
                            disabled={!canAfford || actionLoading === 'redeem-' + reward.id}
                          >
                            {actionLoading === 'redeem-' + reward.id
                              ? <ActivityIndicator size={13} color={canAfford ? '#fff' : '#475569'} />
                              : canAfford ? <Gift size={13} color="#fff" /> : <Lock size={13} color="#475569" />}
                            <Text style={[styles.redeemFullBtnText, !canAfford && styles.redeemFullBtnLockedText]}>
                              {canAfford ? 'Redeem' : 'Locked'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function DetailScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: string }>();
  const { profile } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactLoading, setContactLoading] = useState(kind === 'contact');

  useEffect(() => {
    if (kind === 'contact' && id && profile) {
      supabase
        .from('contacts')
        .select('id, name, type, group_name, email, phone, color, status, notes, address, company_name, website, tags')
        .eq('id', id)
        .eq('profile_id', profile.id)
        .maybeSingle()
        .then(({ data }) => {
          setContact(data);
          setContactLoading(false);
        });
    }
  }, [id, kind, profile]);

  const isContact = kind === 'contact';

  if (isContact && contactLoading) {
    return <View style={styles.loadingCenter}><ActivityIndicator color="#60a5fa" size="large" /></View>;
  }

  if (isContact && !contact) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.loadingCenter}>
          <Text style={styles.errorText}>Contact not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
            <Text style={styles.backBtnAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isContact ? (contact?.name ?? '') : ''}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isContact && contact ? (
        <ContactDetail contact={contact} />
      ) : (
        profile && id ? (
          <ChildDetail childId={id} profile={profile} />
        ) : (
          <View style={styles.loadingCenter}><ActivityIndicator color="#60a5fa" size="large" /></View>
        )
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f',
  },
  profileInfo: { flex: 1, gap: 6 },
  starsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#78350f', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#b45309',
  },
  starsBadgeText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#fbbf24' },
  avatarImg: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: '#2563eb',
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },
  avatarFallbackText: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#fff' },
  profileName: { fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#f1f5f9' },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  levelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  levelChipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  levelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  partnerChip: {},
  partnerChipText: { color: '#64748b' },
  groupChip: {
    backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#3b82f6',
  },
  groupChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#93c5fd' },
  ageText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },

  tabsCard: {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155',
    position: 'relative',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#475569' },
  tabLabelActive: { color: '#60a5fa' },
  tabUnderline: {
    position: 'absolute', bottom: 0, height: 2,
    backgroundColor: '#60a5fa', borderRadius: 2,
  },
  emptyMsg: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569',
    textAlign: 'center', paddingVertical: 24,
  },

  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  taskRowBorder: { borderTopWidth: 1, borderTopColor: '#0f172a' },
  taskRowPending: { borderLeftWidth: 3, borderLeftColor: '#f59e0b', paddingLeft: 11 },
  taskIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  taskMeta: { flex: 1, minWidth: 0 },
  taskTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9', marginBottom: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskStars: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#92400e' },

  compactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexShrink: 0,
  },
  rejectBtn: { backgroundColor: '#2d0a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  rejectBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f87171' },
  approveBtn: { backgroundColor: '#166534' },
  approveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },
  awardBtn: {
    backgroundColor: '#FACC15',
    borderWidth: 0,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  awardBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#1a0f00' },
  doneBtn: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534' },
  doneBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#4ade80' },

  rewardCard: { paddingHorizontal: 14, paddingVertical: 12 },
  rewardThumb: { width: 36, height: 36, borderRadius: 8, flexShrink: 0 },
  rewardCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardProgressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, marginBottom: 4,
  },
  rewardProgressLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8' },
  rewardProgressFraction: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b' },
  rewardProgressTrack: { height: 6, borderRadius: 3, backgroundColor: '#1e293b', overflow: 'hidden', marginBottom: 10 },
  rewardProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#3b82f6' },
  redeemFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8, backgroundColor: '#1d4ed8',
  },
  redeemFullBtnLocked: { backgroundColor: '#1e293b' },
  redeemFullBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  redeemFullBtnLockedText: { color: '#475569' },

  dotsBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, flexShrink: 0 },
  statusPillText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  statusRedeemed: { backgroundColor: '#052e16' },
  statusRedeemedText: { color: '#4ade80' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuPopover: {
    backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', width: 160, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#f1f5f9' },
  menuDivider: { height: 1, backgroundColor: '#334155' },

  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  activityDotApproved: { backgroundColor: '#4ade80' },
  activityDotPending: { backgroundColor: '#fbbf24' },
  activityDotRejected: { backgroundColor: '#f87171' },
  activityTime: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b', marginTop: 2 },
  activityNote: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
  loadMoreBtn: {
    marginHorizontal: 14, marginVertical: 12, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  loadMoreText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#60a5fa' },
  statusApproved: { backgroundColor: '#052e16' },
  statusApprovedText: { color: '#4ade80' },
  statusPending: { backgroundColor: '#1c1a0e' },
  statusPendingText: { color: '#fbbf24' },

  // Contact detail styles
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
    backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155',
    padding: 16, marginBottom: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  cardSectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 },
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

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  awardSheet: {
    backgroundColor: '#131c2e',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', marginBottom: 20 },
  sheetClose: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
  },
  awardSheetIcon: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  sheetTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 24, color: '#f1f5f9', textAlign: 'center' },
  awardStarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 20, marginBottom: 24 },
  awardStarInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0f1e33', borderWidth: 1, borderColor: '#f59e0b40',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8,
  },
  awardStepBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    justifyContent: 'center', alignItems: 'center',
  },
  awardStepBtnText: { fontFamily: 'Nunito-Bold', fontSize: 24, color: '#f1f5f9', lineHeight: 28 },
  awardStarInput: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f59e0b',
    textAlign: 'center', width: 48,
  },
  awardNoteInput: {
    width: '100%', backgroundColor: '#0f1e33', borderWidth: 1, borderColor: '#1e3a5f',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#e2e8f0',
    marginBottom: 20,
  },
  awardConfirmBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#f59e0b', marginBottom: 12,
  },
  awardConfirmText: { fontFamily: 'Nunito-ExtraBold', fontSize: 18, color: '#000' },
  awardCancelBtn: { paddingVertical: 10, alignSelf: 'center' },
  awardCancelText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#475569' },

  editLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  editInput: {
    backgroundColor: '#0f1e33', borderWidth: 1, borderColor: '#1e3a5f',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#e2e8f0',
    marginBottom: 16,
  },
  editStarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  editStarInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0f1e33', borderWidth: 1, borderColor: '#f59e0b40',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
  },
  addTaskBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e3a5f',
  },
  addTaskBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#60a5fa' },
  resetScheduleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f1e33', borderWidth: 1.5, borderColor: '#1e3a5f',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  resetScheduleLeft: { flex: 1, marginRight: 12 },
  resetScheduleLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#e2e8f0' },
  resetScheduleSub: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#475569', marginTop: 2 },
  resetToggle: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: '#1e293b',
    borderWidth: 1.5, borderColor: '#334155', justifyContent: 'center', paddingHorizontal: 3,
  },
  resetToggleOn: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  resetToggleThumb: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#475569',
  },
  resetToggleThumbOn: { backgroundColor: '#60a5fa', alignSelf: 'flex-end' },
  scheduleOptionsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 4,
  },
  scheduleChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#0f1e33', borderWidth: 1.5, borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  scheduleChipActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  scheduleChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#475569' },
  scheduleChipTextActive: { color: '#60a5fa' },
});
