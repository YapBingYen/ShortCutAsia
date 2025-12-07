import { Image } from 'expo-image';
import { Platform, StyleSheet, ScrollView, View, Pressable, TextInput, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAllUsers, getAllExpenses, createUser, resetDatabase } from '@/db';
import type { User, Expense } from '@/db/types';

export default function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newUserName, setNewUserName] = useState('');

  const load = async () => {
    const [u, e] = await Promise.all([getAllUsers(), getAllExpenses()]);
    setUsers(u);
    setExpenses(e);
  };

  useFocusEffect(() => {
    load();
    return () => {};
  });

  const nameById = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddUser = async () => {
    const name = newUserName.trim();
    if (!name) return;
    await createUser(name);
    setNewUserName('');
    await load();
  };

  const handleReset = async () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive", 
          onPress: async () => {
            await resetDatabase();
            await load();
          }
        }
      ]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      {/* Header Section */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-2">
          <ThemedText className="text-2xl font-bold text-emerald-500">FairShare</ThemedText>
          <HelloWave />
        </View>
        <Pressable onPress={handleReset} hitSlop={10}>
          <ThemedText className="text-zinc-500 text-sm">Reset</ThemedText>
        </Pressable>
      </View>

      {/* Hero Card: Total Spend */}
      <View className="bg-emerald-600 rounded-3xl p-6 mb-6 shadow-lg shadow-emerald-900/20">
        <ThemedText className="text-emerald-100 font-medium mb-1 text-lg">Total Group Spend</ThemedText>
        <ThemedText className="text-white text-4xl font-bold tracking-tight">{fmt(totalSpend)}</ThemedText>
      </View>

      {/* Primary Actions */}
      <View className="flex-row gap-4 mb-8">
        <Pressable 
          onPress={() => router.push('/add-expense')} 
          className="flex-1 bg-zinc-800 p-4 rounded-2xl items-center justify-center active:opacity-80 aspect-[1.4]"
        >
          <IconSymbol name="plus" size={32} color="#10b981" />
          <ThemedText className="font-semibold mt-2 text-lg">Add Expense</ThemedText>
        </Pressable>
        <Pressable 
          onPress={() => router.push('/settle')} 
          className="flex-1 bg-zinc-800 p-4 rounded-2xl items-center justify-center active:opacity-80 aspect-[1.4]"
        >
          <IconSymbol name="dollarsign.circle.fill" size={32} color="#3b82f6" />
          <ThemedText className="font-semibold mt-2 text-lg">Settle Up</ThemedText>
        </Pressable>
      </View>

      {/* Users Section */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <ThemedText type="subtitle" className="text-xl">Users</ThemedText>
          <Pressable onPress={() => router.push('/manage-users')} hitSlop={10}>
             <ThemedText className="text-blue-500 font-semibold text-base">Manage</ThemedText>
          </Pressable>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
          {users.map((u) => (
            <View key={u.id} className="items-center mr-2">
              <View 
                style={{ backgroundColor: u.avatar_color ?? '#64748b' }} 
                className="w-16 h-16 rounded-full items-center justify-center shadow-sm mb-2"
              >
                <ThemedText className="text-white text-2xl font-medium">{u.name.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <ThemedText className="text-sm font-medium opacity-80">{u.name}</ThemedText>
            </View>
          ))}
          
          {/* Add User Quick Action */}
          <View className="flex-row items-center gap-2 ml-2">
             <TextInput
                value={newUserName}
                onChangeText={setNewUserName}
                placeholder="New user..."
                placeholderTextColor="#71717a"
                className="bg-zinc-800 text-white rounded-xl px-4 h-12 min-w-[120px]"
             />
             <Pressable
                onPress={handleAddUser}
                className="bg-zinc-700 w-12 h-12 rounded-xl items-center justify-center active:bg-zinc-600"
             >
                <IconSymbol name="plus" size={24} color="white" />
             </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Recent Activity */}
      <View className="mb-8">
        <ThemedText type="subtitle" className="text-xl mb-4">Recent Activity</ThemedText>
        {expenses.length === 0 ? (
          <ThemedText className="opacity-50 italic">No expenses yet.</ThemedText>
        ) : (
          <View className="gap-3">
            {expenses.map((e) => (
              <Pressable 
                key={e.id} 
                onPress={() => router.push(`/expense/detail?id=${e.id}` as any)}
                className="bg-zinc-800/50 p-4 rounded-xl flex-row justify-between items-center active:bg-zinc-800"
              >
                <View className="gap-1">
                  <ThemedText className="font-semibold text-lg">{e.title}</ThemedText>
                  <ThemedText className="text-zinc-400 text-sm">
                    Paid by {nameById[e.payer_id] ?? 'Unknown'}
                  </ThemedText>
                </View>
                <ThemedText className="font-bold text-lg text-emerald-400">{fmt(e.amount)}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
