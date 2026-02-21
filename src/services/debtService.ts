import { supabase } from './supabase';

export interface Debt {
  id: string;
  split_id: string | null;
  creditor_id: string;
  debtor_id: string;
  amount: number;
  currency: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  description?: string;
}

export interface DebtWithNames extends Debt {
  creditor_name: string;
  debtor_name: string;
}

/** Fetch all outstanding (unpaid) debts for the given user (as creditor OR debtor). */
export async function fetchOutstandingDebts(userId: string): Promise<{
  owed: DebtWithNames[];
  owing: DebtWithNames[];
}> {
  const { data, error } = await supabase
    .from('debts')
    .select(
      `id, split_id, creditor_id, debtor_id, amount, currency, is_paid, paid_at, created_at,
       splits(description),
       creditor:profiles!debts_creditor_id_fkey(name),
       debtor:profiles!debts_debtor_id_fkey(name)`
    )
    .or(`creditor_id.eq.${userId},debtor_id.eq.${userId}`)
    .eq('is_paid', false)
    .order('created_at', { ascending: false });

  if (error || !data) return { owed: [], owing: [] };

  const owed: DebtWithNames[] = [];
  const owing: DebtWithNames[] = [];

  for (const row of data as unknown[]) {
    const r = row as {
      id: string;
      split_id: string | null;
      creditor_id: string;
      debtor_id: string;
      amount: number;
      currency: string;
      is_paid: boolean;
      paid_at: string | null;
      created_at: string;
      splits?: { description?: string } | null;
      creditor?: { name?: string } | null;
      debtor?: { name?: string } | null;
    };

    const debt: DebtWithNames = {
      id: r.id,
      split_id: r.split_id,
      creditor_id: r.creditor_id,
      debtor_id: r.debtor_id,
      amount: r.amount,
      currency: r.currency,
      is_paid: r.is_paid,
      paid_at: r.paid_at,
      created_at: r.created_at,
      description: r.splits?.description,
      creditor_name: r.creditor?.name ?? 'Unknown',
      debtor_name: r.debtor?.name ?? 'Unknown',
    };

    if (r.creditor_id === userId) {
      owed.push(debt);
    } else {
      owing.push(debt);
    }
  }

  return { owed, owing };
}

/** Mark a debt as paid. */
export async function markDebtAsPaid(debtId: string): Promise<boolean> {
  const { error } = await supabase
    .from('debts')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', debtId);
  return !error;
}

/** Fetch payment history (paid debts) for the given user. */
export async function fetchPaymentHistory(userId: string): Promise<DebtWithNames[]> {
  const { data, error } = await supabase
    .from('debts')
    .select(
      `id, split_id, creditor_id, debtor_id, amount, currency, is_paid, paid_at, created_at,
       splits(description),
       creditor:profiles!debts_creditor_id_fkey(name),
       debtor:profiles!debts_debtor_id_fkey(name)`
    )
    .or(`creditor_id.eq.${userId},debtor_id.eq.${userId}`)
    .eq('is_paid', true)
    .order('paid_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as unknown[]).map((row) => {
    const r = row as {
      id: string;
      split_id: string | null;
      creditor_id: string;
      debtor_id: string;
      amount: number;
      currency: string;
      is_paid: boolean;
      paid_at: string | null;
      created_at: string;
      splits?: { description?: string } | null;
      creditor?: { name?: string } | null;
      debtor?: { name?: string } | null;
    };
    return {
      id: r.id,
      split_id: r.split_id,
      creditor_id: r.creditor_id,
      debtor_id: r.debtor_id,
      amount: r.amount,
      currency: r.currency,
      is_paid: r.is_paid,
      paid_at: r.paid_at,
      created_at: r.created_at,
      description: r.splits?.description,
      creditor_name: r.creditor?.name ?? 'Unknown',
      debtor_name: r.debtor?.name ?? 'Unknown',
    } as DebtWithNames;
  });
}

// ─── Simple Debts (Cash Loans / IOUs) ───────────────────────────────────────

export interface SimpleDebt {
  id: string;
  from_user: string;
  to_user: string;
  amount: number;
  description: string;
  created_by: string;
  status: 'pending' | 'paid';
  created_at: string;
}

export async function createSimpleDebt(
  fromUser: string,
  toUser: string,
  amount: number,
  description: string,
  createdBy: string
): Promise<SimpleDebt> {
  const { data, error } = await supabase
    .from('simple_debts')
    .insert({ from_user: fromUser, to_user: toUser, amount, description, created_by: createdBy, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as SimpleDebt;
}

export async function markSimpleDebtAsPaid(debtId: string): Promise<boolean> {
  const { error } = await supabase
    .from('simple_debts')
    .update({ status: 'paid' })
    .eq('id', debtId);
  return !error;
}

// ─── Quick Splits ────────────────────────────────────────────────────────────

export interface QuickSplit {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  created_by: string;
  created_at: string;
}

export async function createQuickSplit(
  description: string,
  totalAmount: number,
  paidBy: string,
  participants: Array<{ userId: string; shareAmount: number }>,
  createdBy: string
): Promise<QuickSplit> {
  const { data: split, error: splitError } = await supabase
    .from('quick_splits')
    .insert({ description, total_amount: totalAmount, paid_by: paidBy, created_by: createdBy })
    .select()
    .single();
  if (splitError) throw splitError;

  const splitRecord = split as QuickSplit;

  if (participants.length > 0) {
    const rows = participants.map((p) => ({
      split_id: splitRecord.id,
      user_id: p.userId,
      share_amount: p.shareAmount,
      status: 'pending',
    }));
    await supabase.from('quick_split_participants').insert(rows);
  }

  return splitRecord;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export interface FriendBalance {
  friend_id: string;
  friend_name: string;
  net_amount: number; // positive = they owe you, negative = you owe them
}

export async function getBalances(userId: string): Promise<FriendBalance[]> {
  const { data, error } = await supabase
    .from('friend_balances')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error || !data) return [];

  const map = new Map<string, { name: string; net: number }>();

  for (const row of data as any[]) {
    const isUser = row.user_id === userId;
    const otherId: string = isUser ? row.friend_id : row.user_id;
    const otherName: string = isUser ? (row.friend_name ?? 'Unknown') : (row.user_name ?? 'Unknown');
    const amount: number = isUser ? row.net_amount : -row.net_amount;
    const existing = map.get(otherId);
    if (existing) {
      existing.net += amount;
    } else {
      map.set(otherId, { name: otherName, net: amount });
    }
  }

  return Array.from(map.entries()).map(([id, val]) => ({
    friend_id: id,
    friend_name: val.name,
    net_amount: val.net,
  }));
}

// ─── Transaction History ──────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: 'simple_debt' | 'quick_split';
  description: string;
  amount: number;
  you_owe: boolean; // true = you owe them, false = they owe you
  status: 'pending' | 'paid';
  created_at: string;
}

export async function getTransactionsWithFriend(
  userId: string,
  friendId: string
): Promise<Transaction[]> {
  const [debtsRes, splitsRes] = await Promise.all([
    supabase
      .from('simple_debts')
      .select('id, from_user, to_user, amount, description, status, created_at')
      .or(
        `and(from_user.eq.${userId},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${userId})`
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('quick_split_participants')
      .select(`
        id,
        share_amount,
        status,
        quick_splits (
          id,
          description,
          paid_by,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const transactions: Transaction[] = [];

  for (const d of (debtsRes.data ?? []) as any[]) {
    transactions.push({
      id: d.id,
      type: 'simple_debt',
      description: d.description || 'Cash loan',
      amount: d.amount,
      you_owe: d.from_user === userId,
      status: d.status,
      created_at: d.created_at,
    });
  }

  for (const p of (splitsRes.data ?? []) as any[]) {
    const split = p.quick_splits;
    if (!split) continue;
    transactions.push({
      id: p.id,
      type: 'quick_split',
      description: split.description || 'Bill split',
      amount: p.share_amount,
      you_owe: split.paid_by !== userId,
      status: p.status,
      created_at: split.created_at,
    });
  }

  transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return transactions;
}
