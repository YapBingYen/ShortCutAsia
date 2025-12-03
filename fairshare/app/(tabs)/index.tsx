import { Image } from 'expo-image';
import { Platform, StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useFocusEffect, router } from 'expo-router';
import { getAllUsers, getAllExpenses } from '@/db';
import type { User } from '@/db/types';
import type { Expense } from '@/db/types';

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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
      <ThemedView className="flex-row items-center gap-2">
        <ThemedText className="text-emerald-400" type="title">FairShare</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView className="gap-1 mb-2">
        <ThemedText type="subtitle">Total Group Spend</ThemedText>
        <ThemedText className="text-emerald-400" type="title">{fmt(totalSpend)}</ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Users</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {users.map((u) => (
            <View key={u.id} className="items-center mr-4">
              <View style={{ backgroundColor: u.avatar_color ?? '#64748b' }} className="w-12 h-12 rounded-full" />
              <ThemedText>{u.name}</ThemedText>
            </View>
          ))}
        </ScrollView>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Recent Activity</ThemedText>
        {expenses.map((e) => (
          <ThemedText key={e.id}>
            {`${e.title} - ${fmt(e.amount)} - Paid by ${nameById[e.payer_id] ?? `User ${e.payer_id}`}`}
          </ThemedText>
        ))}
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <Pressable onPress={() => router.push('/add-expense')} className="bg-emerald-600 px-3 py-2 rounded">
          <ThemedText className="text-white">+ Add Expense</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/settle')} className="bg-zinc-700 px-3 py-2 rounded">
          <ThemedText className="text-white">Settle Up</ThemedText>
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
