import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, getAllExpenses, getAllSplits } from '@/db';
import { calculateDebts, type PaymentInstruction } from '@/utils/algorithm';

export default function SettleScreen() {
  const [instructions, setInstructions] = useState<PaymentInstruction[]>([]);
  const [nameById, setNameById] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const users = await getAllUsers();
      const expenses = await getAllExpenses();
      const splits = await getAllSplits();
      setNameById(Object.fromEntries(users.map((u) => [u.id, u.name])));
      const res = calculateDebts(users, expenses, splits);
      setInstructions(res);
    })();
  }, []);

  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

  return (
    <ThemedView className="flex-1">
      <Stack.Screen options={{ presentation: 'modal', title: 'Settle Up' }} />
      <ScrollView className="p-4 gap-3">
        {instructions.length === 0 ? (
          <ThemedText>No payments needed</ThemedText>
        ) : (
          instructions.map((p, idx) => (
            <ThemedText key={`${p.from_user_id}-${p.to_user_id}-${idx}`}>
              {`${nameById[p.from_user_id] ?? `User ${p.from_user_id}`} → ${nameById[p.to_user_id] ?? `User ${p.to_user_id}`}: ${fmt(p.amount)}`}
            </ThemedText>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}
