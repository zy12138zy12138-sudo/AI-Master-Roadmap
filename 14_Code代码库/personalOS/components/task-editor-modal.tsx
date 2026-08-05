import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  type TaskEditorValues,
  type TaskPriority,
} from '@/src/database/tasks';
import { getLocalDateKey } from '@/src/utils/local-date';

type TaskEditorModalProps = {
  initialValues: TaskEditorValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSelectScheduledDate?: (date: Date) => void;
  onSave: (values: TaskEditorValues) => void;
  saving: boolean;
  scheduledDate?: Date;
  showScheduledDate?: boolean;
  visible: boolean;
};

const PALETTE = {
  overlay: 'rgba(16, 24, 40, 0.48)',
  surface: '#FFFFFF',
  text: '#17202E',
  secondaryText: '#667085',
  border: '#D0D5DD',
  inputBackground: '#FFFFFF',
  accent: '#2563EB',
  accentSoft: '#E8F0FF',
  onAccent: '#FFFFFF',
};

const PRIORITY_DESCRIPTIONS: Record<TaskPriority, string> = {
  P0: '当天必须完成（建议 1—2 项）',
  P1: '推动核心目标的重要任务',
  P2: '常规执行任务（默认）',
  P3: '低收益、提醒或有余力再做',
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function normalizeCalendarDate(date: Date): Date {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate;
}

function getCalendarMonth(date: Date): Date {
  const month = normalizeCalendarDate(date);
  month.setDate(1);
  return month;
}

function shiftCalendarMonth(date: Date, months: number): Date {
  const nextMonth = getCalendarMonth(date);
  nextMonth.setMonth(nextMonth.getMonth() + months);
  return nextMonth;
}

function getCalendarDays(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingEmptyDays = new Date(year, monthIndex, 1, 12).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  const visibleCellCount = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  return Array.from({ length: visibleCellCount }, (_, index) => {
    const day = index - leadingEmptyDays + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, monthIndex, day, 12) : null;
  });
}

function formatCalendarDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAY_LABELS[date.getDay()]}`;
}

export function TaskEditorModal({
  initialValues,
  mode,
  onCancel,
  onSelectScheduledDate,
  onSave,
  saving,
  scheduledDate,
  showScheduledDate = false,
  visible,
}: TaskEditorModalProps) {
  const palette = PALETTE;
  const [title, setTitle] = useState(initialValues.title);
  const [priority, setPriority] = useState<TaskPriority>(initialValues.priority);
  const [scheduledDateDropdownOpen, setScheduledDateDropdownOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getCalendarMonth(new Date()));
  const today = normalizeCalendarDate(new Date());
  const todayKey = getLocalDateKey(today);
  const selectedDateKey = scheduledDate ? getLocalDateKey(scheduledDate) : undefined;
  const calendarDays = getCalendarDays(calendarMonth);
  const isCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth();
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
      setScheduledDateDropdownOpen(false);
    }
  }, [initialValues.priority, initialValues.title, visible]);

  useEffect(() => {
    if (visible) {
      const initialCalendarDate =
        scheduledDate && getLocalDateKey(scheduledDate) >= getLocalDateKey()
          ? scheduledDate
          : new Date();
      setCalendarMonth(getCalendarMonth(initialCalendarDate));
    }
  }, [scheduledDate, visible]);

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

          {showScheduledDate && scheduledDate ? (
            <>
              <Text style={[styles.label, styles.dateLabel, { color: palette.text }]}>任务日期</Text>
              <Pressable
                accessibilityLabel="选择任务日期"
                accessibilityRole="button"
                accessibilityState={{ expanded: scheduledDateDropdownOpen, disabled: saving }}
                disabled={saving}
                onPress={() => {
                  Keyboard.dismiss();
                  setScheduledDateDropdownOpen((currentValue) => !currentValue);
                }}
                style={({ pressed }) => [
                  styles.dateField,
                  { backgroundColor: palette.inputBackground, borderColor: palette.border },
                  saving ? styles.disabled : undefined,
                  pressed ? styles.pressed : undefined,
                ]}>
                <MaterialIcons name="event" size={19} color={palette.accent} />
                <Text numberOfLines={1} style={[styles.dateValue, { color: palette.text }]}>
                  {formatCalendarDate(scheduledDate)}
                </Text>
                <MaterialIcons
                  name={scheduledDateDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={palette.secondaryText}
                />
              </Pressable>
              {scheduledDateDropdownOpen ? (
                <View
                  style={[
                    styles.dateDropdown,
                    { backgroundColor: palette.inputBackground, borderColor: palette.border },
                  ]}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      accessibilityLabel="上个月"
                      accessibilityRole="button"
                      disabled={saving || isCurrentMonth}
                      hitSlop={8}
                      onPress={() => setCalendarMonth((month) => shiftCalendarMonth(month, -1))}
                      style={({ pressed }) => [
                        styles.calendarNavigationButton,
                        saving || isCurrentMonth ? styles.disabled : undefined,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <MaterialIcons name="chevron-left" size={22} color={palette.accent} />
                    </Pressable>
                    <Text style={[styles.calendarMonthLabel, { color: palette.text }]}>
                      {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
                    </Text>
                    <Pressable
                      accessibilityLabel="下个月"
                      accessibilityRole="button"
                      disabled={saving}
                      hitSlop={8}
                      onPress={() => setCalendarMonth((month) => shiftCalendarMonth(month, 1))}
                      style={({ pressed }) => [
                        styles.calendarNavigationButton,
                        saving ? styles.disabled : undefined,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <MaterialIcons name="chevron-right" size={22} color={palette.accent} />
                    </Pressable>
                  </View>

                  <View style={styles.calendarWeekdays}>
                    {WEEKDAY_LABELS.map((weekday) => (
                      <Text
                        key={weekday}
                        style={[styles.calendarWeekday, { color: palette.secondaryText }]}>
                        {weekday}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                      }

                      const dateKey = getLocalDateKey(date);
                      const isPast = dateKey < todayKey;
                      const isSelected = dateKey === selectedDateKey;

                      return (
                        <View key={dateKey} style={styles.calendarDayCell}>
                          <Pressable
                            accessibilityLabel={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: saving || isPast, selected: isSelected }}
                            disabled={saving || isPast || !onSelectScheduledDate}
                            hitSlop={7}
                            onPress={() => {
                              onSelectScheduledDate?.(date);
                              setScheduledDateDropdownOpen(false);
                            }}
                            style={({ pressed }) => [
                              styles.calendarDayButton,
                              isSelected ? { backgroundColor: palette.accent } : undefined,
                              isPast ? styles.calendarPastDay : undefined,
                              pressed ? styles.pressed : undefined,
                            ]}>
                            <Text
                              style={[
                                styles.calendarDayText,
                                {
                                  color: isSelected
                                    ? palette.onAccent
                                    : isPast
                                      ? palette.border
                                      : palette.text,
                                },
                              ]}>
                              {date.getDate()}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  dateLabel: {
    marginTop: 14,
  },
  dateField: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  dateValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateDropdown: {
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    marginTop: -1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavigationButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 34,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginTop: 2,
  },
  calendarWeekday: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: '14.285714%',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 1,
  },
  calendarDayCell: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: '14.285714%',
  },
  calendarDayButton: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarPastDay: {
    opacity: 0.5,
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
