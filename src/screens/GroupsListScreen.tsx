import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadGroups } from '../services/groupService';
import type { Group } from '../services/groupService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupsList'>;

export default function GroupsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await loadGroups(user.id);
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Groups screen focused - refreshing...');
      fetchGroups();
    }, [fetchGroups])
  );

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: theme.colors.card }]}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
    >
      <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="people" size={24} color="#fff" />
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: theme.colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
          {item.member_count} {t('groups.members')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('groups.my_groups')}
        </Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          refreshing={false}
          onRefresh={fetchGroups}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={80} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('groups.no_groups')}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                {t('groups.create_first_group')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: { marginTop: 40 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: '600' },
  memberCount: { fontSize: 14, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});
