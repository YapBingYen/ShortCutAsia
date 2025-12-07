import { useState, useEffect } from 'react';
import { ScrollView, View, TextInput, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAllUsers, updateUser, deleteUser } from '@/db';
import type { User } from '@/db/types';

export default function ManageUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const saveEdit = async () => {
    if (editingId === null || !editName.trim()) return;
    try {
      await updateUser(editingId, editName.trim());
      setEditingId(null);
      setEditName('');
      await loadUsers();
    } catch (e) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteUser(user.id);
              if (success) {
                await loadUsers();
              } else {
                Alert.alert('Cannot Delete', 'This user is part of existing expenses. Remove them from expenses first.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView className="flex-1 bg-zinc-900">
      <Stack.Screen options={{ title: 'Manage Users', presentation: 'modal' }} />
      
      <ScrollView className="flex-1 p-4">
        <ThemedText className="text-zinc-400 mb-4">
          Tap the pencil to rename. You can only delete users who are not part of any expenses.
        </ThemedText>

        <View className="gap-3">
          {users.map((user) => (
            <View key={user.id} className="bg-zinc-800 p-4 rounded-xl flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View 
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: user.avatar_color ?? '#64748b' }}
                >
                  <ThemedText className="text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>

                {editingId === user.id ? (
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded"
                    autoFocus
                    onSubmitEditing={saveEdit}
                  />
                ) : (
                  <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
                )}
              </View>

              <View className="flex-row items-center gap-2 ml-2">
                {editingId === user.id ? (
                  <>
                    <Pressable onPress={saveEdit} className="p-2 bg-emerald-600/20 rounded-full">
                      <IconSymbol name="checkmark" size={20} color="#10b981" />
                    </Pressable>
                    <Pressable onPress={cancelEdit} className="p-2 bg-zinc-700 rounded-full">
                      <IconSymbol name="xmark" size={20} color="#a1a1aa" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable onPress={() => startEditing(user)} className="p-2 bg-blue-600/20 rounded-full">
                      <IconSymbol name="pencil" size={18} color="#3b82f6" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(user)} className="p-2 bg-red-600/20 rounded-full">
                      <IconSymbol name="trash" size={18} color="#ef4444" />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}
