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
