import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { createGroup } from '../services/groupService';
import { ContactPickerModal } from '../components/ContactPickerModal';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

interface PendingMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export default function CreateGroupScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<PendingMember[]>([]);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddMember = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permission_required'), t('groups.contacts_permission'));
        return;
      }
      setContactPickerVisible(true);
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  };

  const handleSelectContact = (contact: { name: string; phone?: string; email?: string }) => {
    const alreadyAdded = selectedMembers.some((m) => m.name === contact.name);
    if (!alreadyAdded) {
      setSelectedMembers((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, name: contact.name, phone: contact.phone, email: contact.email },
      ]);
    }
    setContactPickerVisible(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert(t('common.error'), t('groups.enter_group_name'));
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), t('groups.must_be_logged_in'));
      return;
    }

    setLoading(true);

    try {
      const memberUserIds: string[] = [];

      for (const member of selectedMembers) {
        const identifier = member.email ?? member.phone;
        if (!identifier) continue;

        const query = member.email
          ? `email.eq.${member.email}`
          : `phone.eq.${(member.phone ?? '').replace(/\s+/g, '')}`;

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(query)
          .maybeSingle();

        if (existingProfile?.id) {
          memberUserIds.push(existingProfile.id);
        } else {
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({ name: member.name, phone: member.phone, email: member.email })
            .select()
            .single();

          if (profileError) {
            console.warn('Could not create profile for', member.name, profileError);
            continue;
          }
          memberUserIds.push(newProfile.id);
        }
      }

      await createGroup(groupName.trim(), user.id, memberUserIds);

      Alert.alert(t('common.success'), t('groups.group_created'));
      navigation.goBack();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert(t('common.error'), t('groups.create_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('groups.create_group')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t('groups.group_name')}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
          value={groupName}
          onChangeText={setGroupName}
          placeholder={t('groups.group_name_placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Text style={[styles.label, { color: theme.colors.text, marginTop: 24 }]}>
          {t('groups.members')}
        </Text>

        <TouchableOpacity
          style={[styles.addMemberBtn, { borderColor: theme.colors.primary }]}
          onPress={handleAddMember}
        >
          <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.addMemberText, { color: theme.colors.primary }]}>
            {t('groups.add_members')}
          </Text>
        </TouchableOpacity>

        {selectedMembers.map((member, index) => (
          <View key={member.id} style={[styles.memberChip, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
            <TouchableOpacity
              onPress={() => setSelectedMembers((prev) => prev.filter((_, i) => i !== index))}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: loading ? theme.colors.textSecondary : theme.colors.primary }]}
        onPress={handleCreateGroup}
        disabled={loading}
      >
        <Text style={styles.createButtonText}>
          {loading ? t('common.loading') : t('groups.create_group')}
        </Text>
      </TouchableOpacity>

      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onSelectContact={handleSelectContact}
      />
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
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addMemberText: { marginLeft: 8, fontSize: 15, fontWeight: '600' },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberName: { flex: 1, fontSize: 15 },
  createButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
