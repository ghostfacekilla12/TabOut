import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
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
      console.log('🏗️ Starting group creation...');

      // Step 1: Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), created_by: user.id })
        .select()
        .single();

      if (groupError) {
        console.error('❌ Group creation error:', groupError);
        throw groupError;
      }

      console.log('✅ Group created:', group.id);

      // Step 2: Manually add creator as admin (backup for trigger)
      const { error: creatorError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });

      if (creatorError && !creatorError.message?.includes('duplicate')) {
        console.error('❌ Error adding creator:', creatorError);
      } else {
        console.log('✅ Creator added to group');
      }

      // Step 3: Process members - ONLY ADD IF THEY EXIST IN TAB
      const memberUserIds: string[] = [];
      const nonTabMembers: PendingMember[] = [];

      for (const member of selectedMembers) {
        console.log('🔍 Checking member:', member.name);

        let existingProfile = null;

        // Check by email first
        if (member.email) {
          const { data } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('email', member.email)
            .maybeSingle();

          existingProfile = data;
        }

        // If not found by email, check by phone
        if (!existingProfile && member.phone) {
          const cleanPhone = member.phone.replace(/\s+/g, '');
          const { data } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('phone', cleanPhone)
            .maybeSingle();

          existingProfile = data;
        }

        if (existingProfile?.id) {
          console.log(`✅ ${member.name} exists in Tab:`, existingProfile.id);
          memberUserIds.push(existingProfile.id);
        } else {
          console.log(`⚠️ ${member.name} NOT in Tab - needs invite`);
          nonTabMembers.push(member);
        }
      }

      // Step 4: Add existing Tab users to group
      if (memberUserIds.length > 0) {
        console.log(`➕ Adding ${memberUserIds.length} members to group...`);

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(
            memberUserIds.map((userId) => ({
              group_id: group.id,
              user_id: userId,
              role: 'member',
            }))
          );

        if (membersError) {
          console.error('❌ Error adding members:', membersError);
          Alert.alert(
            t('common.warning'),
            `Group created but couldn't add some members`
          );
        } else {
          console.log(`✅ Added ${memberUserIds.length} members successfully`);
        }
      }

      // Step 5: Handle non-Tab members
      if (nonTabMembers.length > 0) {
        const inviteLink = `https://tab.app/join/${group.id}`;
        const names = nonTabMembers.map((m) => m.name).join(', ');

        setTimeout(() => {
          Alert.alert(
            t('groups.invite_needed'),
            `${names} ${nonTabMembers.length > 1 ? "aren't" : "isn't"} on Tab yet.`,
            [
              {
                text: t('groups.copy_link'),
                onPress: () => {
                  Clipboard.setString(inviteLink);
                  Alert.alert(t('common.success'), t('groups.link_copied'));
                },
              },
              { text: t('common.ok'), style: 'cancel' },
            ]
          );
        }, 500);
      }

      // Step 6: Success! Navigate back
      Alert.alert(t('common.success'), t('groups.group_created'), [
        {
          text: t('common.ok'),
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Error creating group:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('groups.create_error')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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