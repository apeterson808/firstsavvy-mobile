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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Clock,
  CircleCheck,
  CircleX,
  Pencil,
  Trash2,
  MoreVertical,
  Music,
  Bed,
  Tooth,
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
}

interface Completion {
  id: string;
  task_id: string;
  status: string;
  stars_earned: number;
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ICON_MAP: Record<string, FC<LucideProps>> = {
  Music, Bed, Tooth, Utensils, Trash2, BookOpen, Dumbbell, Bike,
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

const TABS = ['Tasks', 'Rewards'] as const;
type Tab = typeof TABS[number];

interface MenuState { visible: boolean; itemId: string | null; type: 'task' | 'reward'; }

function ChildDetail({ childId, profile }: { childId: string; profile: { id: string } }) {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [levelName, setLevelName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Tasks');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>({ visible: false, itemId: null, type: 'task' });

  const tabUnderlineX = useRef(new Animated.Value(0)).current;
  const tabBarWidth = useRef(0);

  useEffect(() => { load(); }, [childId]);

  async function load() {
    const [childRes, taskRes, completionRes, rewardRes] = await Promise.all([
      supabase
        .from('child_profiles')
        .select('id, child_name, first_name, last_name, display_name, date_of_birth, stars_balance, cash_balance, current_permission_level, avatar_url, family_role')
        .eq('id', childId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('id, title, description, icon, color, star_reward')
        .eq('profile_id', profile.id)
        .eq('assigned_to_child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_completions')
        .select('id, task_id, status, stars_earned, created_at')
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
    setRewards(rewardRes.data ?? []);

    if (childData?.current_permission_level != null) {
      const { data: lvl } = await supabase
        .from('permission_levels')
        .select('level_number, level_name')
        .eq('level_number', childData.current_permission_level)
        .maybeSingle();
      setLevelName((lvl as PermissionLevel | null)?.level_name ?? null);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function approveCompletion(completionId: string) {
    setActionLoading(completionId);
    await supabase.from('task_completions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', completionId);
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

  async function awardStars(task: Task) {
    setActionLoading('award-' + task.id);
    const stars = task.star_reward ?? 0;
    await supabase.from('task_completions').insert({
      task_id: task.id,
      child_profile_id: childId,
      status: 'approved',
      stars_earned: stars,
      completed_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    });
    await supabase.from('child_profiles').update({ stars_balance: (child?.stars_balance ?? 0) + stars }).eq('id', childId);
    await load();
    setActionLoading(null);
  }

  function openMenu(itemId: string, type: 'task' | 'reward') { setMenu({ visible: true, itemId, type }); }
  function closeMenu() { setMenu({ visible: false, itemId: null, type: 'task' }); }

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
    return completions.find(c => c.task_id === taskId && c.status !== 'rejected') ?? null;
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
  const pendingApprovals = completions.filter(c => c.status === 'pending_approval');

  return (
    <>
      <Modal transparent visible={menu.visible} animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <View style={styles.menuPopover}>
            <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
      >
        <LinearGradient colors={['#1e3a5f', '#0f172a']} style={styles.profileCard}>
          {child.family_role !== 'spouse_partner' && (
            <View style={styles.starsBadge}>
              <Star size={13} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.starsBadgeText}>{child.stars_balance ?? 0}</Text>
            </View>
          )}
          {child.avatar_url ? (
            <Image source={{ uri: child.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarFallbackText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{name}</Text>
          <View style={styles.profileMeta}>
            {child.family_role === 'spouse_partner' ? (
              <View style={[styles.levelChip, styles.partnerChip]}>
                <Text style={[styles.levelChipText, styles.partnerChipText]}>Partner</Text>
              </View>
            ) : (
              <>
                {levelName && <View style={styles.levelChip}><Text style={styles.levelChipText}>{levelName}</Text></View>}
                {childAge !== null && <Text style={styles.ageText}>Age {childAge}</Text>}
              </>
            )}
          </View>
        </LinearGradient>

        {child.family_role !== 'spouse_partner' && pendingApprovals.length > 0 && (
          <View style={styles.approvalBanner}>
            <View style={styles.approvalBannerHeader}>
              <Clock size={15} color="#fbbf24" />
              <Text style={styles.approvalBannerTitle}>Needs Approval</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingApprovals.length}</Text></View>
            </View>
            {pendingApprovals.map(c => {
              const task = tasks.find(t => t.id === c.task_id);
              const busy = actionLoading === c.id;
              return (
                <View key={c.id} style={styles.approvalRow}>
                  <TaskIcon name={task?.icon ?? null} color={task?.color ?? null} />
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalTitle}>{task?.title ?? 'Task'}</Text>
                    <View style={styles.starRow}>
                      <Star size={10} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.approvalStars}>{c.stars_earned} star{c.stars_earned !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.approvalBtn, styles.approvalRejectBtn]} onPress={() => rejectCompletion(c.id)} disabled={busy}>
                    <CircleX size={13} color="#f87171" />
                    <Text style={styles.approvalRejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.approvalBtn, styles.approvalApproveBtn]} onPress={() => approveCompletion(c.id)} disabled={busy}>
                    {busy ? <ActivityIndicator size={12} color="#fff" /> : <CircleCheck size={13} color="#fff" />}
                    <Text style={styles.approvalApproveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

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
                {tasks.length === 0 && <Text style={styles.emptyMsg}>No tasks assigned yet.</Text>}
                {tasks.map((task, idx) => {
                  const completion = latestActiveCompletion(task.id);
                  const isPending = completion?.status === 'pending_approval';
                  const isApproved = completion?.status === 'approved';
                  const busyAward = actionLoading === 'award-' + task.id;
                  return (
                    <View key={task.id} style={[styles.taskRow, idx > 0 && styles.taskRowBorder]}>
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
                      ) : (
                        <TouchableOpacity style={[styles.compactBtn, styles.awardBtn, isApproved && styles.awardBtnDim]} onPress={() => awardStars(task)} disabled={busyAward}>
                          {busyAward ? <ActivityIndicator size={12} color="#fbbf24" /> : <Star size={13} color="#fbbf24" />}
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

            {activeTab === 'Rewards' && (
              <View>
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
    borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f', position: 'relative',
  },
  starsBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#78350f', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#b45309',
  },
  starsBadgeText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#fbbf24' },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    marginBottom: 14, borderWidth: 3, borderColor: '#2563eb',
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarFallbackText: { fontFamily: 'Nunito-ExtraBold', fontSize: 32, color: '#fff' },
  profileName: { fontFamily: 'Nunito-ExtraBold', fontSize: 26, color: '#f1f5f9', marginBottom: 10 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  levelChip: {
    backgroundColor: '#166534', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#16a34a',
  },
  levelChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#4ade80' },
  partnerChip: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  partnerChipText: { color: '#93c5fd' },
  groupChip: {
    backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#3b82f6',
  },
  groupChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#93c5fd' },
  ageText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },

  approvalBanner: {
    backgroundColor: '#1c1a0e', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#78350f',
  },
  approvalBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  approvalBannerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fbbf24', flex: 1 },
  badge: { backgroundColor: '#7c3500', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#fbbf24' },
  approvalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2d1f00',
  },
  approvalInfo: { flex: 1 },
  approvalTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#f1f5f9' },
  approvalStars: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#92400e' },
  approvalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7,
  },
  approvalRejectBtn: { backgroundColor: '#2d0a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  approvalRejectText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f87171' },
  approvalApproveBtn: { backgroundColor: '#166534' },
  approvalApproveText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },

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
  awardBtn: { backgroundColor: '#1c1a0e', borderWidth: 1, borderColor: '#78350f' },
  awardBtnDim: { opacity: 0.5 },
  awardBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fbbf24' },

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
});
