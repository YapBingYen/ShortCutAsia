import { useEffect, useState } from 'react';
import { ScrollView, View, Share, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, getAllExpenses, getAllSplits } from '@/db';
import { calculateDebts, type PaymentInstruction } from '@/utils/algorithm';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

  const handleShare = async () => {
    if (instructions.length === 0) return;

    const lines = instructions.map(p => {
      const from = nameById[p.from_user_id] ?? `User ${p.from_user_id}`;
      const to = nameById[p.to_user_id] ?? `User ${p.to_user_id}`;
      return `${from} pays ${to} ${fmt(p.amount)}`;
    });

    const message = `FairShare Settlement:\n\n${lines.join('\n')}`;

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ThemedView className="flex-1 bg-zinc-900">
      <Stack.Screen options={{ 
        presentation: 'modal', 
        title: 'Settle Up',
        headerRight: () => (
          <Pressable onPress={handleShare} disabled={instructions.length === 0}>
            <ThemedText className={`${instructions.length === 0 ? 'text-zinc-500' : 'text-blue-400'} font-bold`}>
              Share
            </ThemedText>
          </Pressable>
        )
      }} />
      <ScrollView className="p-4 gap-3">
        {instructions.length === 0 ? (
          <ThemedText>No payments needed</ThemedText>
        ) : (
          instructions.map((p, idx) => (
            <ThemedView key={`${p.from_user_id}-${p.to_user_id}-${idx}`} className="bg-zinc-800 rounded p-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#64748b' }}>
                  <ThemedText className="text-white">{(nameById[p.from_user_id] ?? `U${p.from_user_id}`).charAt(0).toUpperCase()}</ThemedText>
                </View>
                <IconSymbol size={22} name="arrow.right" color="#10b981" />
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#64748b' }}>
                  <ThemedText className="text-white">{(nameById[p.to_user_id] ?? `U${p.to_user_id}`).charAt(0).toUpperCase()}</ThemedText>
                </View>
              </View>
              <ThemedText type="subtitle" className="mt-2">{`${nameById[p.from_user_id] ?? `User ${p.from_user_id}`} pays ${nameById[p.to_user_id] ?? `User ${p.to_user_id}`}`}</ThemedText>
              <ThemedText className="text-emerald-400">{fmt(p.amount)}</ThemedText>
            </ThemedView>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}
