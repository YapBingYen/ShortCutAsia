import { useEffect, useState } from 'react';
import { ScrollView, TextInput, Pressable, View, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, createExpense, insertExpenseSplits } from '@/db';
import type { User } from '@/db/types';

function toCents(input: string): number {
  const n = Number(input);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const arr = Array(count).fill(base);
  for (let i = 0; i < remainder; i++) arr[i] += 1;
  return arr;
}

export default function AddExpenseScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [payerId, setPayerId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const rows = await getAllUsers();
      setUsers(rows);
      if (rows.length && payerId == null) setPayerId(rows[0].id);
    })();
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    const amountCents = toCents(amountText);
    if (!title || !amountCents || !payerId || selected.length === 0) return;
    const expenseId = await createExpense(title, amountCents, payerId);
    const perUser = splitEvenly(amountCents, selected.length);
    await insertExpenseSplits(expenseId, selected, perUser);
    router.back();
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView className="p-4 gap-4">
        <ThemedText type="subtitle">Title</ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner"
          className="bg-zinc-800 text-white rounded px-3 py-2"
        />

        <ThemedText type="subtitle">Amount (RM)</ThemedText>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="30.00"
          keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
          className="bg-zinc-800 text-white rounded px-3 py-2"
        />

        <ThemedText type="subtitle">Who Paid?</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          {users.map((u) => (
            <Pressable
              key={`payer-${u.id}`}
              onPress={() => setPayerId(u.id)}
              style={[styles.chip, payerId === u.id ? styles.chipActive : styles.chipInactive]}
            >
              <ThemedText style={styles.chipText}>{u.name}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <ThemedText type="subtitle">Split With?</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          {users.map((u) => (
            <Pressable
              key={`split-${u.id}`}
              onPress={() => toggleSelect(u.id)}
              style={[styles.chip, selected.includes(u.id) ? styles.chipActive : styles.chipInactive]}
            >
              <ThemedText style={styles.chipText}>{u.name}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={save} style={[styles.button, styles.save]}> 
          <ThemedText style={styles.buttonText}>Save</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.button, styles.cancel]}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  chipActive: { backgroundColor: '#059669' },
  chipInactive: { backgroundColor: '#3f3f46' },
  chipText: { color: 'white' },
  button: { marginTop: 12, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  save: { backgroundColor: '#059669' },
  cancel: { backgroundColor: '#3f3f46' },
  buttonText: { color: 'white', textAlign: 'center' },
});
