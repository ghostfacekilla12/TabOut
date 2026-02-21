import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTranslation } from 'react-i18next';

const { height } = Dimensions.get('window');

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
      console.log('📱 ContactPickerModal: Modal opened, loading contacts...');
      loadContacts();
    } else {
      console.log('📱 ContactPickerModal: Modal closed, resetting...');
      setContacts([]);
      setSearch('');
      setLoading(true);
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log('📱 ContactPickerModal: Fetching contacts from device...');

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      console.log(`✅ ContactPickerModal: Loaded ${data.length} total contacts`);

      const validContacts = data.filter((c) => c.name && c.name.trim().length > 0);
      
      console.log(`✅ ContactPickerModal: ${validContacts.length} valid contacts (with names)`);

      setContacts(validContacts);
      setLoading(false);
    } catch (error) {
      console.error('❌ ContactPickerModal: Error loading contacts:', error);
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectContact = (contact: Contacts.Contact) => {
    console.log('👤 Contact selected:', contact.name);

    const phone = contact.phoneNumbers?.[0]?.number;
    const email = contact.emails?.[0]?.email;

    console.log('📧 Email:', email);
    console.log('📱 Phone:', phone);

    onSelectContact({
      name: contact.name ?? 'Unknown',
      email,
      phone,
    });
  };

  console.log('🔄 ContactPickerModal RENDER - visible:', visible, 'contacts:', contacts.length);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <View style={styles.container} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('friends.select_contact') || 'Select Contact'}</Text>
          <TouchableOpacity 
            onPress={onClose} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={32} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('friends.search_contacts') || 'Search contacts...'}
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Contact Count */}
        {!loading && (
          <Text style={styles.countText}>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Loading State */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          /* Contacts List */
          <FlatList
            data={filteredContacts}
            keyExtractor={(item, index) => item.id ?? `contact-${index}`}
            renderItem={({ item }) => {
              const displayPhone = item.phoneNumbers?.[0]?.number;
              const displayEmail = item.emails?.[0]?.email;
              const hasContactInfo = displayEmail || displayPhone;
              
              return (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleSelectContact(item)}
                  activeOpacity={0.6}
                  disabled={!hasContactInfo}
                >
                  <View style={[styles.avatar, !hasContactInfo && styles.avatarDisabled]}>
                    <Text style={styles.avatarText}>
                      {item.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, !hasContactInfo && styles.textDisabled]}>
                      {item.name}
                    </Text>
                    {displayEmail && (
                      <Text style={styles.contactDetail} numberOfLines={1}>
                        📧 {displayEmail}
                      </Text>
                    )}
                    {displayPhone && (
                      <Text style={styles.contactDetail} numberOfLines={1}>
                        📱 {displayPhone}
                      </Text>
                    )}
                    {!hasContactInfo && (
                      <Text style={styles.noContactInfo}>No email or phone</Text>
                    )}
                  </View>
                  {hasContactInfo ? (
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  ) : (
                    <Ionicons name="ban" size={20} color="#ccc" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {search ? 'No contacts match your search' : 'No contacts found'}
                </Text>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  countText: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDisabled: {
    backgroundColor: '#ccc',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  textDisabled: {
    color: '#999',
  },
  contactDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noContactInfo: {
    fontSize: 12,
    color: '#ff6b6b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
    fontSize: 15,
  },
});