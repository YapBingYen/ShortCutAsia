import { useEffect, useState } from 'react';
import { ScrollView, TextInput, Pressable, View, Platform, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getAllUsers, createExpense, insertExpenseSplits, createExpenseItems } from '@/db';
import type { User } from '@/db/types';
import { allocateByPercent, allocateByShares, toCents, validateSum } from '@/utils/split';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { analyzeReceipt } from '@/utils/ocr';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SplitMode = 'equal' | 'custom' | 'percent' | 'shares' | 'itemized';

type TempItem = {
  id: string;
  name: string;
  amount: string;
  assigned: number[];
};

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
  
  // Itemized State
  const [items, setItems] = useState<TempItem[]>([]);
  const [taxRate, setTaxRate] = useState('');
  const [serviceRate, setServiceRate] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  const fmt = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

  useEffect(() => {
    (async () => {
      // Pre-fill user provided key
      const userProvidedKey = '8761f015a588957';
      const storedKey = await AsyncStorage.getItem('ocr_space_api_key');
      
      if (storedKey) {
        setApiKey(storedKey);
      } else {
        // If no key exists, save the one provided by user
        await AsyncStorage.setItem('ocr_space_api_key', userProvidedKey);
        setApiKey(userProvidedKey);
      }
      
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

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    await AsyncStorage.setItem('ocr_space_api_key', apiKey.trim());
    setShowKeyModal(false);
    scanReceipt(); // Retry scan
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(),
      name: '',
      amount: '',
      assigned: []
    }]);
  };

  const updateItem = (id: string, field: keyof TempItem, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleItemAssignment = (itemId: string, userId: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const assigned = item.assigned.includes(userId)
        ? item.assigned.filter(id => id !== userId)
        : [...item.assigned, userId];
      return { ...item, assigned };
    }));
  };

  const scanReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos to scan receipts.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsScanning(true);
      
      try {
        const data = await analyzeReceipt(result.assets[0].uri, apiKey);
        
        // Add items
        if (data.items.length > 0) {
          const newItems = data.items.map(i => ({
             id: Math.random().toString(),
             name: i.description,
             amount: i.amount.toFixed(2),
             assigned: []
          }));
          setItems(prev => [...prev, ...newItems]);
        } else {
           Alert.alert('No items found', 'Could not detect line items. Trying to use total.');
           if (data.total > 0) {
             setAmountText(data.total.toFixed(2));
           }
        }

        // Set Metadata
        if (data.merchant && !title) setTitle(data.merchant);
        if (data.total > 0 && !amountText) setAmountText(data.total.toFixed(2));
        
        // Calculate Tax/Service Rates if amounts are detected
        // We need a subtotal to calculate the rate
        const detectedSubtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
        
        if (data.taxPercent && data.taxPercent > 0) {
           setTaxRate(data.taxPercent.toString());
        } else if (detectedSubtotal > 0 && data.tax > 0) {
           const rate = (data.tax / detectedSubtotal) * 100;
           setTaxRate(rate.toFixed(1).replace(/\.0$/, ''));
        }

        if (data.tipPercent && data.tipPercent > 0) {
           setServiceRate(data.tipPercent.toString());
        } else if (detectedSubtotal > 0 && data.tip > 0) {
           const rate = (data.tip / detectedSubtotal) * 100;
           setServiceRate(rate.toFixed(1).replace(/\.0$/, ''));
        }

        setIsScanning(false);
        Alert.alert('Success', `Scanned ${data.items.length} items from ${data.merchant || 'receipt'}.`);

      } catch (err) {
        setIsScanning(false);
        // If 401, prompt to update key
        if (String(err).includes('401') || String(err).includes('403')) {
           Alert.alert(
             'Invalid API Key', 
             'The provided OCR.space API key is invalid. Please update it.',
             [
               { text: 'Update Key', onPress: () => setShowKeyModal(true) },
               { text: 'Cancel', style: 'cancel' }
             ]
           );
        } else {
           Alert.alert('Scan Failed', 'Could not analyze receipt. Try a clearer image.');
        }
      }

    } catch (e) {
      Alert.alert('Error', 'Failed to scan receipt');
      setIsScanning(false);
    }
  };

  const renderModeSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeRow}>
      {[
        ['equal', 'Equal'],
        ['custom', 'Exact'],
        ['percent', '%'],
        ['shares', 'Shares'],
        ['itemized', 'Itemized'],
      ].map(([val, label]) => (
        <Pressable
          key={val}
          onPress={() => setMode(val as SplitMode)}
          style={[styles.chip, mode === val ? styles.chipActive : styles.chipInactive]}
        >
          <ThemedText style={styles.chipText}>{label}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderItemizedInputs = () => {
    const subtotal = items.reduce((sum, item) => sum + (toCents(item.amount) || 0), 0);
    const tax = Math.round(subtotal * (parseFloat(taxRate) || 0) / 100);
    const service = Math.round(subtotal * (parseFloat(serviceRate) || 0) / 100);
    const total = subtotal + tax + service;

    return (
      <View style={{ gap: 12 }}>
        <Pressable 
          onPress={scanReceipt} 
          onLongPress={() => setShowKeyModal(true)}
          disabled={isScanning}
          style={[styles.scanButton, isScanning && { opacity: 0.7 }]}
        >
           {isScanning ? (
             <ActivityIndicator color="white" />
           ) : (
             <>
               <IconSymbol name="camera.fill" size={20} color="white" />
               <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Scan Receipt</ThemedText>
             </>
           )}
        </Pressable>

        {items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <TextInput
                value={item.name}
                onChangeText={(t) => updateItem(item.id, 'name', t)}
                placeholder="Item Name"
                style={[styles.input, { flex: 2, marginRight: 8 }]}
              />
              <TextInput
                value={item.amount}
                onChangeText={(t) => updateItem(item.id, 'amount', t)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable onPress={() => removeItem(item.id)} style={{ padding: 8 }}>
                 <IconSymbol name="trash" size={20} color="#ef4444" />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {users.map(u => (
                <Pressable
                  key={u.id}
                  onPress={() => toggleItemAssignment(item.id, u.id)}
                  style={[
                    styles.miniChip,
                    item.assigned.includes(u.id) ? styles.chipActive : styles.chipInactive
                  ]}
                >
                  <ThemedText style={{ fontSize: 12, color: 'white' }}>{u.name}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
        
        <Pressable onPress={addItem} style={styles.addItemButton}>
           <ThemedText style={{ color: '#10b981', fontWeight: 'bold' }}>+ Add Item</ThemedText>
        </Pressable>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
             <ThemedText>Subtotal</ThemedText>
             <ThemedText>{fmt(subtotal)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText>Tax (%)</ThemedText>
                <TextInput 
                  value={taxRate}
                  onChangeText={setTaxRate}
                  placeholder="0"
                  keyboardType="numeric"
                  style={[styles.input, { width: 60, paddingVertical: 4, height: 32 }]}
                />
             </View>
             <ThemedText>{fmt(tax)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText>Service (%)</ThemedText>
                <TextInput 
                  value={serviceRate}
                  onChangeText={setServiceRate}
                  placeholder="0"
                  keyboardType="numeric"
                  style={[styles.input, { width: 60, paddingVertical: 4, height: 32 }]}
                />
             </View>
             <ThemedText>{fmt(service)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#52525b', paddingTop: 8, marginTop: 4 }]}>
             <ThemedText type="defaultSemiBold">Total</ThemedText>
             <ThemedText type="defaultSemiBold" style={{ color: '#10b981' }}>{fmt(total)}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderPerUserInputs = () => {
    if (mode === 'itemized') return renderItemizedInputs();
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

  const calculateItemizedSplits = (): { perUser: number[], total: number } | null => {
    const userMap: Record<number, number> = {};
    let subtotal = 0;

    for (const item of items) {
      const amt = toCents(item.amount);
      if (amt <= 0) continue;
      if (item.assigned.length === 0) return null; // Unassigned item
      
      subtotal += amt;
      const splitAmt = Math.floor(amt / item.assigned.length);
      const remainder = amt - splitAmt * item.assigned.length;
      
      item.assigned.forEach((uid, idx) => {
        userMap[uid] = (userMap[uid] || 0) + splitAmt + (idx < remainder ? 1 : 0);
      });
    }

    if (subtotal === 0) return { perUser: [], total: 0 };

    // Apply tax/service
    const tax = Math.round(subtotal * (parseFloat(taxRate) || 0) / 100);
    const service = Math.round(subtotal * (parseFloat(serviceRate) || 0) / 100);
    const totalExtra = tax + service;
    const total = subtotal + totalExtra;

    // Distribute extra costs proportionally to subtotal share
    // This is tricky with integers. We'll do a proportional allocation.
    const userIds = Object.keys(userMap).map(Number);
    const baseShares = userIds.map(uid => userMap[uid]);
    
    // Allocate totalExtra based on baseShares weights
    const extraAllocations = allocateByShares(totalExtra, baseShares);
    
    userIds.forEach((uid, idx) => {
      userMap[uid] += extraAllocations[idx];
    });

    // Map back to 'selected' array (which we need to populate for consistency, 
    // though in itemized mode 'selected' is derived from assignments)
    // Actually, we should update 'selected' to include everyone involved.
    
    return { 
      perUser: userIds.map(uid => userMap[uid]), 
      total 
    };
  };

  const save = async () => {
    try {
      let amountCents = toCents(amountText);
      let perUser: number[] = [];
      let finalSelected = selected;

      if (!title.trim()) {
        Alert.alert('Missing title', 'Please enter a title.');
        return;
      }

      if (mode === 'itemized') {
         if (items.length === 0) {
           Alert.alert('No items', 'Add at least one item.');
           return;
         }
         const result = calculateItemizedSplits();
         if (!result) {
           Alert.alert('Unassigned items', 'Ensure all items are assigned to at least one person.');
           return;
         }
         if (result.total <= 0) {
            Alert.alert('Invalid amount', 'Total must be greater than 0.');
            return;
         }
         amountCents = result.total;
         
         // In itemized mode, the "selected" users are effectively those who were assigned items
         // We need to extract them from the items
         const involvedUserIds = Array.from(new Set(items.flatMap(i => i.assigned)));
         // We need to match the order of perUser to the order of involvedUserIds
         // calculateItemizedSplits returned perUser matching the keys of userMap
         // Let's redo the mapping to be safe
         const userMap: Record<number, number> = {};
         // Re-run basic logic to populate map (duplicate logic, but safe)
         // ... (omitted for brevity, assume calculateItemizedSplits logic holds)
         // Let's just trust calculateItemizedSplits returns what we need if we refactor slightly
         // Refactoring calculateItemizedSplits to return a map
         
         // RE-CALCULATION INLINE FOR SAFETY
         const map: Record<number, number> = {};
         let subtotal = 0;
         for (const item of items) {
           const amt = toCents(item.amount);
           const split = Math.floor(amt / item.assigned.length);
           const rem = amt - split * item.assigned.length;
           subtotal += amt;
           item.assigned.forEach((uid, idx) => {
             map[uid] = (map[uid] || 0) + split + (idx < rem ? 1 : 0);
           });
         }
         const tax = Math.round(subtotal * (parseFloat(taxRate) || 0) / 100);
         const service = Math.round(subtotal * (parseFloat(serviceRate) || 0) / 100);
         const extra = tax + service;
         
         finalSelected = Object.keys(map).map(Number);
         const baseAmounts = finalSelected.map(id => map[id]);
         const extraAlloc = allocateByShares(extra, baseAmounts);
         perUser = baseAmounts.map((amt, i) => amt + extraAlloc[i]);
         
      } else {
        // Standard modes
        if (!amountCents || amountCents <= 0) {
          Alert.alert('Invalid amount', 'Enter a positive amount (e.g., 10.50).');
          return;
        }
        if (selected.length === 0) {
          Alert.alert('Select people', 'Choose at least one person to split with.');
          return;
        }

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
      }

      if (!payerId) {
        Alert.alert('Select payer', 'Please select who paid.');
        return;
      }

      const expenseId = await createExpense(title.trim(), amountCents, payerId);
      await insertExpenseSplits(expenseId, finalSelected, perUser);
      
      if (mode === 'itemized') {
        await createExpenseItems(expenseId, items.map(i => ({
          name: i.name || 'Item',
          amount: toCents(i.amount),
          assignedTo: i.assigned
        })));
      }

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
          className="bg-zinc-800 text-white rounded-xl px-4 py-4 text-lg"
        />

        {mode !== 'itemized' && (
          <>
            <ThemedText type="subtitle">Amount (RM)</ThemedText>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="30.00"
              keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
              className="bg-zinc-800 text-white rounded-xl px-4 py-4 text-lg"
            />
          </>
        )}

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
        
        {mode !== 'itemized' && (
          <>
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
          </>
        )}

        {renderPerUserInputs()}

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
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showKeyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Enter OCR.space Key</ThemedText>
            <ThemedText style={{ marginBottom: 16, opacity: 0.7 }}>
              To scan receipts, please get a free key from ocr.space and paste it here.
            </ThemedText>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Paste OCR.space Key..."
              style={[styles.input, { marginBottom: 16, width: '100%' }]}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => setShowKeyModal(false)} style={[styles.button, styles.cancel, { flex: 1, marginTop: 0 }]}>
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={saveApiKey} style={[styles.button, styles.save, { flex: 1, marginTop: 0 }]}>
                <ThemedText style={styles.buttonText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 16 },
  modeRow: { flexDirection: 'row', marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginRight: 8 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  chipActive: { backgroundColor: '#059669' },
  chipInactive: { backgroundColor: '#3f3f46' },
  chipText: { color: 'white', fontWeight: '600', fontSize: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputLabel: { width: 100, fontSize: 16 },
  input: { backgroundColor: '#3f3f46', color: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flex: 1, fontSize: 16 },
  button: { marginTop: 16, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  save: { backgroundColor: '#059669' },
  cancel: { backgroundColor: '#3f3f46' },
  buttonText: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  
  // Itemized Styles
  itemCard: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addItemButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderStyle: 'dashed',
  },
  summaryCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 24,
  }
});
