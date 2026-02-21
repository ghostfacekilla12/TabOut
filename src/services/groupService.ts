import { supabase } from './supabase';

export interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  name: string;
  email?: string;
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'receipt';
  receipt_id?: string;
  created_at: string;
}

export interface GroupReceipt {
  id: string;
  group_id: string;
  uploaded_by: string;
  paid_by?: string;
  image_url?: string;
  merchant_name: string;
  total_amount: number;
  status: 'pending' | 'splitting' | 'settled';
  created_at: string;
  items: GroupReceiptItem[];
}

export interface GroupReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  price: number;
  quantity: number;
  claimed_by: string[];
}

export interface GroupSettlement {
  id: string;
  group_id: string;
  receipt_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export const loadGroups = async (userId: string): Promise<Group[]> => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      groups (
        id,
        name,
        avatar_url,
        created_by,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  const groups: Group[] = (data ?? [])
    .filter((d: any) => d.groups)
    .map((d: any) => ({
      id: d.groups.id,
      name: d.groups.name,
      avatar_url: d.groups.avatar_url,
      created_by: d.groups.created_by,
      created_at: d.groups.created_at,
      member_count: 0,
    }));

  return groups;
};

export const loadGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      id,
      group_id,
      user_id,
      joined_at,
      profiles (name, email)
    `)
    .eq('group_id', groupId);

  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    id: d.id,
    group_id: d.group_id,
    user_id: d.user_id,
    name: d.profiles?.name ?? 'Unknown',
    email: d.profiles?.email,
    joined_at: d.joined_at,
  }));
};

export const loadGroupMessages = async (groupId: string): Promise<GroupMessage[]> => {
  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      id,
      group_id,
      sender_id,
      content,
      message_type,
      receipt_id,
      created_at,
      profiles (name)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    id: d.id,
    group_id: d.group_id,
    sender_id: d.sender_id,
    sender_name: d.profiles?.name ?? 'Unknown',
    content: d.content,
    message_type: d.message_type ?? 'text',
    receipt_id: d.receipt_id,
    created_at: d.created_at,
  }));
};

export const sendGroupMessage = async (
  groupId: string,
  senderId: string,
  content: string,
  messageType: 'text' | 'receipt' = 'text',
  receiptId?: string
): Promise<void> => {
  const { error } = await supabase.from('group_messages').insert({
    group_id: groupId,
    sender_id: senderId,
    content,
    message_type: messageType,
    receipt_id: receiptId ?? null,
  });
  if (error) throw error;
};

export const createGroup = async (
  name: string,
  createdBy: string,
  memberIds: string[] = []
): Promise<Group> => {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, created_by: createdBy })
    .select()
    .single();

  if (groupError) throw groupError;

  // Add extra members (creator is auto-added by DB trigger or we add manually)
  if (memberIds.length > 0) {
    const memberInserts = memberIds.map((uid) => ({
      group_id: group.id,
      user_id: uid,
    }));
    await supabase.from('group_members').insert(memberInserts);
  }

  return { ...group, member_count: memberIds.length + 1 };
};

export const loadGroupReceipt = async (receiptId: string): Promise<GroupReceipt | null> => {
  const { data, error } = await supabase
    .from('group_receipts')
    .select(`
      id,
      group_id,
      uploaded_by,
      paid_by,
      image_url,
      merchant_name,
      total_amount,
      status,
      created_at,
      group_receipt_items (
        id,
        receipt_id,
        name,
        price,
        quantity,
        item_claims (user_id)
      )
    `)
    .eq('id', receiptId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    group_id: data.group_id,
    uploaded_by: data.uploaded_by,
    paid_by: data.paid_by ?? undefined,
    image_url: data.image_url,
    merchant_name: data.merchant_name,
    total_amount: data.total_amount,
    status: data.status,
    created_at: data.created_at,
    items: (data.group_receipt_items ?? []).map((item: any) => ({
      id: item.id,
      receipt_id: item.receipt_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
      claimed_by: (item.item_claims ?? []).map((c: any) => c.user_id),
    })),
  };
};

export const claimReceiptItem = async (
  itemId: string,
  userId: string,
  claim: boolean
): Promise<void> => {
  if (claim) {
    await supabase.from('item_claims').upsert({ item_id: itemId, user_id: userId });
  } else {
    await supabase
      .from('item_claims')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
  }
};

export const createGroupReceiptFromOCR = async (
  groupId: string,
  uploadedBy: string,
  merchantName: string,
  totalAmount: number,
  items: Array<{ name: string; price: number; quantity?: number }>,
  paidBy?: string
): Promise<GroupReceipt> => {
  const { data: receipt, error: receiptError } = await supabase
    .from('group_receipts')
    .insert({
      group_id: groupId,
      uploaded_by: uploadedBy,
      paid_by: paidBy ?? uploadedBy,
      merchant_name: merchantName,
      total_amount: totalAmount,
      status: 'splitting',
    })
    .select()
    .single();

  if (receiptError) throw receiptError;

  if (items.length > 0) {
    const itemInserts = items.map((item) => ({
      receipt_id: receipt.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    }));
    const { data: insertedItems } = await supabase
      .from('group_receipt_items')
      .insert(itemInserts)
      .select();

    return {
      ...receipt,
      items: (insertedItems ?? []).map((item: any) => ({
        id: item.id,
        receipt_id: item.receipt_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity ?? 1,
        claimed_by: [],
      })),
    };
  }

  return { ...receipt, items: [] };
};

export const markSettlementAsPaid = async (settlementId: string): Promise<void> => {
  const { error } = await supabase
    .from('group_settlements')
    .update({ status: 'paid' })
    .eq('id', settlementId);
  if (error) throw error;
};
