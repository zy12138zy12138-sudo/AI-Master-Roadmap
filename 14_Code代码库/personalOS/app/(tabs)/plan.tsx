import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlanScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = {
    background: isDark ? '#0D1117' : '#F5F7FA',
    border: isDark ? '#30363D' : '#E4E7EC',
    accent: isDark ? '#79A7FF' : '#2563EB',
    secondary: isDark ? '#9DA7B3' : '#667085',
    surface: isDark ? '#161B22' : '#FFFFFF',
    text: isDark ? '#F0F3F6' : '#17202E',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>计划</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="event-note" size={36} color={colors.accent} />
          <Text style={[styles.message, { color: colors.secondary }]}>功能将在后续开发</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  card: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 220,
    padding: 24,
  },
  message: { fontSize: 16, marginTop: 16 },
});
