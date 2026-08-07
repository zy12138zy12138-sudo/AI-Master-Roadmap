import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DEFAULT_DAILY_REVIEW_SCORE,
  getPersonalOsDailyReviewPageData,
  getTaskCompletionRate,
  MAX_DAILY_REVIEW_NOTES_LENGTH,
  MAX_DAILY_REVIEW_TEXT_LENGTH,
  savePersonalOsDailyReview,
  type DailyReviewFormValues,
  type DailyReviewPageData,
  type PersonalOsDailyReview,
} from '@/src/database/daily-reviews';
import {
  getLocalDateFromKey,
  getLocalDateKey,
  normalizeLocalDate,
  shiftLocalDate,
} from '@/src/utils/local-date';

type ReviewLoadState = 'loading' | 'ready' | 'error';
type ReviewTextField = Exclude<keyof DailyReviewFormValues, 'selfScore'>;

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const SCORE_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
const EMPTY_REVIEW_VALUES: DailyReviewFormValues = {
  selfScore: DEFAULT_DAILY_REVIEW_SCORE,
  unfinishedReason: '',
  obstacle: '',
  bestThing: '',
  tomorrowAction: '',
  notes: '',
};
const REVIEW_TEXT_FIELDS: {
  key: ReviewTextField;
  label: string;
  placeholder: string;
  maxLength: number;
}[] = [
  {
    key: 'unfinishedReason',
    label: '主要未完成原因',
    placeholder: '例如：任务过大、时间不足或优先级变化',
    maxLength: MAX_DAILY_REVIEW_TEXT_LENGTH,
  },
  {
    key: 'obstacle',
    label: '具体执行阻碍',
    placeholder: '记录影响执行的环境、精力或临时事件',
    maxLength: MAX_DAILY_REVIEW_TEXT_LENGTH,
  },
  {
    key: 'bestThing',
    label: '今日最好的一件事',
    placeholder: '今天最值得肯定的行动或结果',
    maxLength: MAX_DAILY_REVIEW_TEXT_LENGTH,
  },
  {
    key: 'tomorrowAction',
    label: '明日改进行动',
    placeholder: '写下一条明天可以直接执行的调整',
    maxLength: MAX_DAILY_REVIEW_TEXT_LENGTH,
  },
  {
    key: 'notes',
    label: '补充说明',
    placeholder: '其他需要保留的观察或想法',
    maxLength: MAX_DAILY_REVIEW_NOTES_LENGTH,
  },
];
const PALETTE = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F9FAFB',
  text: '#17202E',
  secondaryText: '#667085',
  border: '#E4E7EC',
  accent: '#2563EB',
  accentSoft: '#E8F0FF',
  onAccent: '#FFFFFF',
  success: '#067647',
  successSoft: '#ECFDF3',
  warning: '#B54708',
  warningSoft: '#FFFAEB',
  danger: '#B42318',
  disabled: '#98A2B3',
};

function formatReviewDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}

function formValuesFromReview(review: PersonalOsDailyReview): DailyReviewFormValues {
  return {
    selfScore: review.selfScore,
    unfinishedReason: review.unfinishedReason,
    obstacle: review.obstacle,
    bestThing: review.bestThing,
    tomorrowAction: review.tomorrowAction,
    notes: review.notes,
  };
}

function taskStatsFromReview(review: PersonalOsDailyReview): DailyReviewPageData['taskStats'] {
  return {
    taskTotal: review.taskTotal,
    completedTaskCount: review.completedTaskCount,
    incompleteTaskCount: review.incompleteTaskCount,
    priorityTaskTotal: review.priorityTaskTotal,
    completedPriorityTaskCount: review.completedPriorityTaskCount,
  };
}

export default function ReviewScreen() {
  const db = useSQLiteContext();
  const screenIsFocused = useIsFocused();
  const initialToday = normalizeLocalDate();
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const selectedDateKey = getLocalDateKey(selectedDate);
  const todayKey = getLocalDateKey();
  const isToday = selectedDateKey === todayKey;
  const [pageData, setPageData] = useState<DailyReviewPageData | null>(null);
  const [formValues, setFormValues] = useState<DailyReviewFormValues>(EMPTY_REVIEW_VALUES);
  const [loadState, setLoadState] = useState<ReviewLoadState>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const selectedDateKeyRef = useRef(selectedDateKey);
  const lastKnownTodayKeyRef = useRef(todayKey);
  const requestIDRef = useRef(0);
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isSaveConfirmationOpenRef = useRef(false);
  const isSavingRef = useRef(false);

  selectedDateKeyRef.current = selectedDateKey;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIDRef.current += 1;
    };
  }, []);

  const loadReview = useCallback(
    async (reviewDate: string, showLoading: boolean): Promise<boolean> => {
      const requestID = ++requestIDRef.current;
      const isCurrentDate = () => selectedDateKeyRef.current === reviewDate;

      if (showLoading && isMountedRef.current && isFocusedRef.current && isCurrentDate()) {
        setLoadState('loading');
      }

      try {
        const storedPageData = await getPersonalOsDailyReviewPageData(db, reviewDate);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === requestIDRef.current &&
          isCurrentDate()
        ) {
          setPageData(storedPageData);
          setFormValues(
            storedPageData.review
              ? formValuesFromReview(storedPageData.review)
              : { ...EMPTY_REVIEW_VALUES },
          );
          setLoadState('ready');
          hasLoadedRef.current = true;
        }

        return true;
      } catch (error) {
        console.error(`读取每日复盘失败：${reviewDate}`, error);

        if (
          isMountedRef.current &&
          isFocusedRef.current &&
          requestID === requestIDRef.current &&
          isCurrentDate()
        ) {
          setLoadState('error');
        }

        return false;
      }
    },
    [db],
  );

  useEffect(() => {
    if (!screenIsFocused) {
      isFocusedRef.current = false;
      return;
    }

    isFocusedRef.current = true;
    const latestTodayKey = getLocalDateKey();
    let targetDateKey = selectedDateKeyRef.current;

    if (targetDateKey === lastKnownTodayKeyRef.current && targetDateKey !== latestTodayKey) {
      const latestToday = getLocalDateFromKey(latestTodayKey);
      targetDateKey = latestTodayKey;
      selectedDateKeyRef.current = latestTodayKey;
      setSelectedDate(latestToday);
    }

    lastKnownTodayKeyRef.current = latestTodayKey;
    void loadReview(targetDateKey, !hasLoadedRef.current);

    return () => {
      isFocusedRef.current = false;
      requestIDRef.current += 1;
    };
  }, [loadReview, screenIsFocused]);

  const selectDate = (date: Date) => {
    if (isSavingRef.current) {
      return;
    }

    const normalizedDate = normalizeLocalDate(date);
    const nextDateKey = getLocalDateKey(normalizedDate);

    if (nextDateKey === selectedDateKeyRef.current) {
      void loadReview(nextDateKey, false);
      return;
    }

    requestIDRef.current += 1;
    selectedDateKeyRef.current = nextDateKey;
    setSelectedDate(normalizedDate);
    setLoadState('loading');

    if (isFocusedRef.current) {
      void loadReview(nextDateKey, true);
    }
  };

  const moveDate = (days: number) => {
    const currentDate = getLocalDateFromKey(selectedDateKeyRef.current);
    const nextDate = shiftLocalDate(currentDate, days);

    if (getLocalDateKey(nextDate) > getLocalDateKey()) {
      return;
    }

    selectDate(nextDate);
  };

  const updateTextField = (field: ReviewTextField, value: string) => {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

  const saveReview = async () => {
    if (isSavingRef.current) {
      return;
    }

    const operationDate = selectedDateKeyRef.current;
    const valuesToSave = { ...formValues };
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const savedReview = await savePersonalOsDailyReview(db, operationDate, valuesToSave);

      if (
        isMountedRef.current &&
        isFocusedRef.current &&
        selectedDateKeyRef.current === operationDate
      ) {
        setPageData({
          review: savedReview,
          taskStats: taskStatsFromReview(savedReview),
          taskStatsSource: 'snapshot',
        });
        setFormValues(formValuesFromReview(savedReview));
        setLoadState('ready');
        Alert.alert('保存成功', '每日复盘已保存在手机本地。');
      }
    } catch (error) {
      console.error(`保存每日复盘失败：${operationDate}`, error);

      if (isMountedRef.current && isFocusedRef.current) {
        Alert.alert('保存失败', '暂时无法保存每日复盘，请稍后重试。');
      }
    } finally {
      isSavingRef.current = false;

      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const requestSaveReview = () => {
    if (isSavingRef.current || isSaveConfirmationOpenRef.current) {
      return;
    }

    if (pageData?.review) {
      void saveReview();
      return;
    }

    isSaveConfirmationOpenRef.current = true;
    const closeConfirmation = () => {
      isSaveConfirmationOpenRef.current = false;
    };

    Alert.alert(
      '确认保存复盘',
      '保存后将确认本日任务统计。之后仍可修改复盘内容，但任务统计不会自动更新。',
      [
        { text: '取消', style: 'cancel', onPress: closeConfirmation },
        {
          text: '确认保存',
          onPress: () => {
            closeConfirmation();
            void saveReview();
          },
        },
      ],
      { cancelable: true, onDismiss: closeConfirmation },
    );
  };

  const completionRate = pageData ? getTaskCompletionRate(pageData.taskStats) : 0;
  const incompletePriorityTaskCount = pageData
    ? pageData.taskStats.priorityTaskTotal - pageData.taskStats.completedPriorityTaskCount
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>复盘</Text>

          <View style={styles.dateCard}>
            <View style={styles.dateHeading}>
              <View style={styles.dateIcon}>
                <MaterialIcons name="event-note" size={21} color={PALETTE.accent} />
              </View>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateEyebrow}>{isToday ? '今日复盘' : '历史复盘'}</Text>
                <Text numberOfLines={1} style={styles.dateText}>
                  {formatReviewDate(selectedDate)}
                </Text>
              </View>
            </View>

            <View style={styles.dateActions}>
              <Pressable
                accessibilityLabel="查看前一天复盘"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => moveDate(-1)}
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed ? styles.pressed : undefined,
                  isSaving ? styles.disabled : undefined,
                ]}>
                <MaterialIcons name="chevron-left" size={20} color={PALETTE.accent} />
                <Text style={styles.dateButtonText}>前一天</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="回到今天"
                accessibilityRole="button"
                disabled={isToday || isSaving}
                onPress={() => selectDate(normalizeLocalDate())}
                style={({ pressed }) => [
                  styles.dateButton,
                  styles.todayButton,
                  isToday || isSaving ? styles.disabled : undefined,
                  pressed ? styles.pressed : undefined,
                ]}>
                <Text style={styles.todayButtonText}>今天</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="查看后一天复盘"
                accessibilityRole="button"
                disabled={isToday || isSaving}
                onPress={() => moveDate(1)}
                style={({ pressed }) => [
                  styles.dateButton,
                  isToday || isSaving ? styles.disabled : undefined,
                  pressed ? styles.pressed : undefined,
                ]}>
                <Text style={styles.dateButtonText}>后一天</Text>
                <MaterialIcons name="chevron-right" size={20} color={PALETTE.accent} />
              </Pressable>
            </View>
          </View>

          {loadState === 'loading' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>正在读取复盘数据…</Text>
            </View>
          ) : null}

          {loadState === 'error' ? (
            <View style={styles.statusCard}>
              <MaterialIcons name="error-outline" size={30} color={PALETTE.danger} />
              <Text style={styles.statusTitle}>复盘数据加载失败</Text>
              <Text style={styles.statusText}>请检查后重新加载</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadReview(selectedDateKeyRef.current, true)}
                style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : undefined]}>
                <Text style={styles.retryText}>重新加载</Text>
              </Pressable>
            </View>
          ) : null}

          {loadState === 'ready' && pageData ? (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>任务统计</Text>
                  <Text style={styles.sectionHint}>
                    {pageData.taskStatsSource === 'snapshot'
                      ? '显示首次保存时的统计快照'
                      : '当前真实任务统计，保存后固定'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                {[
                  ['任务总数', pageData.taskStats.taskTotal],
                  ['已完成', pageData.taskStats.completedTaskCount],
                  ['未完成', pageData.taskStats.incompleteTaskCount],
                  ['完成率', `${completionRate}%`],
                ].map(([label, value]) => (
                  <View key={label} style={styles.statCard}>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.priorityCard}>
                <View style={styles.priorityIcon}>
                  <MaterialIcons name="flag" size={20} color={PALETTE.warning} />
                </View>
                <View style={styles.priorityContent}>
                  <Text style={styles.priorityTitle}>P0/P1 重点任务</Text>
                  <Text style={styles.priorityText}>
                    共 {pageData.taskStats.priorityTaskTotal} 项，已完成{' '}
                    {pageData.taskStats.completedPriorityTaskCount} 项，未完成{' '}
                    {incompletePriorityTaskCount} 项
                  </Text>
                </View>
              </View>

              <View style={styles.habitNotice}>
                <MaterialIcons name="info-outline" size={21} color={PALETTE.accent} />
                <Text style={styles.habitNoticeText}>
                  尚未建立习惯数据，暂无法计算习惯完成率
                </Text>
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>每日复盘</Text>
                  <Text style={styles.sectionHint}>记录真实情况，帮助下一次计划更合理</Text>
                </View>
                {pageData.review ? (
                  <View style={styles.savedBadge}>
                    <MaterialIcons name="check-circle" size={15} color={PALETTE.success} />
                    <Text style={styles.savedBadgeText}>已保存</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>自评分</Text>
                <Text style={styles.fieldHint}>1 分最低，10 分最高</Text>
                <View style={styles.scoreGrid}>
                  {SCORE_OPTIONS.map((score) => {
                    const selected = formValues.selfScore === score;

                    return (
                      <Pressable
                        accessibilityLabel={`自评分 ${score} 分`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={isSaving}
                        key={score}
                        onPress={() =>
                          setFormValues((currentValues) => ({
                            ...currentValues,
                            selfScore: score,
                          }))
                        }
                        style={({ pressed }) => [
                          styles.scoreButton,
                          selected ? styles.scoreButtonSelected : undefined,
                          isSaving ? styles.disabled : undefined,
                          pressed ? styles.pressed : undefined,
                        ]}>
                        <Text
                          style={[
                            styles.scoreButtonText,
                            selected ? styles.scoreButtonTextSelected : undefined,
                          ]}>
                          {score}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {REVIEW_TEXT_FIELDS.map((field) => (
                  <View key={field.key} style={styles.inputGroup}>
                    <View style={styles.inputHeading}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.characterCount}>
                        {formValues[field.key].length}/{field.maxLength}
                      </Text>
                    </View>
                    <TextInput
                      accessibilityLabel={field.label}
                      editable={!isSaving}
                      maxLength={field.maxLength}
                      multiline
                      onChangeText={(value) => updateTextField(field.key, value)}
                      placeholder={field.placeholder}
                      placeholderTextColor={PALETTE.disabled}
                      style={styles.textInput}
                      textAlignVertical="top"
                      value={formValues[field.key]}
                    />
                  </View>
                ))}

                <View style={styles.snapshotNotice}>
                  <MaterialIcons name="lock-clock" size={18} color={PALETTE.secondaryText} />
                  <Text style={styles.snapshotNoticeText}>
                    首次保存会固定当天任务统计；以后编辑文字不会被任务顺延改变。
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={requestSaveReview}
                  style={({ pressed }) => [
                    styles.saveButton,
                    isSaving ? styles.disabled : undefined,
                    pressed ? styles.pressed : undefined,
                  ]}>
                  <MaterialIcons name="save" size={20} color={PALETTE.onAccent} />
                  <Text style={styles.saveButtonText}>
                    {isSaving ? '保存中…' : pageData.review ? '更新每日复盘' : '保存每日复盘'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: PALETTE.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    color: PALETTE.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateCard: {
    backgroundColor: PALETTE.surface,
    borderColor: PALETTE.border,
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
    backgroundColor: PALETTE.accentSoft,
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
    color: PALETTE.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateText: {
    color: PALETTE.text,
    fontSize: 16,
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
  },
  todayButton: {
    borderColor: PALETTE.border,
    borderWidth: 1,
  },
  dateButtonText: {
    color: PALETTE.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  todayButtonText: {
    color: PALETTE.secondaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderColor: PALETTE.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 160,
    padding: 20,
  },
  statusTitle: {
    color: PALETTE.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  statusText: {
    color: PALETTE.secondaryText,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PALETTE.accentSoft,
    borderRadius: 9,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 18,
  },
  retryText: {
    color: PALETTE.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionTitle: {
    color: PALETTE.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    color: PALETTE.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderColor: PALETTE.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 82,
    width: '48%',
  },
  statValue: {
    color: PALETTE.text,
    fontSize: 23,
    fontWeight: '800',
  },
  statLabel: {
    color: PALETTE.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  priorityCard: {
    alignItems: 'center',
    backgroundColor: PALETTE.warningSoft,
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 12,
    padding: 14,
  },
  priorityIcon: {
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: 9,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  priorityContent: {
    flex: 1,
    marginLeft: 11,
  },
  priorityTitle: {
    color: PALETTE.text,
    fontSize: 14,
    fontWeight: '700',
  },
  priorityText: {
    color: PALETTE.secondaryText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  habitNotice: {
    alignItems: 'center',
    backgroundColor: PALETTE.accentSoft,
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 12,
    padding: 14,
  },
  habitNoticeText: {
    color: PALETTE.accent,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 9,
  },
  savedBadge: {
    alignItems: 'center',
    backgroundColor: PALETTE.successSoft,
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  savedBadgeText: {
    color: PALETTE.success,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: PALETTE.surface,
    borderColor: PALETTE.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  fieldLabel: {
    color: PALETTE.text,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldHint: {
    color: PALETTE.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  scoreButton: {
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderColor: PALETTE.border,
    borderRadius: 9,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: '17%',
  },
  scoreButtonSelected: {
    backgroundColor: PALETTE.accent,
    borderColor: PALETTE.accent,
  },
  scoreButtonText: {
    color: PALETTE.text,
    fontSize: 15,
    fontWeight: '700',
  },
  scoreButtonTextSelected: {
    color: PALETTE.onAccent,
  },
  inputGroup: {
    marginTop: 20,
  },
  inputHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  characterCount: {
    color: PALETTE.secondaryText,
    fontSize: 11,
  },
  textInput: {
    backgroundColor: PALETTE.surfaceMuted,
    borderColor: PALETTE.border,
    borderRadius: 11,
    borderWidth: 1,
    color: PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    minHeight: 88,
    padding: 12,
  },
  snapshotNotice: {
    alignItems: 'flex-start',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 10,
    flexDirection: 'row',
    marginTop: 20,
    padding: 12,
  },
  snapshotNoticeText: {
    color: PALETTE.secondaryText,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: PALETTE.accent,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
  },
  saveButtonText: {
    color: PALETTE.onAccent,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 7,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
