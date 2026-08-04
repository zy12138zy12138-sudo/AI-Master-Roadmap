import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import {
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  type TaskEditorValues,
  type TaskPriority,
} from '@/src/database/tasks';

type TaskEditorModalProps = {
  initialValues: TaskEditorValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSave: (values: TaskEditorValues) => void;
  saving: boolean;
  visible: boolean;
};

const PALETTES = {
  light: {
    overlay: 'rgba(16, 24, 40, 0.48)',
    surface: '#FFFFFF',
    text: '#17202E',
    secondaryText: '#667085',
    border: '#D0D5DD',
    inputBackground: '#FFFFFF',
    accent: '#2563EB',
    accentSoft: '#E8F0FF',
    onAccent: '#FFFFFF',
  },
  dark: {
    overlay: 'rgba(0, 0, 0, 0.68)',
    surface: '#161B22',
    text: '#F0F3F6',
    secondaryText: '#9DA7B3',
    border: '#3B434E',
    inputBackground: '#0D1117',
    accent: '#79A7FF',
    accentSoft: '#1C2F50',
    onAccent: '#0D1117',
  },
};

const PRIORITY_DESCRIPTIONS: Record<TaskPriority, string> = {
  P0: '当天必须完成（建议 1—2 项）',
  P1: '推动核心目标的重要任务',
  P2: '常规执行任务（默认）',
  P3: '低收益、提醒或有余力再做',
};

export function TaskEditorModal({
  initialValues,
  mode,
  onCancel,
  onSave,
  saving,
  visible,
}: TaskEditorModalProps) {
  const colorScheme = useColorScheme();
  const palette = PALETTES[colorScheme === 'dark' ? 'dark' : 'light'];
  const [title, setTitle] = useState(initialValues.title);
  const [priority, setPriority] = useState<TaskPriority>(initialValues.priority);
  const normalizedTitle = title.trim();
  const canSave = normalizedTitle.length > 0 && normalizedTitle.length <= MAX_TASK_TITLE_LENGTH;
  const titleHelper =
    title.length > 0 && normalizedTitle.length === 0
      ? '标题不能只包含空格'
      : `${title.length}/${MAX_TASK_TITLE_LENGTH}`;

  useEffect(() => {
    if (visible) {
      setTitle(initialValues.title);
      setPriority(initialValues.priority);
    }
  }, [initialValues.priority, initialValues.title, visible]);

  const submit = () => {
    if (!saving && canSave) {
      onSave({ title: normalizedTitle, priority });
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={saving ? undefined : onCancel}
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: palette.overlay }]}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: palette.accentSoft }]}>
              <MaterialIcons
                name={mode === 'create' ? 'add-task' : 'edit'}
                size={22}
                color={palette.accent}
              />
            </View>
            <Text style={[styles.heading, { color: palette.text }]}>
              {mode === 'create' ? '新增任务' : '编辑任务'}
            </Text>
          </View>

          <Text style={[styles.label, { color: palette.text }]}>任务标题</Text>
          <TextInput
            accessibilityLabel="任务标题"
            autoFocus
            editable={!saving}
            maxLength={MAX_TASK_TITLE_LENGTH}
            onChangeText={setTitle}
            onSubmitEditing={submit}
            placeholder="请输入任务标题"
            placeholderTextColor={palette.secondaryText}
            returnKeyType="done"
            selectionColor={palette.accent}
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBackground,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={title}
          />
          <Text style={[styles.counter, { color: palette.secondaryText }]}>
            {titleHelper}
          </Text>

          <Text style={[styles.label, styles.priorityLabel, { color: palette.text }]}>优先级</Text>
          <View style={styles.priorityOptions}>
            {TASK_PRIORITIES.map((option) => {
              const selected = priority === option;

              return (
                <Pressable
                  accessibilityLabel={`${option}，${PRIORITY_DESCRIPTIONS[option]}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: saving }}
                  disabled={saving}
                  key={option}
                  onPress={() => setPriority(option)}
                  style={({ pressed }) => [
                    styles.priorityOption,
                    {
                      backgroundColor: selected ? palette.accentSoft : palette.inputBackground,
                      borderColor: selected ? palette.accent : palette.border,
                    },
                    pressed ? styles.pressed : undefined,
                  ]}>
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={16}
                    color={selected ? palette.accent : palette.secondaryText}
                  />
                  <Text
                    style={[
                      styles.priorityOptionText,
                      { color: selected ? palette.accent : palette.text },
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View
            style={[
              styles.priorityGuide,
              { backgroundColor: palette.inputBackground, borderColor: palette.border },
            ]}>
            {TASK_PRIORITIES.map((option) => (
              <View key={option} style={styles.priorityGuideRow}>
                <Text style={[styles.priorityGuideLevel, { color: palette.text }]}>
                  {option}
                </Text>
                <Text style={[styles.priorityGuideText, { color: palette.secondaryText }]}>
                  {PRIORITY_DESCRIPTIONS[option]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                { borderColor: palette.border },
                saving ? styles.disabled : undefined,
                pressed ? styles.pressed : undefined,
              ]}>
              <Text style={[styles.buttonText, { color: palette.text }]}>取消</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving || !canSave}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.accent },
                saving || !canSave ? styles.disabled : undefined,
                pressed ? styles.pressed : undefined,
              ]}>
              <Text style={[styles.buttonText, { color: palette.onAccent }]}>
                {saving ? '保存中…' : '保存'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 22,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heading: {
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  counter: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  priorityLabel: {
    marginTop: 14,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityOption: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 2,
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  priorityGuide: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  priorityGuideRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  priorityGuideLevel: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    width: 28,
  },
  priorityGuideText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
