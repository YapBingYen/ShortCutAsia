import { useLocalSearchParams, Stack, router, useFocusEffect } from 'expo-router';
import { ScrollView, View, Alert, Pressable, StyleSheet } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, getAllExpenses, getAllSplits, getExpenseItems } from '@/db';
import type { User, Expense, ExpenseSplit } from '@/db/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Collapsible } from '@/components/ui/collapsible';

type ItemWithAssignments = {
  id: number;
  name: string;
  amount: number;
  assignments: number[];
};

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams();
  const expenseId = Number(id);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [users, setUsers] = useState<Record<number, User>>({});
  const [items, setItems] = useState<ItemWithAssignments[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [allUsers, allExpenses, allSplits, expenseItems] = await Promise.all([
          getAllUsers(),
          getAllExpenses(),
          getAllSplits(),
          getExpenseItems(expenseId),
        ]);
        
        const foundExpense = allExpenses.find(e => e.id === expenseId);
        const relatedSplits = allSplits.filter(s => s.expense_id === expenseId);
        
        setUsers(Object.fromEntries(allUsers.map(u => [u.id, u])));
        setExpense(foundExpense || null);
        setSplits(relatedSplits);
        setItems(expenseItems);
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

        {items.length > 0 && (
          <View className="mb-6 bg-zinc-800 rounded-xl overflow-hidden">
            <View style={{ padding: 16 }}>
               <Collapsible title={`Items (${items.length})`}>
                 <View className="gap-3 mt-2">
                  {items.map((item) => (
                    <View key={item.id} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700/50">
                      <View className="flex-row justify-between items-center mb-2">
                        <ThemedText type="defaultSemiBold" className="flex-1 mr-2">{item.name}</ThemedText>
                        <ThemedText className="font-medium text-emerald-400">{fmt(item.amount)}</ThemedText>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {item.assignments.map((uid) => (
                          <View key={uid} className="flex-row items-center gap-1 bg-zinc-700 px-2 py-1 rounded-full">
                            <View className="w-4 h-4 rounded-full bg-zinc-600 items-center justify-center"
                                  style={{ backgroundColor: users[uid]?.avatar_color ?? '#64748b' }}>
                              <ThemedText className="text-white text-[10px]">
                                {users[uid]?.name.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                            <ThemedText className="text-xs text-zinc-300">{users[uid]?.name}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                 </View>
               </Collapsible>
            </View>
          </View>
        )}

        <View className="bg-zinc-800 rounded-xl overflow-hidden mb-8">
            <View style={{ padding: 16 }}>
               <Collapsible title="Split Breakdown">
                 <View className="gap-3 mt-2">
                  {splits.map((split) => (
                    <View key={split.id} className="flex-row items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-700/50">
                      <View className="flex-row items-center gap-3">
                        <View className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center"
                              style={{ backgroundColor: users[split.user_id]?.avatar_color ?? '#64748b' }}>
                          <ThemedText className="text-white text-xs">
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
               </Collapsible>
            </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

