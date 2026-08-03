import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Priority = 'P0' | 'P1';

type TodayTask = {
  id: number;
  title: string;
  priority: Priority;
  completed: boolean;
};

const INITIAL_TASKS: TodayTask[] = [
  { id: 1, title: '检查 Windows 开发环境', priority: 'P0', completed: false },
  { id: 2, title: '创建 Personal OS Expo 项目', priority: 'P0', completed: false },
  { id: 3, title: '在 iPhone Expo Go 中运行', priority: 'P0', completed: false },
  { id: 4, title: '完成4个底部导航', priority: 'P1', completed: false },
  { id: 5, title: '完成 Day 1验收', priority: 'P1', completed: false },
];

const PALETTES = {
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#17202E',
    secondaryText: '#667085',
    border: '#E4E7EC',
    accent: '#2563EB',
    accentSoft: '#E8F0FF',
    p0Text: '#B42318',
    p0Background: '#FEE4E2',
    p1Text: '#B54708',
    p1Background: '#FEF0C7',
    completed: '#98A2B3',
  },
  dark: {
    background: '#0D1117',
    surface: '#161B22',
    text: '#F0F3F6',
    secondaryText: '#9DA7B3',
    border: '#30363D',
    accent: '#79A7FF',
    accentSoft: '#1C2F50',
    p0Text: '#FDA29B',
    p0Background: '#4A1D1F',
    p1Text: '#FEC84B',
    p1Background: '#473510',
    completed: '#768390',
  },
};

function formatCurrentDate(date: Date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const palette = PALETTES[colorScheme === 'dark' ? 'dark' : 'light'];
  const [tasks, setTasks] = useState<TodayTask[]>(INITIAL_TASKS);

  const toggleTask = (taskID: number) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskID ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const showComingSoon = () => {
    Alert.alert('提示', '将在后续版本开放');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
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
          <Text style={[styles.sectionTitle, { color: palette.text }]}>今日任务</Text>
          <Text style={[styles.taskCount, { color: palette.secondaryText }]}>共 {tasks.length} 项</Text>
        </View>

        <View
          style={[styles.taskList, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {tasks.map((task, index) => (
            <Pressable
              accessibilityLabel={`${task.title}，优先级${task.priority}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
              key={task.id}
              onPress={() => toggleTask(task.id)}
              style={({ pressed }) => [
                styles.taskRow,
                index < tasks.length - 1
                  ? { borderBottomColor: palette.border, borderBottomWidth: 1 }
                  : undefined,
                task.completed ? styles.completedRow : undefined,
                pressed ? styles.pressed : undefined,
              ]}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: task.completed ? palette.accent : palette.secondaryText },
                  task.completed ? { backgroundColor: palette.accent } : undefined,
                ]}>
                {task.completed ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
              </View>

              <Text
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
                  {
                    backgroundColor:
                      task.priority === 'P0' ? palette.p0Background : palette.p1Background,
                  },
                ]}>
                <Text
                  style={[
                    styles.priorityText,
                    { color: task.priority === 'P0' ? palette.p0Text : palette.p1Text },
                  ]}>
                  {task.priority}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

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
            <Text style={[styles.actionText, { color: palette.text }]}>ChatGPT快捷助手</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 14,
  },
  taskList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginHorizontal: 12,
  },
  completedRow: {
    opacity: 0.62,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '800',
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
