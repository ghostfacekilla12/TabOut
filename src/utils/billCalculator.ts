export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // user IDs; split equally when multiple
}

export interface BillReceiptData {
  items: BillItem[];
  servicePercent?: number; // e.g. 12
  taxPercent?: number; // e.g. 14
  deliveryFee?: number;
  discount?: number;
  paidBy: string; // user ID of person who paid
  participants: string[]; // all participant IDs
}

export interface PersonShare {
  personId: string;
  itemsSubtotal: number;
  serviceCharge: number;
  taxCharge: number;
  deliveryShare: number;
  discountShare: number;
  totalOwed: number;
}

/**
 * Calculate proportional bill split.
 *
 * - Each person's tax/service is based on their items subtotal.
 * - Delivery is split equally among all participants.
 * - Discount is applied proportionally based on subtotal share.
 * - Items shared by multiple people are divided equally among them.
 */
export function calculateBillSplit(receipt: BillReceiptData): PersonShare[] {
  const {
    items,
    servicePercent = 0,
    taxPercent = 0,
    deliveryFee = 0,
    discount = 0,
    participants,
  } = receipt;

  const participantCount = participants.length;

  // Compute each participant's items subtotal
  const subtotals: Record<string, number> = {};
  for (const id of participants) {
    subtotals[id] = 0;
  }

  for (const item of items) {
    if (item.assignedTo.length === 0) continue;
    const sharePrice = (item.price * item.quantity) / item.assignedTo.length;
    for (const id of item.assignedTo) {
      if (id in subtotals) {
        subtotals[id] += sharePrice;
      }
    }
  }

  const grandSubtotal = Object.values(subtotals).reduce((s, v) => s + v, 0);

  const deliveryPerPerson = participantCount > 0 ? deliveryFee / participantCount : 0;

  return participants.map((id) => {
    const itemsSubtotal = round2(subtotals[id] ?? 0);
    const serviceCharge = round2(itemsSubtotal * (servicePercent / 100));
    const taxCharge = round2(itemsSubtotal * (taxPercent / 100));
    const deliveryShare = round2(deliveryPerPerson);

    // Proportional discount: person's share of the total discount
    const discountShare =
      grandSubtotal > 0 ? round2(discount * (itemsSubtotal / grandSubtotal)) : 0;

    const totalOwed = round2(
      itemsSubtotal + serviceCharge + taxCharge + deliveryShare - discountShare
    );

    return {
      personId: id,
      itemsSubtotal,
      serviceCharge,
      taxCharge,
      deliveryShare,
      discountShare,
      totalOwed,
    };
  });
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
