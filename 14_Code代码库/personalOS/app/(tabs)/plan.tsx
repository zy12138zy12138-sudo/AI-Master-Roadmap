import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskEditorModal } from '@/components/task-editor-modal';
import { WeeklyPlanView } from '@/components/weekly-plan-view';
import {
  createPersonalOsTask,
  DEFAULT_TASK_PRIORITY,
  deletePersonalOsTask,
  getPersonalOsTasks,
  rollOverOverduePersonalOsTasks,
  type PersonalOsTask,
  type TaskEditorValues,
  type TaskPriority,
  updatePersonalOsTask,
  updateTaskCompleted,
} from '@/src/database/tasks';
import {
  getLocalDateFromKey,
  getLocalDateKey,
  normalizeLocalDate,
  shiftLocalDate,
} from '@/src/utils/local-date';

type TaskLoadState = 'loading' | 'ready' | 'error';
type EditorMode = 'create' | 'edit';
type PlanViewMode = 'day' | 'week';

const DEFAULT_EDITOR_VALUES: TaskEditorValues = {
  title: '',
  priority: DEFAULT_TASK_PRIORITY,
};

const PALETTE = {
  background: '#F5F7FA',
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

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function formatSelectedDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}

export default function PlanScreen() {
  const db = useSQLiteContext();
  const palette = PALETTE;
  const priorityColors: Record<TaskPriority, { background: string; text: string }> = {
    P0: { background: palette.p0Background, text: palette.p0Text },
    P1: { background: palette.p1Background, text: palette.p1Text },
    P2: { background: palette.p2Background, text: palette.p2Text },
    P3: { background: palette.p3Background, text: palette.p3Text },
  };
  const [selectedDate, setSelectedDate] = useState(() => normalizeLocalDate(new Date()));
  const [viewMode, setViewMode] = useState<PlanViewMode>('day');
  const selectedDateKey = getLocalDateKey(selectedDate);
  const isToday = selectedDateKey === getLocalDateKey();
  const [tasks, setTasks] = useState<PersonalOsTask[]>([]);
  const [taskLoadState, setTaskLoadState] = useState<TaskLoadState>('loading');
  const [isDateSwitching, setIsDateSwitching] = useState(false);
  const [busyTaskIDs, setBusyTaskIDs] = useState<Set<string>>(() => new Set());
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingTaskID, setEditingTaskID] = useState<string | null>(null);
  const [editorInitialValues, setEditorInitialValues] =
    useState<TaskEditorValues>(DEFAULT_EDITOR_VALUES);
  const [editorScheduledDate, setEditorScheduledDate] = useState(selectedDate);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const selectedDateRef = useRef(selectedDate);
  const selectedDateKeyRef = useRef(selectedDateKey);
  const viewModeRef = useRef<PlanViewMode>(viewMode);
  const editorScheduledDateRef = useRef(editorScheduledDate);
  const busyTaskIDsRef = useRef<Set<string>>(new Set());
  const isHistoryToggleConfirmationOpenRef = useRef(false);
  const isSavingTaskRef = useRef(false);
  const isDateSwitchingRef = useRef(false);
  const hasLoadedTasksRef = useRef(false);
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const loadRequestIDRef = useRef(0);

  selectedDateRef.current = selectedDate;
  selectedDateKeyRef.current = selectedDateKey;
  viewModeRef.current = viewMode;
  editorScheduledDateRef.current = editorScheduledDate;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      loadRequestIDRef.current += 1;
    };
  }, []);

  const loadTasks = useCallback(
    async (
      dateKey: string,
      showLoading: boolean,
      rollOverOverdue = false,
    ): Promise<boolean> => {
      const requestID = ++loadRequestIDRef.current;
      const isCurrentDate = () => selectedDateKeyRef.current === dateKey;

      if (showLoading && isMountedRef.current && isFocusedRef.current && isCurrentDate()) {
        if (hasLoadedTasksRef.current) {
          isDateSwitchingRef.current = true;
          setIsDateSwitching(true);
        } else {
          setTaskLoadState('loading');
        }
      }

      try {
        if (rollOverOverdue) {
          await rollOverOverduePersonalOsTasks(db, getLocalDateKey());
        }

        const storedTasks = await getPersonalOsTasks(db, dateKey);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === loadRequestIDRef.current &&
          isCurrentDate()
        ) {
          setTasks(storedTasks);
          setTaskLoadState('ready');
          isDateSwitchingRef.current = false;
          setIsDateSwitching(false);
          hasLoadedTasksRef.current = true;
        }

        return true;
      } catch (error) {
        console.error(`读取计划任务失败：${dateKey}`, error);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === loadRequestIDRef.current &&
          isCurrentDate()
        ) {
          setTaskLoadState('error');
          isDateSwitchingRef.current = false;
          setIsDateSwitching(false);
        }

        return false;
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      if (viewModeRef.current === 'day') {
        void loadTasks(selectedDateKeyRef.current, true, true);
      }

      return () => {
        isFocusedRef.current = false;
        loadRequestIDRef.current += 1;
      };
    }, [loadTasks]),
  );

  const selectDate = (date: Date) => {
    const normalizedDate = normalizeLocalDate(date);
    const nextDateKey = getLocalDateKey(normalizedDate);

    if (nextDateKey === selectedDateKeyRef.current) {
      if (isFocusedRef.current) {
        void loadTasks(nextDateKey, false);
      }
      return;
    }

    selectedDateRef.current = normalizedDate;
    selectedDateKeyRef.current = nextDateKey;
    loadRequestIDRef.current += 1;
    setSelectedDate(normalizedDate);

    if (isFocusedRef.current) {
      void loadTasks(nextDateKey, true);
    }
  };

  const changeDateBy = (days: number) => {
    selectDate(shiftLocalDate(selectedDateRef.current, days));
  };

  const selectViewMode = (mode: PlanViewMode) => {
    if (mode === viewModeRef.current) {
      return;
    }

    viewModeRef.current = mode;
    setViewMode(mode);

    if (mode === 'day' && isFocusedRef.current) {
      void loadTasks(selectedDateKeyRef.current, true, true);
    }
  };

  const openDayFromWeek = (date: Date) => {
    selectDate(date);
    viewModeRef.current = 'day';
    setViewMode('day');
  };

  const setTaskEditorDate = (date: Date) => {
    const normalizedDate = normalizeLocalDate(date);
    editorScheduledDateRef.current = normalizedDate;
    setEditorScheduledDate(normalizedDate);
  };

  const lockTask = (taskID: string): boolean => {
    if (isDateSwitchingRef.current || busyTaskIDsRef.current.has(taskID)) {
      return false;
    }

    busyTaskIDsRef.current.add(taskID);

    if (isMountedRef.current) {
      setBusyTaskIDs((currentIDs) => new Set(currentIDs).add(taskID));
    }

    return true;
  };

  const unlockTask = (taskID: string) => {
    busyTaskIDsRef.current.delete(taskID);

    if (isMountedRef.current) {
      setBusyTaskIDs((currentIDs) => {
        const nextIDs = new Set(currentIDs);
        nextIDs.delete(taskID);
        return nextIDs;
      });
    }
  };

  const persistTaskCompletion = async (task: PersonalOsTask) => {
    if (!lockTask(task.id)) {
      return;
    }

    const operationDate = selectedDateKeyRef.current;

    try {
      await updateTaskCompleted(db, task.id, !task.completed);
      const refreshed = await loadTasks(operationDate, false);

      if (!refreshed && isMountedRef.current && selectedDateKeyRef.current === operationDate) {
        Alert.alert('刷新失败', '任务状态已保存，请稍后重试。');
      }
    } catch (error) {
      console.error(`更新计划任务完成状态失败：${task.id}`, error);

      if (isMountedRef.current) {
        Alert.alert('更新失败', '暂时无法更新任务状态，请稍后重试。');
      }
    } finally {
      unlockTask(task.id);
    }
  };

  const toggleTask = (task: PersonalOsTask) => {
    const isHistoricalCompletedTask =
      task.completed &&
      task.scheduledDate !== null &&
      task.scheduledDate < getLocalDateKey();

    if (!isHistoricalCompletedTask) {
      void persistTaskCompletion(task);
      return;
    }

    if (
      isHistoryToggleConfirmationOpenRef.current ||
      isDateSwitchingRef.current ||
      busyTaskIDsRef.current.has(task.id)
    ) {
      return;
    }

    isHistoryToggleConfirmationOpenRef.current = true;
    const closeConfirmation = () => {
      isHistoryToggleConfirmationOpenRef.current = false;
    };

    Alert.alert(
      '确认取消完成',
      '这是历史已完成任务。取消完成后将改变任务记录；如该日已保存复盘，已保存的统计不会随之更新。是否继续？',
      [
        { text: '取消', style: 'cancel', onPress: closeConfirmation },
        {
          text: '继续',
          style: 'destructive',
          onPress: () => {
            closeConfirmation();
            void persistTaskCompletion(task);
          },
        },
      ],
      { cancelable: true, onDismiss: closeConfirmation },
    );
  };

  const openCreateEditor = () => {
    if (isSavingTaskRef.current) {
      return;
    }

    setEditingTaskID(null);
    setEditorInitialValues(DEFAULT_EDITOR_VALUES);
    const today = normalizeLocalDate(new Date());
    setTaskEditorDate(selectedDateKeyRef.current < getLocalDateKey(today) ? today : selectedDateRef.current);
    setEditorMode('create');
  };

  const openEditEditor = (task: PersonalOsTask) => {
    if (
      isSavingTaskRef.current ||
      isDateSwitchingRef.current ||
      busyTaskIDsRef.current.has(task.id)
    ) {
      return;
    }

    setEditingTaskID(task.id);
    setEditorInitialValues({ title: task.title, priority: task.priority });
    setTaskEditorDate(
      task.scheduledDate ? getLocalDateFromKey(task.scheduledDate) : selectedDateRef.current,
    );
    setEditorMode('edit');
  };

  const closeEditor = () => {
    if (isSavingTaskRef.current) {
      return;
    }

    setEditorMode(null);
    setEditingTaskID(null);
  };

  const saveTask = async (values: TaskEditorValues) => {
    if (isSavingTaskRef.current || !editorMode) {
      return;
    }

    const mode = editorMode;
    const taskID = editingTaskID;
    const sourceDate = selectedDateKeyRef.current;
    const taskDate = editorScheduledDateRef.current;
    const operationDate = getLocalDateKey(taskDate);
    isSavingTaskRef.current = true;
    setIsSavingTask(true);

    try {
      if (mode === 'create') {
        await createPersonalOsTask(db, values, operationDate);
      } else {
        if (!taskID) {
          throw new Error('缺少需要编辑的任务标识。');
        }

        await updatePersonalOsTask(db, taskID, values, operationDate);
      }

      if (isMountedRef.current) {
        setEditorMode(null);
        setEditingTaskID(null);
      }

      if (mode === 'create' && selectedDateKeyRef.current !== operationDate) {
        selectDate(taskDate);
        return;
      }

      const refreshDate = mode === 'edit' ? sourceDate : operationDate;
      const refreshed = await loadTasks(refreshDate, false);

      if (!refreshed && isMountedRef.current && selectedDateKeyRef.current === refreshDate) {
        Alert.alert('刷新失败', '任务已保存，请稍后重试。');
      } else if (
        refreshed &&
        mode === 'edit' &&
        operationDate !== sourceDate &&
        isMountedRef.current
      ) {
        Alert.alert('任务已移动', `已保存至 ${operationDate}`);
      }
    } catch (error) {
      console.error(mode === 'create' ? '新增计划任务失败' : `编辑计划任务失败：${taskID}`, error);

      if (isMountedRef.current) {
        Alert.alert(
          mode === 'create' ? '新增失败' : '编辑失败',
          '暂时无法保存任务，请检查后重试。',
        );
      }
    } finally {
      isSavingTaskRef.current = false;

      if (isMountedRef.current) {
        setIsSavingTask(false);
      }
    }
  };

  const deleteTask = async (task: PersonalOsTask) => {
    if (!lockTask(task.id)) {
      return;
    }

    const operationDate = selectedDateKeyRef.current;

    try {
      await deletePersonalOsTask(db, task.id);
      const refreshed = await loadTasks(operationDate, false);

      if (!refreshed && isMountedRef.current && selectedDateKeyRef.current === operationDate) {
        Alert.alert('刷新失败', '任务已删除，请稍后重试。');
      }
    } catch (error) {
      console.error(`删除计划任务失败：${task.id}`, error);

      if (isMountedRef.current) {
        Alert.alert('删除失败', '暂时无法删除任务，请稍后重试。');
      }
    } finally {
      unlockTask(task.id);
    }
  };

  const confirmDeleteTask = (task: PersonalOsTask) => {
    if (isDateSwitchingRef.current || busyTaskIDsRef.current.has(task.id)) {
      return;
    }

    Alert.alert('删除任务', '确定删除这条任务吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void deleteTask(task),
      },
    ]);
  };

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.screenHeader}>
            <Text style={[styles.title, { color: palette.text }]}>计划</Text>
            <View
              accessibilityRole="tablist"
              style={[styles.viewToggle, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {(['day', 'week'] as const).map((mode) => {
                const selected = viewMode === mode;

                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={mode}
                    onPress={() => selectViewMode(mode)}
                    style={({ pressed }) => [
                      styles.viewToggleButton,
                      selected ? { backgroundColor: palette.accent } : undefined,
                      pressed ? styles.pressed : undefined,
                    ]}>
                    <Text
                      style={[
                        styles.viewToggleText,
                        { color: selected ? palette.onAccent : palette.secondaryText },
                      ]}>
                      {mode === 'day' ? '日视图' : '周视图'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {viewMode === 'day' ? (
            <>
              <View
            style={[
              styles.dateCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <View style={styles.dateHeading}>
              <View style={[styles.dateIcon, { backgroundColor: palette.accentSoft }]}>
                <MaterialIcons name="calendar-today" size={20} color={palette.accent} />
              </View>
              <View style={styles.dateTextContainer}>
                <Text style={[styles.dateEyebrow, { color: palette.accent }]}>当前计划日期</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.selectedDate, { color: palette.text }]}>
                  {formatSelectedDate(selectedDate)}
                </Text>
              </View>
            </View>

            <View style={styles.dateActions}>
              <Pressable
                accessibilityLabel="查看前一天"
                accessibilityRole="button"
                onPress={() => changeDateBy(-1)}
                style={({ pressed }) => [
                  styles.dateButton,
                  { backgroundColor: palette.accentSoft },
                  pressed ? styles.pressed : undefined,
                ]}>
                <MaterialIcons name="chevron-left" size={20} color={palette.accent} />
                <Text style={[styles.dateButtonText, { color: palette.accent }]}>前一天</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="回到今天"
                accessibilityRole="button"
                disabled={isToday}
                onPress={() => selectDate(new Date())}
                style={({ pressed }) => [
                  styles.dateButton,
                  styles.todayButton,
                  { borderColor: palette.border },
                  isToday ? styles.disabled : undefined,
                  pressed ? styles.pressed : undefined,
                ]}>
                <MaterialIcons name="today" size={18} color={palette.secondaryText} />
                <Text style={[styles.dateButtonText, { color: palette.secondaryText }]}>今天</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="查看后一天"
                accessibilityRole="button"
                onPress={() => changeDateBy(1)}
                style={({ pressed }) => [
                  styles.dateButton,
                  { backgroundColor: palette.accentSoft },
                  pressed ? styles.pressed : undefined,
                ]}>
                <Text style={[styles.dateButtonText, { color: palette.accent }]}>后一天</Text>
                <MaterialIcons name="chevron-right" size={20} color={palette.accent} />
              </Pressable>
            </View>
              </View>

              <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>当日任务</Text>
              <Text style={[styles.taskCount, { color: palette.secondaryText }]}>
                {taskLoadState === 'ready' ? `共 ${tasks.length} 项` : ' '}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`为${formatSelectedDate(selectedDate)}新增任务`}
              accessibilityRole="button"
              disabled={isSavingTask}
              onPress={openCreateEditor}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: palette.accent },
                isSavingTask ? styles.disabled : undefined,
                pressed ? styles.pressed : undefined,
              ]}>
              <MaterialIcons name="add" size={19} color={palette.onAccent} />
              <Text style={[styles.addButtonText, { color: palette.onAccent }]}>新增任务</Text>
            </Pressable>
              </View>

              <View style={styles.taskContent}>
            {taskLoadState === 'loading' ? (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Text style={[styles.statusText, { color: palette.secondaryText }]}>正在加载任务……</Text>
              </View>
            ) : null}

            {taskLoadState === 'error' ? (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <MaterialIcons name="error-outline" size={28} color={palette.danger} />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>任务加载失败</Text>
                <Text style={[styles.statusText, { color: palette.secondaryText }]}>请检查后重新加载</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadTasks(selectedDateKeyRef.current, true, true)}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: palette.accentSoft },
                    pressed ? styles.pressed : undefined,
                  ]}>
                  <Text style={[styles.retryButtonText, { color: palette.accent }]}>重新加载</Text>
                </Pressable>
              </View>
            ) : null}

            {taskLoadState === 'ready' && tasks.length === 0 ? (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <MaterialIcons name="event-available" size={28} color={palette.accent} />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>这一天还没有任务</Text>
                <Text style={[styles.statusText, { color: palette.secondaryText }]}>点击新增任务开始安排</Text>
              </View>
            ) : null}

            {taskLoadState === 'ready' && tasks.length > 0 ? (
              <View
                style={[
                  styles.taskList,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                {tasks.map((task, index) => {
                const isBusy = busyTaskIDs.has(task.id);
                const isInteractionDisabled = isBusy || isDateSwitching;
                const priorityColor = priorityColors[task.priority];

                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskRow,
                      index < tasks.length - 1
                        ? { borderBottomColor: palette.border, borderBottomWidth: 1 }
                        : undefined,
                      task.completed ? styles.completedRow : undefined,
                      isBusy ? styles.busyRow : undefined,
                    ]}>
                    <Pressable
                      accessibilityLabel={`${task.title}，${task.completed ? '已完成' : '未完成'}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.completed, disabled: isInteractionDisabled }}
                      disabled={isInteractionDisabled}
                      hitSlop={11}
                      onPress={() => void toggleTask(task)}
                      style={({ pressed }) => [
                        styles.checkboxButton,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: task.completed ? palette.accent : palette.secondaryText },
                          task.completed ? { backgroundColor: palette.accent } : undefined,
                        ]}>
                        {task.completed ? (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </Pressable>

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.taskTitle,
                        { color: task.completed ? palette.completed : palette.text },
                        task.completed ? styles.completedText : undefined,
                      ]}>
                      {task.title}
                    </Text>

                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: priorityColor.background },
                      ]}>
                      <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                        {task.priority}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityLabel={`编辑任务：${task.title}`}
                      accessibilityRole="button"
                      disabled={isInteractionDisabled}
                      hitSlop={8}
                      onPress={() => openEditEditor(task)}
                      style={({ pressed }) => [
                        styles.rowAction,
                        { backgroundColor: palette.accentSoft },
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <MaterialIcons name="edit" size={17} color={palette.accent} />
                    </Pressable>

                    <Pressable
                      accessibilityLabel={`删除任务：${task.title}`}
                      accessibilityRole="button"
                      disabled={isInteractionDisabled}
                      hitSlop={8}
                      onPress={() => confirmDeleteTask(task)}
                      style={({ pressed }) => [
                        styles.rowAction,
                        { backgroundColor: palette.dangerSoft },
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <MaterialIcons name="delete-outline" size={18} color={palette.danger} />
                    </Pressable>
                  </View>
                );
                })}
              </View>
            ) : null}

              </View>
            </>
          ) : (
            <WeeklyPlanView onSelectDate={openDayFromWeek} />
          )}
        </ScrollView>
      </SafeAreaView>

      <TaskEditorModal
        initialValues={editorInitialValues}
        mode={editorMode ?? 'create'}
        onCancel={closeEditor}
        onSelectScheduledDate={setTaskEditorDate}
        onSave={(values) => void saveTask(values)}
        saving={isSavingTask}
        scheduledDate={editorScheduledDate}
        showScheduledDate
        visible={editorMode !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  screenHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  viewToggle: {
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  viewToggleButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
  },
  dateHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dateIcon: {
    alignItems: 'center',
    borderRadius: 11,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  dateTextContainer: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  dateEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedDate: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dateButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  todayButton: {
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
  },
  taskCount: {
    fontSize: 13,
    marginTop: 3,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 11,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 13,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  taskList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskContent: {
    minHeight: 132,
  },
  statusCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 132,
    padding: 18,
  },
  statusText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 10,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 9,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 18,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkboxButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginHorizontal: 10,
    minWidth: 0,
  },
  completedRow: {
    opacity: 0.62,
  },
  busyRow: {
    opacity: 0.72,
  },
  completedText: {
    textDecorationLine: 'line-through',
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
  rowAction: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    marginLeft: 7,
    width: 30,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
