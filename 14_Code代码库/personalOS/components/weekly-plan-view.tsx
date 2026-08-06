import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  getPersonalOsTasksByDateRange,
  rollOverOverduePersonalOsTasks,
  type PersonalOsTask,
  type TaskPriority,
} from '@/src/database/tasks';
import {
  deletePersonalOsWeeklyGoal,
  getPersonalOsWeeklyGoal,
  MAX_WEEKLY_GOAL_LENGTH,
  type PersonalOsWeeklyGoal,
  savePersonalOsWeeklyGoal,
} from '@/src/database/weekly-goals';
import {
  getLocalDateKey,
  getLocalWeekRange,
  getLocalWeekStart,
  shiftLocalDate,
  shiftLocalWeek,
} from '@/src/utils/local-date';

type WeeklyPlanViewProps = {
  onSelectDate: (date: Date) => void;
};

type WeeklyLoadState = 'loading' | 'ready' | 'error';

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const PALETTE = {
  surface: '#FFFFFF',
  text: '#17202E',
  secondaryText: '#667085',
  border: '#E4E7EC',
  accent: '#2563EB',
  accentSoft: '#E8F0FF',
  onAccent: '#FFFFFF',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  p0Text: '#B42318',
  p0Background: '#FEE4E2',
  p1Text: '#B54708',
  p1Background: '#FEF0C7',
  p2Text: '#175CD3',
  p2Background: '#D1E9FF',
  p3Text: '#475467',
  p3Background: '#EAECF0',
  completed: '#98A2B3',
};

function formatWeekRange(startDate: Date, endDate: Date): string {
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日—${endDate.getMonth() + 1}月${endDate.getDate()}日`;
  }

  return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日—${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;
}

function formatDayDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function WeeklyPlanView({ onSelectDate }: WeeklyPlanViewProps) {
  const db = useSQLiteContext();
  const [weekStart, setWeekStart] = useState(() => getLocalWeekStart());
  const [tasks, setTasks] = useState<PersonalOsTask[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<PersonalOsWeeklyGoal | null>(null);
  const [loadState, setLoadState] = useState<WeeklyLoadState>('loading');
  const [isSwitchingWeek, setIsSwitchingWeek] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const weekStartRef = useRef(weekStart);
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const requestIDRef = useRef(0);
  const isEditingGoalRef = useRef(false);
  const isSavingGoalRef = useRef(false);
  const weekRange = useMemo(() => getLocalWeekRange(weekStart), [weekStart]);
  const currentWeekStartKey = getLocalDateKey(getLocalWeekStart());
  const isCurrentWeek = weekRange.startKey === currentWeekStartKey;
  const priorityColors: Record<TaskPriority, { background: string; text: string }> = {
    P0: { background: PALETTE.p0Background, text: PALETTE.p0Text },
    P1: { background: PALETTE.p1Background, text: PALETTE.p1Text },
    P2: { background: PALETTE.p2Background, text: PALETTE.p2Text },
    P3: { background: PALETTE.p3Background, text: PALETTE.p3Text },
  };

  weekStartRef.current = weekStart;
  isEditingGoalRef.current = isEditingGoal;

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shiftLocalDate(weekRange.startDate, index)),
    [weekRange.startDate],
  );
  const tasksByDate = useMemo(() => {
    const groupedTasks = new Map<string, PersonalOsTask[]>();

    for (const task of tasks) {
      if (!task.scheduledDate) {
        continue;
      }

      const dateTasks = groupedTasks.get(task.scheduledDate) ?? [];
      dateTasks.push(task);
      groupedTasks.set(task.scheduledDate, dateTasks);
    }

    return groupedTasks;
  }, [tasks]);
  const completedTaskCount = useMemo(
    () => tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0),
    [tasks],
  );
  const incompleteTaskCount = tasks.length - completedTaskCount;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedTaskCount / tasks.length) * 100);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIDRef.current += 1;
    };
  }, []);

  const loadWeek = useCallback(
    async (targetWeekStart: Date, showLoading: boolean): Promise<boolean> => {
      const normalizedWeekStart = getLocalWeekStart(targetWeekStart);
      const targetRange = getLocalWeekRange(normalizedWeekStart);
      const requestID = ++requestIDRef.current;
      const isCurrentRequestWeek = () =>
        getLocalDateKey(weekStartRef.current) === targetRange.startKey;

      if (showLoading && isMountedRef.current && isFocusedRef.current && isCurrentRequestWeek()) {
        setLoadState('loading');
        setIsSwitchingWeek(hasLoadedRef.current);
      }

      try {
        await rollOverOverduePersonalOsTasks(db, getLocalDateKey());
        const [storedTasks, storedGoal] = await Promise.all([
          getPersonalOsTasksByDateRange(db, targetRange.startKey, targetRange.nextWeekStartKey),
          getPersonalOsWeeklyGoal(db, targetRange.startKey),
        ]);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === requestIDRef.current &&
          isCurrentRequestWeek()
        ) {
          setTasks(storedTasks);
          setWeeklyGoal(storedGoal);
          setLoadState('ready');
          setIsSwitchingWeek(false);
          hasLoadedRef.current = true;

          if (!isEditingGoalRef.current) {
            setGoalDraft(storedGoal?.goalText ?? '');
          }
        }

        return true;
      } catch (error) {
        console.error(`读取周计划失败：${targetRange.startKey}`, error);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === requestIDRef.current &&
          isCurrentRequestWeek()
        ) {
          setLoadState('error');
          setIsSwitchingWeek(false);
        }

        return false;
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      void loadWeek(weekStartRef.current, !hasLoadedRef.current);

      return () => {
        isFocusedRef.current = false;
        requestIDRef.current += 1;
      };
    }, [loadWeek]),
  );

  const selectWeek = (date: Date) => {
    if (isSavingGoalRef.current) {
      return;
    }

    const nextWeekStart = getLocalWeekStart(date);
    const nextWeekStartKey = getLocalDateKey(nextWeekStart);

    setIsEditingGoal(false);
    isEditingGoalRef.current = false;
    setGoalDraft('');

    if (nextWeekStartKey === getLocalDateKey(weekStartRef.current)) {
      void loadWeek(nextWeekStart, false);
      return;
    }

    weekStartRef.current = nextWeekStart;
    requestIDRef.current += 1;
    setWeekStart(nextWeekStart);
    void loadWeek(nextWeekStart, true);
  };

  const beginGoalEdit = () => {
    if (isSwitchingWeek || isSavingGoalRef.current) {
      return;
    }

    setGoalDraft(weeklyGoal?.goalText ?? '');
    setIsEditingGoal(true);
    isEditingGoalRef.current = true;
  };

  const cancelGoalEdit = () => {
    if (isSavingGoalRef.current) {
      return;
    }

    setGoalDraft(weeklyGoal?.goalText ?? '');
    setIsEditingGoal(false);
    isEditingGoalRef.current = false;
  };

  const saveGoal = async () => {
    const normalizedGoal = goalDraft.trim();

    if (
      isSavingGoalRef.current ||
      normalizedGoal.length === 0 ||
      normalizedGoal.length > MAX_WEEKLY_GOAL_LENGTH
    ) {
      return;
    }

    const operationWeekStart = getLocalDateKey(weekStartRef.current);
    isSavingGoalRef.current = true;
    setIsSavingGoal(true);

    try {
      await savePersonalOsWeeklyGoal(db, operationWeekStart, normalizedGoal);
      setIsEditingGoal(false);
      isEditingGoalRef.current = false;
      const refreshed = await loadWeek(weekStartRef.current, false);

      if (!refreshed && isMountedRef.current) {
        Alert.alert('刷新失败', '本周目标已保存，请稍后重新进入周视图。');
      }
    } catch (error) {
      console.error(`保存本周目标失败：${operationWeekStart}`, error);

      if (isMountedRef.current) {
        Alert.alert('保存失败', '暂时无法保存本周目标，请稍后重试。');
      }
    } finally {
      isSavingGoalRef.current = false;

      if (isMountedRef.current) {
        setIsSavingGoal(false);
      }
    }
  };

  const deleteGoal = async () => {
    if (isSavingGoalRef.current || !weeklyGoal) {
      return;
    }

    const operationWeekStart = getLocalDateKey(weekStartRef.current);
    isSavingGoalRef.current = true;
    setIsSavingGoal(true);

    try {
      await deletePersonalOsWeeklyGoal(db, operationWeekStart);
      const refreshed = await loadWeek(weekStartRef.current, false);

      if (!refreshed && isMountedRef.current) {
        Alert.alert('刷新失败', '本周目标已删除，请稍后重新进入周视图。');
      }
    } catch (error) {
      console.error(`删除本周目标失败：${operationWeekStart}`, error);

      if (isMountedRef.current) {
        Alert.alert('删除失败', '暂时无法删除本周目标，请稍后重试。');
      }
    } finally {
      isSavingGoalRef.current = false;

      if (isMountedRef.current) {
        setIsSavingGoal(false);
      }
    }
  };

  const confirmDeleteGoal = () => {
    if (isSavingGoalRef.current || !weeklyGoal) {
      return;
    }

    Alert.alert('删除本周目标', '确定删除本周目标吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void deleteGoal() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.weekCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
        <View style={styles.weekHeading}>
          <View style={[styles.weekIcon, { backgroundColor: PALETTE.accentSoft }]}>
            <MaterialIcons name="date-range" size={21} color={PALETTE.accent} />
          </View>
          <View style={styles.weekTextContainer}>
            <Text style={[styles.weekEyebrow, { color: PALETTE.accent }]}>当前计划周</Text>
            <Text numberOfLines={1} style={[styles.weekTitle, { color: PALETTE.text }]}>
              {formatWeekRange(weekRange.startDate, weekRange.endDate)}
            </Text>
          </View>
        </View>

        <View style={styles.weekActions}>
          <Pressable
            accessibilityLabel="查看上一周"
            accessibilityRole="button"
            onPress={() => selectWeek(shiftLocalWeek(weekStartRef.current, -1))}
            style={({ pressed }) => [styles.weekButton, pressed ? styles.pressed : undefined]}>
            <MaterialIcons name="chevron-left" size={20} color={PALETTE.accent} />
            <Text style={[styles.weekButtonText, { color: PALETTE.accent }]}>上一周</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="回到本周"
            accessibilityRole="button"
            disabled={isCurrentWeek}
            onPress={() => selectWeek(getLocalWeekStart())}
            style={({ pressed }) => [
              styles.weekButton,
              styles.currentWeekButton,
              { borderColor: PALETTE.border },
              isCurrentWeek ? styles.disabled : undefined,
              pressed ? styles.pressed : undefined,
            ]}>
            <Text style={[styles.weekButtonText, { color: PALETTE.secondaryText }]}>本周</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="查看下一周"
            accessibilityRole="button"
            onPress={() => selectWeek(shiftLocalWeek(weekStartRef.current, 1))}
            style={({ pressed }) => [styles.weekButton, pressed ? styles.pressed : undefined]}>
            <Text style={[styles.weekButtonText, { color: PALETTE.accent }]}>下一周</Text>
            <MaterialIcons name="chevron-right" size={20} color={PALETTE.accent} />
          </Pressable>
        </View>
      </View>

      {loadState === 'loading' ? (
        <View style={[styles.statusCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
          <Text style={[styles.statusText, { color: PALETTE.secondaryText }]}>正在加载周计划……</Text>
        </View>
      ) : null}

      {loadState === 'error' ? (
        <View style={[styles.statusCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
          <MaterialIcons name="error-outline" size={28} color={PALETTE.danger} />
          <Text style={[styles.statusTitle, { color: PALETTE.text }]}>周计划加载失败</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadWeek(weekStartRef.current, true)}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: PALETTE.accentSoft },
              pressed ? styles.pressed : undefined,
            ]}>
            <Text style={[styles.retryText, { color: PALETTE.accent }]}>重新加载</Text>
          </Pressable>
        </View>
      ) : null}

      {loadState === 'ready' ? (
        <>
          <View style={styles.statsGrid}>
            {[
              ['总任务', tasks.length],
              ['已完成', completedTaskCount],
              ['未完成', incompleteTaskCount],
              ['完成率', `${completionRate}%`],
            ].map(([label, value]) => (
              <View
                key={label}
                style={[styles.statCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
                <Text style={[styles.statValue, { color: PALETTE.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: PALETTE.secondaryText }]}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.goalCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: PALETTE.text }]}>本周目标</Text>
                <Text style={[styles.sectionHint, { color: PALETTE.secondaryText }]}>每周保留一个核心目标</Text>
              </View>
              {!isEditingGoal ? (
                <Pressable
                  accessibilityLabel={weeklyGoal ? '编辑本周目标' : '新增本周目标'}
                  accessibilityRole="button"
                  disabled={isSwitchingWeek || isSavingGoal}
                  onPress={beginGoalEdit}
                  style={({ pressed }) => [
                    styles.goalActionButton,
                    { backgroundColor: PALETTE.accentSoft },
                    pressed ? styles.pressed : undefined,
                  ]}>
                  <MaterialIcons name={weeklyGoal ? 'edit' : 'add'} size={18} color={PALETTE.accent} />
                  <Text style={[styles.goalActionText, { color: PALETTE.accent }]}>
                    {weeklyGoal ? '编辑' : '新增'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {isEditingGoal ? (
              <>
                <TextInput
                  accessibilityLabel="本周目标"
                  editable={!isSavingGoal}
                  maxLength={MAX_WEEKLY_GOAL_LENGTH}
                  multiline
                  onChangeText={setGoalDraft}
                  placeholder="写下本周最重要的目标"
                  placeholderTextColor={PALETTE.secondaryText}
                  style={[
                    styles.goalInput,
                    {
                      backgroundColor: PALETTE.surface,
                      borderColor: PALETTE.border,
                      color: PALETTE.text,
                    },
                  ]}
                  value={goalDraft}
                />
                <Text style={[styles.goalCounter, { color: PALETTE.secondaryText }]}>
                  {goalDraft.length}/{MAX_WEEKLY_GOAL_LENGTH}
                </Text>
                <View style={styles.goalEditorActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSavingGoal}
                    onPress={cancelGoalEdit}
                    style={({ pressed }) => [
                      styles.editorButton,
                      { borderColor: PALETTE.border },
                      pressed ? styles.pressed : undefined,
                    ]}>
                    <Text style={[styles.editorButtonText, { color: PALETTE.text }]}>取消</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSavingGoal || goalDraft.trim().length === 0}
                    onPress={() => void saveGoal()}
                    style={({ pressed }) => [
                      styles.editorButton,
                      { backgroundColor: PALETTE.accent },
                      isSavingGoal || goalDraft.trim().length === 0 ? styles.disabled : undefined,
                      pressed ? styles.pressed : undefined,
                    ]}>
                    <Text style={[styles.editorButtonText, { color: PALETTE.onAccent }]}>
                      {isSavingGoal ? '保存中…' : '保存'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : weeklyGoal ? (
              <>
                <Text style={[styles.goalText, { color: PALETTE.text }]}>{weeklyGoal.goalText}</Text>
                <Pressable
                  accessibilityLabel="删除本周目标"
                  accessibilityRole="button"
                  disabled={isSavingGoal}
                  onPress={confirmDeleteGoal}
                  style={({ pressed }) => [styles.deleteGoalButton, pressed ? styles.pressed : undefined]}>
                  <MaterialIcons name="delete-outline" size={18} color={PALETTE.danger} />
                  <Text style={[styles.deleteGoalText, { color: PALETTE.danger }]}>删除目标</Text>
                </Pressable>
              </>
            ) : (
              <Text style={[styles.emptyGoalText, { color: PALETTE.secondaryText }]}>本周还没有目标</Text>
            )}
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: PALETTE.text }]}>周任务</Text>
              <Text style={[styles.sectionHint, { color: PALETTE.secondaryText }]}>点击日期进入日视图管理任务</Text>
            </View>
          </View>

          {tasks.length === 0 ? (
            <View style={[styles.emptyWeekCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
              <MaterialIcons name="event-available" size={28} color={PALETTE.accent} />
              <Text style={[styles.statusTitle, { color: PALETTE.text }]}>本周还没有任务</Text>
              <Text style={[styles.statusText, { color: PALETTE.secondaryText }]}>点击下面任意日期进入日视图安排</Text>
            </View>
          ) : null}

          <View style={styles.daysList}>
            {weekDates.map((date, index) => {
              const dateKey = getLocalDateKey(date);
              const dayTasks = tasksByDate.get(dateKey) ?? [];
              const isToday = dateKey === getLocalDateKey();

              return (
                <View
                  key={dateKey}
                  style={[styles.dayCard, { backgroundColor: PALETTE.surface, borderColor: PALETTE.border }]}>
                  <Pressable
                    accessibilityLabel={`打开${formatDayDate(date)}日视图`}
                    accessibilityRole="button"
                    onPress={() => onSelectDate(date)}
                    style={({ pressed }) => [styles.dayHeader, pressed ? styles.pressed : undefined]}>
                    <View>
                      <View style={styles.dayTitleRow}>
                        <Text style={[styles.dayWeekday, { color: PALETTE.text }]}>
                          {WEEKDAY_LABELS[index]}
                        </Text>
                        {isToday ? (
                          <View style={[styles.todayBadge, { backgroundColor: PALETTE.accentSoft }]}>
                            <Text style={[styles.todayBadgeText, { color: PALETTE.accent }]}>今天</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.dayDate, { color: PALETTE.secondaryText }]}>{formatDayDate(date)}</Text>
                    </View>
                    <View style={styles.dayHeaderRight}>
                      <Text style={[styles.dayCount, { color: PALETTE.secondaryText }]}>{dayTasks.length} 项</Text>
                      <MaterialIcons name="chevron-right" size={22} color={PALETTE.secondaryText} />
                    </View>
                  </Pressable>

                  {dayTasks.length === 0 ? (
                    <Text style={[styles.noDayTaskText, { color: PALETTE.secondaryText }]}>无任务</Text>
                  ) : (
                    <View style={[styles.dayTasks, { borderTopColor: PALETTE.border }]}>
                      {dayTasks.map((task) => {
                        const priorityColor = priorityColors[task.priority];

                        return (
                          <View key={task.id} style={[styles.weekTaskRow, task.completed ? styles.completedRow : undefined]}>
                            <MaterialIcons
                              name={task.completed ? 'check-circle' : 'radio-button-unchecked'}
                              size={17}
                              color={task.completed ? PALETTE.completed : PALETTE.accent}
                            />
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.weekTaskTitle,
                                { color: task.completed ? PALETTE.completed : PALETTE.text },
                                task.completed ? styles.completedText : undefined,
                              ]}>
                              {task.title}
                            </Text>
                            <View style={[styles.priorityBadge, { backgroundColor: priorityColor.background }]}>
                              <Text style={[styles.priorityText, { color: priorityColor.text }]}>{task.priority}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  weekCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  weekHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  weekIcon: {
    alignItems: 'center',
    borderRadius: 11,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  weekTextContainer: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  weekEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  weekButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
  },
  currentWeekButton: {
    borderWidth: 1,
  },
  weekButtonText: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  statusCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 132,
    padding: 18,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 9,
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 78,
    justifyContent: 'center',
    width: '48%',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: 4,
  },
  goalActionButton: {
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 11,
  },
  goalActionText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  goalInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  goalCounter: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  goalEditorActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  editorButton: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 84,
    paddingHorizontal: 14,
  },
  editorButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  emptyGoalText: {
    fontSize: 14,
    marginTop: 16,
  },
  deleteGoalButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: 14,
    minHeight: 36,
  },
  deleteGoalText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyWeekCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 128,
    padding: 18,
  },
  daysList: {
    gap: 12,
    marginTop: 14,
  },
  dayCard: {
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dayWeekday: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayDate: {
    fontSize: 12,
    marginTop: 4,
  },
  todayBadge: {
    borderRadius: 7,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dayCount: {
    fontSize: 13,
    marginRight: 2,
  },
  noDayTaskText: {
    fontSize: 13,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  dayTasks: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  weekTaskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 46,
    paddingVertical: 7,
  },
  weekTaskTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 9,
    minWidth: 0,
  },
  priorityBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  completedRow: {
    opacity: 0.65,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
