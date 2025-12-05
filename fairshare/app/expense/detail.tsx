import { useLocalSearchParams, Stack, router, useFocusEffect } from 'expo-router';
import { ScrollView, View, Alert, Pressable } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, getAllExpenses, getAllSplits } from '@/db';
import type { User, Expense, ExpenseSplit } from '@/db/types';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams();
  const expenseId = Number(id);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [users, setUsers] = useState<Record<number, User>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [allUsers, allExpenses, allSplits] = await Promise.all([
          getAllUsers(),
          getAllExpenses(),
          getAllSplits(),
        ]);
        
        const foundExpense = allExpenses.find(e => e.id === expenseId);
        const relatedSplits = allSplits.filter(s => s.expense_id === expenseId);
        
        setUsers(Object.fromEntries(allUsers.map(u => [u.id, u])));
        setExpense(foundExpense || null);
        setSplits(relatedSplits);
      })();
    }, [expenseId])
  );

  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

  if (!expense) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-zinc-900">
      <Stack.Screen options={{ 
        title: 'Expense Details',
        headerRight: () => (
          <Pressable onPress={() => router.push(`/expense/edit/${expenseId}` as any)}>
            <ThemedText className="text-emerald-400 font-bold">Edit</ThemedText>
          </Pressable>
        )
      }} />
      
      <ScrollView className="flex-1 p-4">
        <View className="bg-zinc-800 rounded-xl p-6 mb-6">
          <ThemedText type="title" className="text-center mb-2">{expense.title}</ThemedText>
          <ThemedText type="title" className="text-emerald-400 text-center mb-6 text-4xl">
            {fmt(expense.amount)}
          </ThemedText>
          
          <View className="flex-row justify-between items-center border-t border-zinc-700 pt-4">
            <ThemedText className="text-zinc-400">Paid by</ThemedText>
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center" 
                    style={{ backgroundColor: users[expense.payer_id]?.avatar_color ?? '#64748b' }}>
                <ThemedText className="text-white text-xs">
                  {users[expense.payer_id]?.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">{users[expense.payer_id]?.name}</ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="subtitle" className="mb-4 px-2">Split with</ThemedText>
        
        <View className="gap-3">
          {splits.map((split) => (
            <View key={split.id} className="flex-row items-center justify-between bg-zinc-800 p-4 rounded-lg">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-zinc-700 items-center justify-center"
                      style={{ backgroundColor: users[split.user_id]?.avatar_color ?? '#64748b' }}>
                  <ThemedText className="text-white">
                    {users[split.user_id]?.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText>{users[split.user_id]?.name}</ThemedText>
              </View>
              <ThemedText className="text-emerald-400 font-semibold">
                {fmt(split.amount_owed)}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}
