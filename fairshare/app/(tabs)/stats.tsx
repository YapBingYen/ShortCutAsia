import { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getUserSpending } from '@/db';
import type { UserSpending } from '@/db/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function StatsScreen() {
  const [data, setData] = useState<UserSpending[]>([]);
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const spending = await getUserSpending();
    setData(spending);
  };

  const maxSpent = Math.max(...data.map(d => d.total_spent), 0);
  const totalGroupSpend = data.reduce((acc, curr) => acc + curr.total_spent, 0);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Analytics</ThemedText>
        <ThemedText style={styles.subtitle}>
          Total Net Cost: RM {formatCurrency(totalGroupSpend)}
        </ThemedText>
      </ThemedView>

      {/* Bar Chart Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Net Cost by User</ThemedText>
        <View style={styles.chartContainer}>
          {data.map((user) => {
            const percentage = maxSpent > 0 ? (user.total_spent / maxSpent) * 100 : 0;
            return (
              <View key={user.id} style={styles.barRow}>
                <View style={styles.labelContainer}>
                   <ThemedText numberOfLines={1} style={styles.labelText}>{user.name}</ThemedText>
                </View>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        width: `${percentage}%`,
                        backgroundColor: user.avatar_color || themeColors.tint 
                      }
                    ]} 
                  />
                </View>
                <View style={styles.amountContainer}>
                  <ThemedText style={styles.amountText}>RM {formatCurrency(user.total_spent)}</ThemedText>
                </View>
              </View>
            );
          })}
          {data.length === 0 && (
            <ThemedText style={styles.emptyText}>No expenses yet.</ThemedText>
          )}
        </View>
      </ThemedView>

      {/* Leaderboard Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Leaderboard</ThemedText>
        <View style={styles.tableHeader}>
           <ThemedText style={[styles.rank, { fontSize: 12 }]}>RANK</ThemedText>
           <ThemedText style={[styles.userInfo, { fontSize: 12 }]}>USER</ThemedText>
           <ThemedText style={[styles.colPaid, { fontSize: 12 }]}>PAID</ThemedText>
           <ThemedText style={[styles.colCost, { fontSize: 12 }]}>NET COST</ThemedText>
        </View>
        {data.map((user, index) => (
          <View key={user.id} style={[styles.leaderboardRow, { borderBottomColor: themeColors.icon }]}>
             <ThemedText style={styles.rank}>#{index + 1}</ThemedText>
             <View style={styles.userInfo}>
                <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
             </View>
             <ThemedText style={styles.colPaid}>{user.paid_count}x</ThemedText>
             <ThemedText type="defaultSemiBold" style={styles.colCost}>RM {formatCurrency(user.total_spent)}</ThemedText>
          </View>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    marginTop: 5,
  },
  section: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  chartContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  labelContainer: {
    width: 60,
    paddingRight: 8,
  },
  labelText: {
    fontSize: 14,
  },
  barContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  bar: {
    height: 20,
    borderRadius: 4,
    minWidth: 4, 
  },
  amountContainer: {
    width: 90,
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    opacity: 0.5,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    width: 40,
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  userInfo: {
    flex: 1,
  },
  colPaid: {
    width: 60,
    textAlign: 'center',
    opacity: 0.8,
  },
  colCost: {
    width: 90,
    textAlign: 'right',
  },
});
