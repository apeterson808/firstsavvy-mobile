import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Star, Music, Bed, Trash2, Smile, Gift, Sparkles, Plane, ShoppingBag,
  Heart, Zap, BookOpen, Utensils, Hop as Home, CircleCheck, X,
  Dumbbell, Bike, ShoppingCart, Dog, Brush, Leaf, Sun, Moon, Gamepad2,
  Bath, Apple, Baby, Backpack, BicepsFlexed, Bird, Bone, Book, BrainCircuit,
  Bus, Calculator, Camera, Car, Cat, ChefHat, CircleDollarSign, Clipboard,
  Clock, Cloud, Coffee, Coins, Cookie, CookingPot, Crosshair, Crown, Drama,
  Droplets, Egg, Flame, Flower2, Glasses, GraduationCap, Headphones,
  IceCreamCone, Laptop, Layers, Lightbulb, List, Medal, Mic, Mountain,
  Paintbrush, Palette, PawPrint, Pencil, PersonStanding, Piano, Pizza,
  Puzzle, Rainbow, Rocket, School, Scissors, Shirt, Shrub, Snowflake, Soup,
  Sprout, Swords, Target, TestTube, Toilet, TreePine, Trophy, Tv, Umbrella,
  Volleyball, Waves, Wind, Wrench,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Task {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  star_reward: number | null;
}

interface TaskCompletion {
  id: string;
  task_id: string;
  status: string;
  stars_earned: number;
  note: string | null;
}

interface Reward {
  id: string;
  title: string;
  star_cost: number | null;
  image_url: string | null;
  icon: string | null;
  color: string | null;
  redemption_pending?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Music, Bed, Star, Trash2, Smile, Gift, Plane, ShoppingBag, Heart, Zap,
  BookOpen, Utensils, Home, Sparkles, Dumbbell, Bike, ShoppingCart, Dog,
  Brush, Leaf, Sun, Moon, Gamepad2, Bath, Apple, Baby, Backpack,
  BicepsFlexed, Bird, Bone, Book, BrainCircuit, Bus, Calculator, Camera,
  Car, Cat, ChefHat, CircleDollarSign, Clipboard, Clock, Cloud, Coffee,
  Coins, Cookie, CookingPot, Crosshair, Crown, Drama, Droplets, Egg, Flame,
  Flower2, Glasses, GraduationCap, Headphones, IceCreamCone, Laptop, Layers,
  Lightbulb, List, Medal, Mic, Mountain, Paintbrush, Palette, PawPrint,
  Pencil, PersonStanding, Piano, Pizza, Puzzle, Rainbow, Rocket, School,
  Scissors, Shirt, Shrub, Snowflake, Soup, Sprout, Swords, Target, TestTube,
  Toilet, TreePine, Trophy, Tv, Umbrella, Volleyball, Waves, Wind, Wrench,
};

function TaskIcon({ name, color, size = 20 }: { name: string | null; color: string | null; size?: number }) {
  const bg = color ?? '#60a5fa';
  const IconComp = name ? (ICON_MAP[name] ?? Star) : Star;
  return (
    <View style={[styles.taskIconWrap, { backgroundColor: bg + '25', borderColor: bg + '40' }]}>
      <IconComp size={size} color={bg} strokeWidth={2} />
    </View>
  );
}

// ─── Animated progress bar ───────────────────────────────────────────────────

function ProgressBar({ progress, unlocked }: { progress: number; unlocked: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={pbStyles.track}>
      <Animated.View
        style={[
          pbStyles.fill,
          { width },
          unlocked ? pbStyles.fillUnlocked : pbStyles.fillProgress,
        ]}
      />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {
    height: 6, borderRadius: 3, backgroundColor: '#1e293b',
    overflow: 'hidden', width: '100%',
  },
  fill: { height: '100%', borderRadius: 3 },
  fillProgress: { backgroundColor: '#f59e0b' },
  fillUnlocked: { backgroundColor: '#34d399' },
});

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#f59e0b', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c', '#e879f9'];
const CONFETTI_COUNT = 60;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  startX: number;
}

function Confetti({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const pieces = useRef<ConfettiPiece[]>([]);

  if (pieces.current.length === 0) {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      pieces.current.push({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        startX: Math.random() * SCREEN_WIDTH,
      });
    }
  }

  useEffect(() => {
    if (!visible) return;
    const anims = pieces.current.map((p, i) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(1);

      const dx = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
      const dy = SCREEN_HEIGHT * 0.6 + Math.random() * SCREEN_HEIGHT * 0.4;
      const delay = i * 18;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.x, { toValue: dx, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: dy, duration: 1200 + Math.random() * 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.rotate, { toValue: 6 + Math.random() * 8, duration: 1400, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(anims).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {pieces.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            confettiStyles.piece,
            {
              left: p.startX,
              top: SCREEN_HEIGHT * 0.25,
              width: p.size,
              height: p.size * (Math.random() > 0.5 ? 2 : 1),
              borderRadius: Math.random() > 0.5 ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 10],
                    outputRange: ['0deg', '720deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0,
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
    zIndex: 999,
  },
  piece: { position: 'absolute' },
});

// ─── Reward unlock celebration modal ────────────────────────────────────────

function RewardUnlockedModal({
  reward,
  onClose,
}: {
  reward: Reward | null;
  onClose: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reward) {
      setShowConfetti(true);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.6);
      fadeAnim.setValue(0);
    }
  }, [reward]);

  if (!reward) return null;

  const IconComp = reward.icon ? (ICON_MAP[reward.icon] ?? Star) : Star;
  const bg = reward.color ?? '#f59e0b';

  return (
    <>
      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
      <Modal transparent visible={!!reward} animationType="fade" onRequestClose={onClose}>
        <Pressable style={unlockStyles.overlay} onPress={onClose}>
          <Animated.View
            style={[unlockStyles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          >
            <Pressable onPress={() => {}}>
              <Text style={unlockStyles.emoji}>🎉</Text>
              <Text style={unlockStyles.headline}>You can earn this!</Text>
              <Text style={unlockStyles.sub}>You now have enough stars for</Text>

              <View style={[unlockStyles.iconWrap, { backgroundColor: bg + '25', borderColor: bg + '50' }]}>
                {reward.image_url ? (
                  <Image source={{ uri: reward.image_url }} style={unlockStyles.rewardImg} />
                ) : (
                  <IconComp size={44} color={bg} strokeWidth={1.5} />
                )}
              </View>

              <Text style={unlockStyles.rewardName}>{reward.title}</Text>

              <View style={unlockStyles.starsPill}>
                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                <Text style={unlockStyles.starsText}>{reward.star_cost} stars</Text>
              </View>

              <TouchableOpacity style={unlockStyles.btn} onPress={onClose} activeOpacity={0.85}>
                <Text style={unlockStyles.btnText}>Awesome!</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const unlockStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#131c2e', borderRadius: 28,
    padding: 32, alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: '#f59e0b40',
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  headline: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 28, color: '#f59e0b',
    textAlign: 'center', marginBottom: 6,
  },
  sub: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8',
    textAlign: 'center', marginBottom: 20,
  },
  iconWrap: {
    width: 100, height: 100, borderRadius: 28, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 16, overflow: 'hidden',
  },
  rewardImg: { width: 100, height: 100 },
  rewardName: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#f1f5f9',
    textAlign: 'center', marginBottom: 12,
  },
  starsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#f59e0b40',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30,
    marginBottom: 24,
  },
  starsText: { fontFamily: 'Nunito-ExtraBold', fontSize: 18, color: '#f59e0b' },
  btn: {
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center',
  },
  btnText: { fontFamily: 'Nunito-ExtraBold', fontSize: 18, color: '#000' },
});

export default function ChildHomeScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { activeChild, setActiveChild, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [childData, setChildData] = useState<{ child_name: string; avatar_url: string | null; stars_balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ task: Task; note: string; stars: number } | null>(null);
  const [unlockedReward, setUnlockedReward] = useState<Reward | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const prevStarsRef = useRef<number | null>(null);
  const pagerRef = useRef<ScrollView>(null);

  const resolvedChildId = childId ?? activeChild?.id;

  useEffect(() => { load(); }, [resolvedChildId]);

  async function load() {
    if (!resolvedChildId) { setLoading(false); return; }
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${supabaseUrl}/functions/v1/get-child-data?childId=${resolvedChildId}`,
      { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
    );
    const json = await res.json();
    const newStars: number = json.child?.stars_balance ?? 0;
    const newRewards: Reward[] = json.rewards ?? [];

    // Check if any reward just became affordable
    if (prevStarsRef.current !== null && newStars > prevStarsRef.current) {
      const justUnlocked = newRewards.find(r => {
        const cost = r.star_cost ?? 0;
        return cost > 0 && prevStarsRef.current! < cost && newStars >= cost;
      });
      if (justUnlocked) setUnlockedReward(justUnlocked);
    }
    prevStarsRef.current = newStars;

    setChildData(json.child ?? null);
    setTasks(json.tasks ?? []);
    setCompletions(json.completions ?? []);
    setRewards(newRewards);
    setLoading(false);
    setRefreshing(false);
  }

  async function submitCompletion() {
    if (!resolvedChildId || !selectedTask) return;
    setSubmitting(selectedTask.id);
    setSubmitError(null);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/get-child-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId: resolvedChildId,
          taskId: selectedTask.id,
          starsEarned: selectedTask.star_reward ?? 1,
          note: submitNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSubmitError(json.error ?? 'Something went wrong. Try again.');
        setSubmitting(null);
        return;
      }
      setSubmitting(null);
      setSelectedTask(null);
      setSubmitNote('');
      load();
    } catch {
      setSubmitError('Network error. Please try again.');
      setSubmitting(null);
    }
  }

  async function redeemReward() {
    if (!resolvedChildId || !redeemTarget) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/get-child-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'redeem',
          childId: resolvedChildId,
          rewardId: redeemTarget.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setRedeemError(json.error ?? 'Something went wrong. Try again.');
        setRedeeming(false);
        return;
      }
      setRedeemTarget(null);
      setRedeemError(null);
      load();
    } catch {
      setRedeemError('Network error. Please try again.');
    } finally {
      setRedeeming(false);
    }
  }

  function taskStatus(taskId: string): 'pending' | 'approved' | 'none' {
    const pending = completions.find(c => c.task_id === taskId && c.status === 'pending');
    if (pending) return 'pending';
    const approved = completions.find(c => c.task_id === taskId && c.status === 'approved');
    if (approved) return 'approved';
    return 'none';
  }

  function taskCompletion(taskId: string): TaskCompletion | undefined {
    return completions.find(c => c.task_id === taskId && (c.status === 'approved' || c.status === 'pending'));
  }

  function onPageScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePage(page);
  }

  function goToPage(page: number) {
    pagerRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setActivePage(page);
  }

  const childName = childData?.child_name ?? activeChild?.child_name ?? 'Explorer';
  const firstName = childName.split(' ')[0];
  const stars = childData?.stars_balance ?? activeChild?.stars_balance ?? 0;
  const avatarUrl = childData?.avatar_url ?? null;

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color="#f59e0b" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Fixed top section */}
      <View style={styles.fixedTop}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{firstName[0]}</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hi, {firstName}!</Text>
              <Text style={styles.tagline}>Ready to earn some stars?</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setActiveChild(null);
              if (profile) {
                router.replace('/(tabs)/kids');
              } else {
                router.replace('/(auth)/login');
              }
            }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Stars card */}
        <View style={styles.starsCard}>
          <View style={styles.starsCardInner}>
            <Star size={36} color="#f59e0b" fill="#f59e0b" />
            <View>
              <Text style={styles.starsLabel}>YOUR STARS</Text>
              <Text style={styles.starsValue}>{stars}</Text>
            </View>
          </View>
        </View>

        {/* Page dots */}
        <View style={styles.pageDots}>
          <TouchableOpacity onPress={() => goToPage(0)} style={styles.dotWrap}>
            <View style={[styles.dot, activePage === 0 && styles.dotActive]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToPage(1)} style={styles.dotWrap}>
            <View style={[styles.dot, activePage === 1 && styles.dotActive]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal pager */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPageScroll}
        style={styles.pager}
      >
        {/* Page 1: Tasks */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.pageContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Tasks</Text>
          </View>

          <View style={styles.taskList}>
            {tasks.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tasks assigned yet!</Text>
              </View>
            )}
            {tasks.map(task => {
              const status = taskStatus(task.id);
              const completion = taskCompletion(task.id);
              const hasNote = status === 'approved' && !!completion?.note;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, status !== 'none' && styles.taskCardDone]}
                  onPress={() => {
                    if (status === 'none') setSelectedTask(task);
                    else if (hasNote && completion) setNoteModal({ task, note: completion.note!, stars: completion.stars_earned });
                  }}
                  disabled={status === 'pending'}
                  activeOpacity={0.75}
                >
                  <TaskIcon name={task.icon} color={task.color} />
                  <Text style={[styles.taskTitle, status !== 'none' && styles.taskTitleMuted]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <View style={styles.taskRight}>
                    {status === 'pending' && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    )}
                    {status === 'approved' && (
                      <View style={styles.approvedBadge}>
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.approvedBadgeText}>+{completion?.stars_earned ?? task.star_reward ?? 1}</Text>
                        {hasNote && <View style={styles.noteDot} />}
                      </View>
                    )}
                    {status === 'none' && (
                      <View style={styles.starReward}>
                        <Star size={14} color="#f59e0b" strokeWidth={1.5} />
                        <Text style={styles.starRewardText}>{task.star_reward ?? 1}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Page 2: Rewards */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rewards</Text>
          </View>

          <View style={styles.taskList}>
            {rewards.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No rewards yet!</Text>
              </View>
            )}
            {rewards.map(reward => {
              const cost = reward.star_cost ?? 0;
              const canAfford = cost > 0 && stars >= cost;
              const progress = cost > 0 ? Math.min(stars / cost, 1) : 1;
              const remaining = Math.max(cost - stars, 0);

              return (
                <TouchableOpacity
                  key={reward.id}
                  style={[styles.rewardCard, canAfford && styles.rewardCardUnlocked]}
                  onPress={() => canAfford && !reward.redemption_pending ? setRedeemTarget(reward) : null}
                  activeOpacity={canAfford && !reward.redemption_pending ? 0.75 : 1}
                >
                  <View style={styles.rewardCardTop}>
                    {reward.image_url ? (
                      <Image source={{ uri: reward.image_url }} style={styles.rewardThumb} />
                    ) : (
                      <TaskIcon name={reward.icon} color={reward.color} />
                    )}
                    <View style={styles.rewardCardInfo}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{reward.title}</Text>
                      <View style={styles.rewardCostRow}>
                        <Star size={13} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.rewardCostText}>{cost} stars</Text>
                        {canAfford ? (
                          reward.redemption_pending ? (
                            <View style={styles.pendingRedeemBadge}>
                              <Text style={styles.pendingRedeemText}>Requested!</Text>
                            </View>
                          ) : (
                            <View style={styles.unlockedBadge}>
                              <Text style={styles.unlockedBadgeText}>Tap to redeem</Text>
                            </View>
                          )
                        ) : (
                          <Text style={styles.remainingText}>{remaining} to go</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <ProgressBar progress={progress} unlocked={canAfford} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Task completion modal */}
      <Modal
        visible={!!selectedTask}
        transparent
        animationType="slide"
        onRequestClose={() => { setSelectedTask(null); setSubmitNote(''); setSubmitError(null); }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => { setSelectedTask(null); setSubmitNote(''); setSubmitError(null); }}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {/* Close button */}
            <TouchableOpacity style={styles.sheetClose} onPress={() => { setSelectedTask(null); setSubmitNote(''); setSubmitError(null); }}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Task icon */}
            <View style={[
              styles.modalIconWrap,
              { backgroundColor: (selectedTask?.color ?? '#60a5fa') + '20', borderColor: (selectedTask?.color ?? '#60a5fa') + '40' }
            ]}>
              {(() => {
                const IconComp = selectedTask?.icon ? (ICON_MAP[selectedTask.icon] ?? Star) : Star;
                return <IconComp size={36} color={selectedTask?.color ?? '#60a5fa'} strokeWidth={1.5} />;
              })()}
            </View>

            <Text style={styles.modalTaskTitle}>{selectedTask?.title}</Text>
            <Text style={styles.modalSubtitle}>Complete this task to earn stars!</Text>

            {/* Stars reward pill */}
            <View style={styles.modalStarsPill}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.modalStarsText}>
                {selectedTask?.star_reward ?? 1} {(selectedTask?.star_reward ?? 1) === 1 ? 'star' : 'stars'}
              </Text>
            </View>

            {/* Optional note to parent */}
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note for your parent... (optional)"
              placeholderTextColor="#475569"
              value={submitNote}
              onChangeText={setSubmitNote}
              maxLength={200}
              returnKeyType="done"
            />

            {submitError ? (
              <Text style={styles.modalError}>{submitError}</Text>
            ) : (
              <Text style={styles.modalNote}>
                Your parent will review and approve your submission.
              </Text>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting === selectedTask?.id && styles.submitBtnDisabled]}
              onPress={submitCompletion}
              disabled={!!submitting}
              activeOpacity={0.85}
            >
              {submitting === selectedTask?.id ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <CircleCheck size={20} color="#000" strokeWidth={2.5} />
                  <Text style={styles.submitBtnText}>Submit for Approval</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelectedTask(null); setSubmitNote(''); setSubmitError(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Redeem reward sheet */}
      <Modal
        visible={!!redeemTarget}
        transparent
        animationType="slide"
        onRequestClose={() => { setRedeemTarget(null); setRedeemError(null); }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => { setRedeemTarget(null); setRedeemError(null); }}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => { setRedeemTarget(null); setRedeemError(null); }}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Reward icon */}
            <View style={[
              styles.modalIconWrap,
              { backgroundColor: (redeemTarget?.color ?? '#34d399') + '20', borderColor: (redeemTarget?.color ?? '#34d399') + '40' }
            ]}>
              {redeemTarget?.image_url ? (
                <Image source={{ uri: redeemTarget.image_url }} style={{ width: 80, height: 80, borderRadius: 20 }} />
              ) : (() => {
                const IconComp = redeemTarget?.icon ? (ICON_MAP[redeemTarget.icon] ?? Gift) : Gift;
                return <IconComp size={36} color={redeemTarget?.color ?? '#34d399'} strokeWidth={1.5} />;
              })()}
            </View>

            <Text style={styles.modalTaskTitle}>{redeemTarget?.title}</Text>
            <Text style={styles.modalSubtitle}>Ask your parent to approve this reward!</Text>

            <View style={styles.modalStarsPill}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.modalStarsText}>
                {redeemTarget?.star_cost ?? 0} stars
              </Text>
            </View>

            {redeemError ? (
              <Text style={styles.modalError}>{redeemError}</Text>
            ) : (
              <Text style={styles.modalNote}>
                Your parent will get a notification to approve your request.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#34d399' }, redeeming && styles.submitBtnDisabled]}
              onPress={redeemReward}
              disabled={redeeming}
              activeOpacity={0.85}
            >
              {redeeming ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Gift size={20} color="#000" strokeWidth={2.5} />
                  <Text style={styles.submitBtnText}>Request Reward</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setRedeemTarget(null); setRedeemError(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reward unlocked celebration */}
      <RewardUnlockedModal
        reward={unlockedReward}
        onClose={() => setUnlockedReward(null)}
      />

      {/* Parent note modal */}
      <Modal
        visible={!!noteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNoteModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => setNoteModal(null)}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={[styles.modalIconWrap, { backgroundColor: (noteModal?.task.color ?? '#f59e0b') + '20', borderColor: (noteModal?.task.color ?? '#f59e0b') + '40' }]}>
              {(() => {
                const IconComp = noteModal?.task.icon ? (ICON_MAP[noteModal.task.icon] ?? Star) : Star;
                return <IconComp size={36} color={noteModal?.task.color ?? '#f59e0b'} strokeWidth={1.5} />;
              })()}
            </View>

            <Text style={styles.modalTaskTitle}>{noteModal?.task.title}</Text>

            <View style={styles.modalStarsPill}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.modalStarsText}>+{noteModal?.stars} stars earned!</Text>
            </View>

            <View style={styles.noteFromParent}>
              <Text style={styles.noteFromParentLabel}>Message from your parent</Text>
              <Text style={styles.noteFromParentText}>{noteModal?.note}</Text>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setNoteModal(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1117' },

  fixedTop: { paddingHorizontal: 16, paddingTop: 4 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#f59e0b' },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1e3a5f', borderWidth: 2, borderColor: '#f59e0b',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#f59e0b' },
  headerText: { flex: 1 },
  greeting: { fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#f1f5f9', lineHeight: 26 },
  tagline: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginTop: 1 },
  logoutBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1,
    borderColor: '#334155', backgroundColor: '#1e293b',
  },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#94a3b8' },

  // Stars card
  starsCard: {
    borderRadius: 18, marginBottom: 14, overflow: 'hidden',
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#f59e0b40',
  },
  starsCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, backgroundColor: 'rgba(245,158,11,0.08)',
  },
  starsLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#f59e0b',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  starsValue: { fontFamily: 'Nunito-ExtraBold', fontSize: 44, color: '#f59e0b', lineHeight: 52 },

  // Page dots
  pageDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 14 },
  dotWrap: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  dotActive: { backgroundColor: '#f59e0b', width: 24 },

  // Pager
  pager: { flex: 1 },
  pageContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
  },
  rewardIconBg: { backgroundColor: '#0d6b3e' },
  sectionTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 18, color: '#f1f5f9' },


  // Task list
  taskList: { gap: 8 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#131c2e', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#1e293b',
  },
  taskCardDone: { opacity: 0.55 },
  taskIconWrap: {
    width: 42, height: 42, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  taskTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#e2e8f0', flex: 1 },
  taskTitleMuted: { color: '#475569' },
  taskRight: { flexShrink: 0 },
  starReward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starRewardText: { fontFamily: 'Nunito-ExtraBold', fontSize: 15, color: '#f59e0b' },
  pendingBadge: {
    backgroundColor: '#1c1a0e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  pendingBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#f59e0b' },
  approvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#0d1f12', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  approvedBadgeText: { fontFamily: 'Nunito-ExtraBold', fontSize: 13, color: '#4ade80' },
  noteDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#60a5fa', marginLeft: 2,
  },
  rewardThumb: { width: 42, height: 42, borderRadius: 10 },
  emptyCard: {
    backgroundColor: '#131c2e', borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#131c2e',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', marginBottom: 20,
  },
  sheetClose: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  modalTaskTitle: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 24, color: '#f1f5f9',
    textAlign: 'center', marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b',
    textAlign: 'center', marginBottom: 20,
  },
  modalStarsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#f59e0b40',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 40,
    marginBottom: 20,
  },
  modalStarsText: {
    fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#f59e0b',
  },
  noteInput: {
    width: '100%', backgroundColor: '#0f1e33', borderWidth: 1, borderColor: '#1e3a5f',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#e2e8f0',
    marginBottom: 14,
  },
  modalNote: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569',
    textAlign: 'center', marginBottom: 28, paddingHorizontal: 16,
  },
  modalError: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#f87171',
    textAlign: 'center', marginBottom: 28, paddingHorizontal: 16,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Nunito-ExtraBold', fontSize: 17, color: '#000' },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#475569' },
  noteFromParent: {
    width: '100%', backgroundColor: '#0d1a2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e3a5f',
    padding: 16, marginBottom: 24, marginTop: 8,
  },
  noteFromParentLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#60a5fa',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  noteFromParentText: {
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#e2e8f0', lineHeight: 22,
  },

  // Reward cards with progress
  rewardCard: {
    backgroundColor: '#131c2e', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#1e293b',
    gap: 10,
  },
  rewardCardUnlocked: {
    borderColor: '#34d39940', backgroundColor: '#0d1f14',
  },
  rewardCardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  rewardCardInfo: { flex: 1 },
  rewardCostRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3,
  },
  rewardCostText: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#94a3b8',
  },
  remainingText: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: '#475569',
    marginLeft: 2,
  },
  unlockedBadge: {
    backgroundColor: '#0d2918', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginLeft: 4,
  },
  unlockedBadgeText: {
    fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#34d399',
  },
  pendingRedeemBadge: {
    backgroundColor: '#1a1200', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginLeft: 4, borderWidth: 1, borderColor: '#f59e0b40',
  },
  pendingRedeemText: {
    fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#f59e0b',
  },
  progressTrack: { width: '100%' },
});
