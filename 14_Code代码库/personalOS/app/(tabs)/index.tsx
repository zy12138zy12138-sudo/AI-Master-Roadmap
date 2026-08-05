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
import {
  createPersonalOsTask,
  DEFAULT_TASK_PRIORITY,
  deletePersonalOsTask,
  getPersonalOsTasks,
  type PersonalOsTask,
  type TaskEditorValues,
  type TaskPriority,
  updatePersonalOsTask,
  updateTaskCompleted,
} from '@/src/database/tasks';
import { getLocalDateFromKey, getLocalDateKey } from '@/src/utils/local-date';

type TaskLoadState = 'loading' | 'ready' | 'error';
type EditorMode = 'create' | 'edit';

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

function formatCurrentDate(date: Date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const palette = PALETTE;
  const priorityColors: Record<TaskPriority, { background: string; text: string }> = {
    P0: { background: palette.p0Background, text: palette.p0Text },
    P1: { background: palette.p1Background, text: palette.p1Text },
    P2: { background: palette.p2Background, text: palette.p2Text },
    P3: { background: palette.p3Background, text: palette.p3Text },
  };
  const [tasks, setTasks] = useState<PersonalOsTask[]>([]);
  const [taskLoadState, setTaskLoadState] = useState<TaskLoadState>('loading');
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [busyTaskIDs, setBusyTaskIDs] = useState<Set<string>>(() => new Set());
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingTaskID, setEditingTaskID] = useState<string | null>(null);
  const [editorInitialValues, setEditorInitialValues] =
    useState<TaskEditorValues>(DEFAULT_EDITOR_VALUES);
  const [editorScheduledDate, setEditorScheduledDate] = useState(() => new Date());
  const [isSavingTask, setIsSavingTask] = useState(false);
  const editorScheduledDateRef = useRef(editorScheduledDate);
  const busyTaskIDsRef = useRef<Set<string>>(new Set());
  const isSavingTaskRef = useRef(false);
  const isRefreshingTasksRef = useRef(false);
  const hasLoadedTasksRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadRequestIDRef = useRef(0);

  editorScheduledDateRef.current = editorScheduledDate;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      loadRequestIDRef.current += 1;
    };
  }, []);

  const loadTasks = useCallback(
    async (showLoading: boolean): Promise<boolean> => {
      const requestID = ++loadRequestIDRef.current;
      const todayDate = getLocalDateKey();

      if (showLoading && isMountedRef.current) {
        if (hasLoadedTasksRef.current) {
          isRefreshingTasksRef.current = true;
          setIsRefreshingTasks(true);
        } else {
          setTaskLoadState('loading');
        }
      }

      try {
        const storedTasks = await getPersonalOsTasks(db, todayDate);

        if (isMountedRef.current && requestID === loadRequestIDRef.current) {
          setTasks(storedTasks);
          setTaskLoadState('ready');
          isRefreshingTasksRef.current = false;
          setIsRefreshingTasks(false);
          hasLoadedTasksRef.current = true;
        }

        return true;
      } catch (error) {
        console.error('读取今日任务失败', error);

        if (isMountedRef.current && requestID === loadRequestIDRef.current) {
          setTaskLoadState('error');
          isRefreshingTasksRef.current = false;
          setIsRefreshingTasks(false);
        }

        return false;
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTasks(true);

      return () => {
        loadRequestIDRef.current += 1;
      };
    }, [loadTasks]),
  );

  const lockTask = (taskID: string): boolean => {
    if (isRefreshingTasksRef.current || busyTaskIDsRef.current.has(taskID)) {
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

  const setTaskEditorDate = (date: Date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);
    editorScheduledDateRef.current = normalizedDate;
    setEditorScheduledDate(normalizedDate);
  };

  const toggleTask = async (task: PersonalOsTask) => {
    if (!lockTask(task.id)) {
      return;
    }

    try {
      await updateTaskCompleted(db, task.id, !task.completed);
      const refreshed = await loadTasks(false);

      if (!refreshed && isMountedRef.current) {
        Alert.alert('刷新失败', '任务状态已保存，请重新打开 App 查看最新数据。');
      }
    } catch (error) {
      console.error(`更新任务完成状态失败：${task.id}`, error);

      if (isMountedRef.current) {
        Alert.alert('更新失败', '暂时无法更新任务状态，请稍后重试。');
      }
    } finally {
      unlockTask(task.id);
    }
  };

  const openCreateEditor = () => {
    if (isSavingTaskRef.current) {
      return;
    }

    setEditingTaskID(null);
    setEditorInitialValues(DEFAULT_EDITOR_VALUES);
    setTaskEditorDate(new Date());
    setEditorMode('create');
  };

  const openEditEditor = (task: PersonalOsTask) => {
    if (
      isSavingTaskRef.current ||
      isRefreshingTasksRef.current ||
      busyTaskIDsRef.current.has(task.id)
    ) {
      return;
    }

    setEditingTaskID(task.id);
    setEditorInitialValues({ title: task.title, priority: task.priority });
    setTaskEditorDate(
      task.scheduledDate ? getLocalDateFromKey(task.scheduledDate) : new Date(),
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
    const todayDate = getLocalDateKey();
    const operationDate = getLocalDateKey(editorScheduledDateRef.current);
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

      const refreshed = await loadTasks(false);

      if (!refreshed && isMountedRef.current) {
        Alert.alert('刷新失败', '任务已保存，请重新打开 App 查看最新数据。');
      } else if (refreshed && operationDate !== todayDate && isMountedRef.current) {
        Alert.alert('任务已保存', `已保存至 ${operationDate}`);
      }
    } catch (error) {
      console.error(mode === 'create' ? '新增任务失败' : `编辑任务失败：${taskID}`, error);

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

    try {
      await deletePersonalOsTask(db, task.id);
      const refreshed = await loadTasks(false);

      if (!refreshed && isMountedRef.current) {
        Alert.alert('刷新失败', '任务已删除，请重新打开 App 查看最新数据。');
      }
    } catch (error) {
      console.error(`删除任务失败：${task.id}`, error);

      if (isMountedRef.current) {
        Alert.alert('删除失败', '暂时无法删除任务，请稍后重试。');
      }
    } finally {
      unlockTask(task.id);
    }
  };

  const confirmDeleteTask = (task: PersonalOsTask) => {
    if (isRefreshingTasksRef.current || busyTaskIDsRef.current.has(task.id)) {
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

  const showComingSoon = () => {
    Alert.alert('提示', '将在后续版本开放');
  };

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>今天</Text>
            <Text style={[styles.date, { color: palette.secondaryText }]}>
              {formatCurrentDate(new Date())}
            </Text>
          </View>

          <View
            style={[
              styles.focusCard,
              { backgroundColor: palette.accentSoft, borderColor: palette.accent },
            ]}>
            <View style={[styles.focusIcon, { backgroundColor: palette.accent }]}>
              <MaterialIcons name="flag" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.focusTextContainer}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>今日重点</Text>
              <Text style={[styles.focusTitle, { color: palette.text }]}>完成 Personal OS MVP Day 1</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>今日任务</Text>
              {taskLoadState === 'ready' ? (
                <Text style={[styles.taskCount, { color: palette.secondaryText }]}>共 {tasks.length} 项</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="新增任务"
              accessibilityRole="button"
              onPress={openCreateEditor}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: palette.accent },
                pressed ? styles.pressed : undefined,
              ]}>
              <MaterialIcons name="add" size={19} color={palette.onAccent} />
              <Text style={[styles.addButtonText, { color: palette.onAccent }]}>新增任务</Text>
            </Pressable>
          </View>

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
              <Text style={[styles.statusText, { color: palette.secondaryText }]}>
                任务加载失败，请重新打开 App
              </Text>
            </View>
          ) : null}

          {taskLoadState === 'ready' && tasks.length === 0 ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <MaterialIcons name="task-alt" size={28} color={palette.accent} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>今天还没有任务</Text>
              <Text style={[styles.statusText, { color: palette.secondaryText }]}>
                点击新增任务开始安排今天
              </Text>
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
                const isInteractionDisabled = isBusy || isRefreshingTasks;
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
                      hitSlop={8}
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
                      <Text
                        style={[
                          styles.priorityText,
                          { color: priorityColor.text },
                        ]}>
                        {task.priority}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityLabel={`编辑任务：${task.title}`}
                      accessibilityRole="button"
                      disabled={isInteractionDisabled}
                      hitSlop={6}
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
                      hitSlop={6}
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

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={showComingSoon}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed ? styles.pressed : undefined,
              ]}>
              <MaterialIcons name="edit-note" size={24} color={palette.accent} />
              <Text style={[styles.actionText, { color: palette.text }]}>快速记录</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={showComingSoon}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed ? styles.pressed : undefined,
              ]}>
              <MaterialIcons name="chat-bubble-outline" size={22} color={palette.accent} />
              <Text style={[styles.actionText, { color: palette.text }]}>DeepSeek快捷助手</Text>
            </Pressable>
          </View>
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
  },
  header: {
    paddingBottom: 22,
    paddingTop: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 15,
    marginTop: 7,
  },
  focusCard: {
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: 16,
    flexDirection: 'row',
    padding: 18,
  },
  focusIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  focusTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  focusTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
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
    minHeight: 40,
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
  statusCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 112,
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
  actions: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 11,
  },
  pressed: {
    opacity: 0.72,
  },
});
