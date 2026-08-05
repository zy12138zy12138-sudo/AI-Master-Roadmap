import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const colors = {
    background: '#F5F7FA',
    border: '#E4E7EC',
    accent: '#2563EB',
    secondary: '#667085',
    surface: '#FFFFFF',
    text: '#17202E',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>我的</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="person" size={38} color={colors.accent} />
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
