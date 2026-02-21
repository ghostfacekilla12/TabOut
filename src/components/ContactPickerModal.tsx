import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTranslation } from 'react-i18next';

interface SelectedContact {
  name: string;
  email?: string;
  phone?: string;
}

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: SelectedContact) => void;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  visible,
  onClose,
  onSelectContact,
}) => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        setContacts(data.filter((c) => c.name));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectContact = (contact: Contacts.Contact) => {
    const email = contact.emails?.[0]?.email;
    const phone = contact.phoneNumbers?.[0]?.number;
    if (!email && !phone) return;
    onSelectContact({
      name: contact.name ?? 'Unknown',
      email,
      phone,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('friends.select_contact')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={t('friends.search_contacts')}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item, index) => item.id ?? item.name ?? String(index)}
            renderItem={({ item }) => {
              const hasContact = !!(item.emails?.[0]?.email || item.phoneNumbers?.[0]?.number);
              return (
                <TouchableOpacity
                  style={[styles.contactItem, !hasContact && styles.contactItemDisabled]}
                  onPress={() => handleSelectContact(item)}
                  activeOpacity={hasContact ? 0.7 : 1}
                  disabled={!hasContact}
                >
                  <View style={[styles.avatar, !hasContact && styles.avatarDisabled]}>
                    <Ionicons name="person" size={24} color={hasContact ? '#666' : '#bbb'} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, !hasContact && styles.contactNameDisabled]}>
                      {item.name}
                    </Text>
                    {item.emails?.[0]?.email && (
                      <Text style={styles.contactDetail}>{item.emails[0].email}</Text>
                    )}
                    {!item.emails?.[0]?.email && item.phoneNumbers?.[0]?.number && (
                      <Text style={styles.contactDetail}>{item.phoneNumbers[0].number}</Text>
                    )}
                    {!hasContact && (
                      <Text style={styles.noContactDetail}>{t('friends.no_contact_info')}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {search ? t('friends.no_contacts_match') : t('friends.no_contacts_found')}
              </Text>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    elevation: 100,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 0,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    fontSize: 16,
    color: '#1a1a1a',
  },
  loader: {
    marginTop: 50,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactItemDisabled: {
    opacity: 0.4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDisabled: {
    backgroundColor: '#f8f8f8',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactNameDisabled: {
    color: '#999',
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
  },
  noContactDetail: {
    fontSize: 12,
    color: '#bbb',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
});
