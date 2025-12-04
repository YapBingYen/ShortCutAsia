import { useEffect, useState } from 'react';
import { ScrollView, TextInput, Pressable, View, Platform, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, createExpense, insertExpenseSplits } from '@/db';
import type { User } from '@/db/types';
import { allocateByPercent, allocateByShares, toCents, validateSum } from '@/utils/split';

type SplitMode = 'equal' | 'custom' | 'percent' | 'shares';

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
  const [mode, setMode] = useState<SplitMode>('equal');
  const [customTexts, setCustomTexts] = useState<Record<number, string>>({});
  const [percentTexts, setPercentTexts] = useState<Record<number, string>>({});
  const [shareTexts, setShareTexts] = useState<Record<number, string>>({});
  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

  useEffect(() => {
    (async () => {
      const rows = await getAllUsers();
      setUsers(rows);
      if (rows.length) {
        if (payerId == null) setPayerId(rows[0].id);
        if (selected.length === 0) setSelected(rows.map((r) => r.id));
        setCustomTexts(Object.fromEntries(rows.map((r) => [r.id, ''])));
        setPercentTexts(Object.fromEntries(rows.map((r) => [r.id, ''])));
        setShareTexts(Object.fromEntries(rows.map((r) => [r.id, '1'])));
      }
    })();
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const renderModeSelector = () => (
    <View style={styles.modeRow}>
      {[
        ['equal', 'Equal'],
        ['custom', 'Exact Amounts'],
        ['percent', 'Percent'],
        ['shares', 'Shares'],
      ].map(([val, label]) => (
        <Pressable
          key={val}
          onPress={() => setMode(val as SplitMode)}
          style={[styles.chip, mode === val ? styles.chipActive : styles.chipInactive]}
        >
          <ThemedText style={styles.chipText}>{label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderPerUserInputs = () => {
    if (mode === 'equal') return null;
    if (mode === 'custom') {
      const total = toCents(amountText);
      const entered = selected.map((id) => toCents(customTexts[id] ?? '0'));
      const sum = entered.reduce((s, v) => s + v, 0);
      const remaining = total - sum;
      return (
        <View>
          {selected.map((id) => (
            <View key={`cust-${id}`} style={styles.inputRow}>
              <ThemedText style={styles.inputLabel}>{users.find((u) => u.id === id)?.name}</ThemedText>
              <TextInput
                value={customTexts[id] ?? ''}
                onChangeText={(t) => setCustomTexts((p) => ({ ...p, [id]: t }))}
                placeholder="e.g., 12.50"
                keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
                style={styles.input}
              />
            </View>
          ))}
          <ThemedText style={{ color: remaining === 0 && total > 0 ? '#10b981' : '#ef4444' }}>
            {remaining === 0 && total > 0 ? 'Perfectly split!' : `Total mismatch: ${fmt(Math.abs(remaining))} ${remaining > 0 ? 'remaining' : 'over'}`}
          </ThemedText>
        </View>
      );
    }
    if (mode === 'percent') {
      return (
        <View>
          {selected.map((id) => (
            <View key={`pct-${id}`} style={styles.inputRow}>
              <ThemedText style={styles.inputLabel}>{users.find((u) => u.id === id)?.name}</ThemedText>
              <TextInput
                value={percentTexts[id] ?? ''}
                onChangeText={(t) => setPercentTexts((p) => ({ ...p, [id]: t }))}
                placeholder="%"
                keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
                style={styles.input}
              />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View>
        {selected.map((id) => (
          <View key={`shr-${id}`} style={styles.inputRow}>
            <ThemedText style={styles.inputLabel}>{users.find((u) => u.id === id)?.name}</ThemedText>
            <TextInput
              value={shareTexts[id] ?? '1'}
              onChangeText={(t) => setShareTexts((p) => ({ ...p, [id]: t }))}
              placeholder="shares"
              keyboardType={Platform.OS === 'web' ? 'numeric' : 'number-pad'}
              style={styles.input}
            />
          </View>
        ))}
      </View>
    );
  };

  const save = async () => {
    try {
      const amountCents = toCents(amountText);
      if (!title.trim()) {
        Alert.alert('Missing title', 'Please enter a title.');
        return;
      }
      if (!amountCents || amountCents <= 0) {
        Alert.alert('Invalid amount', 'Enter a positive amount (e.g., 10.50).');
        return;
      }
      if (!payerId) {
        Alert.alert('Select payer', 'Please select who paid.');
        return;
      }
      if (selected.length === 0) {
        Alert.alert('Select people', 'Choose at least one person to split with.');
        return;
      }

      const expenseId = await createExpense(title.trim(), amountCents, payerId);
      let perUser: number[] = [];
      if (mode === 'equal') {
        perUser = splitEvenly(amountCents, selected.length);
      } else if (mode === 'custom') {
        perUser = selected.map((id) => toCents(customTexts[id] ?? '0'));
        validateSum(amountCents, perUser);
      } else if (mode === 'percent') {
        const percents = selected.map((id) => Number((percentTexts[id] ?? '0').replace(/[^0-9.]/g, '')));
        const pctSum = percents.reduce((s, v) => s + v, 0);
        if (pctSum <= 0) {
          Alert.alert('Invalid percent', 'Enter percentages that sum to 100.');
          return;
        }
        perUser = allocateByPercent(amountCents, percents);
      } else {
        const shares = selected.map((id) => Number((shareTexts[id] ?? '1').replace(/[^0-9]/g, '')) || 0);
        if (shares.reduce((s, v) => s + v, 0) <= 0) {
          Alert.alert('Invalid shares', 'Enter positive shares.');
          return;
        }
        perUser = allocateByShares(amountCents, shares);
      }
      await insertExpenseSplits(expenseId, selected, perUser);
      Alert.alert('Success', 'Expense saved');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save expense');
      // eslint-disable-next-line no-console
      console.log('Save expense error', e);
    }
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

        <ThemedText type="subtitle">Split Mode</ThemedText>
        {renderModeSelector()}
        {renderPerUserInputs()}

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

        <Pressable
          disabled={(() => {
            if (mode === 'custom') {
              const total = toCents(amountText);
              const entered = selected.map((id) => toCents(customTexts[id] ?? '0'));
              const sum = entered.reduce((s, v) => s + v, 0);
              return total <= 0 || sum !== total;
            }
            return false;
          })()}
          onPress={save}
          style={[
            styles.button,
            styles.save,
            (() => {
              if (mode === 'custom') {
                const total = toCents(amountText);
                const entered = selected.map((id) => toCents(customTexts[id] ?? '0'));
                const sum = entered.reduce((s, v) => s + v, 0);
                const disabled = total <= 0 || sum !== total;
                return disabled ? { opacity: 0.5 } : undefined;
              }
              return undefined;
            })(),
          ]}
        > 
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
  modeRow: { flexDirection: 'row', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  chipActive: { backgroundColor: '#059669' },
  chipInactive: { backgroundColor: '#3f3f46' },
  chipText: { color: 'white' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputLabel: { width: 100 },
  input: { backgroundColor: '#3f3f46', color: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, flex: 1 },
  button: { marginTop: 12, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  save: { backgroundColor: '#059669' },
  cancel: { backgroundColor: '#3f3f46' },
  buttonText: { color: 'white', textAlign: 'center' },
});
