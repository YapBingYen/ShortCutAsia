import { Image } from 'expo-image';
import { Platform, StyleSheet, ScrollView, View, Pressable, TextInput } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFocusEffect, router } from 'expo-router';
import { getAllUsers, getAllExpenses, createUser, resetDatabase } from '@/db';
import type { User } from '@/db/types';
import type { Expense } from '@/db/types';

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newUserName, setNewUserName] = useState('');

  const load = async () => {
    const [u, e] = await Promise.all([getAllUsers(), getAllExpenses()]);
    setUsers(u);
    setExpenses(e);
  };
  useEffect(() => {
    load();
  }, []);
  useFocusEffect(() => {
    load();
    return () => {};
  });

  const nameById = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <ThemedText className="text-emerald-400" type="title">FairShare</ThemedText>
          <HelloWave />
        </View>
        <Pressable
          onPress={async () => { await resetDatabase(); await load(); }}
          className="px-3 py-2 rounded bg-zinc-800"
        >
          <ThemedText className="text-white">Clear Data</ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView className="gap-1 mb-2">
        <ThemedText type="subtitle">Total Group Spend</ThemedText>
        <ThemedText className="text-emerald-400" type="title">{fmt(totalSpend)}</ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Users</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          {users.map((u) => (
            <View key={u.id} className="items-center">
              <View style={{ backgroundColor: u.avatar_color ?? '#64748b' }} className="w-12 h-12 rounded-full items-center justify-center">
                <ThemedText className="text-white">{u.name.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <ThemedText>{u.name}</ThemedText>
            </View>
          ))}
        </ScrollView>
        <View className="flex-row items-center gap-2 mt-2">
          <TextInput
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Add user"
            className="bg-zinc-800 text-white rounded px-3 py-2 flex-1"
          />
          <Pressable
            onPress={async () => {
              const name = newUserName.trim();
              if (!name) return;
              await createUser(name);
              setNewUserName('');
              await load();
            }}
            className="bg-emerald-600 px-3 py-2 rounded"
          >
            <ThemedText className="text-white">Add</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Recent Activity</ThemedText>
        {expenses.map((e) => (
          <Pressable key={e.id} onPress={() => router.push(`/expense/detail?id=${e.id}` as any)}>
            <View className="bg-zinc-800 rounded p-3 flex-row justify-between">
              <ThemedText>{`${e.title} - ${fmt(e.amount)}`}</ThemedText>
              <ThemedText>{`Paid by ${nameById[e.payer_id] ?? `User ${e.payer_id}`}`}</ThemedText>
            </View>
          </Pressable>
        ))}
      </ThemedView>
      
      <ThemedView className="gap-2 mb-2">
        <Pressable onPress={() => router.push('/add-expense')} className="bg-blue-600 px-4 py-3 rounded-lg">
          <ThemedText className="text-white text-center">+ Add Expense</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/settle')} className="bg-emerald-600 px-4 py-3 rounded-lg">
          <ThemedText className="text-white text-center">Calculate Debts</ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
