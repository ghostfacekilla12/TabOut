import type { Item, SplitCalculationResult } from '../types';

interface SplitOptions {
  hasService: boolean;
  servicePercentage: number;
  hasTax: boolean;
  taxPercentage: number;
  hasDeliveryFee: boolean;
  deliveryFee: number;
  splitMethod: 'proportional' | 'equal';
}

/**
 * Calculate split amounts for each participant.
 * For proportional method: each person pays tax/service based on their share of the subtotal.
 * For equal method: tax/service/delivery is split equally among participants.
 */
export const calculateSplit = (
  items: Item[],
  participants: string[],
  options: SplitOptions
): SplitCalculationResult => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const serviceAmount = options.hasService ? subtotal * (options.servicePercentage / 100) : 0;
  const taxAmount = options.hasTax ? subtotal * (options.taxPercentage / 100) : 0;
  const deliveryFee = options.hasDeliveryFee ? options.deliveryFee : 0;
  const totalAmount = subtotal + serviceAmount + taxAmount + deliveryFee;

  const participantCount = participants.length;

  const calculatedParticipants = participants.map((userId) => {
    const participantItems = items.filter((item) => item.ordered_by === userId);
    const itemSubtotal = participantItems.reduce((sum, item) => sum + item.price, 0);

    let serviceShare = 0;
    let taxShare = 0;
    let deliveryShare = 0;

    if (options.splitMethod === 'proportional' && subtotal > 0) {
      const proportion = itemSubtotal / subtotal;
      serviceShare = serviceAmount * proportion;
      taxShare = taxAmount * proportion;
      deliveryShare = deliveryFee / participantCount;
    } else {
      serviceShare = serviceAmount / participantCount;
      taxShare = taxAmount / participantCount;
      deliveryShare = deliveryFee / participantCount;
    }

    const participantTotal = itemSubtotal + serviceShare + taxShare + deliveryShare;

    return {
      user_id: userId,
      item_subtotal: round2(itemSubtotal),
      service_share: round2(serviceShare),
      tax_share: round2(taxShare),
      delivery_share: round2(deliveryShare),
      total_amount: round2(participantTotal),
    };
  });

  return {
    subtotal: round2(subtotal),
    service_amount: round2(serviceAmount),
    tax_amount: round2(taxAmount),
    total_amount: round2(totalAmount),
    participants: calculatedParticipants,
  };
};

/**
 * Calculate equal split for a given total among participants.
 */
export const calculateEqualSplit = (
  totalAmount: number,
  participants: string[],
  options: SplitOptions
): SplitCalculationResult => {
  const subtotal =
    totalAmount /
    (1 +
      (options.hasService ? options.servicePercentage / 100 : 0) +
      (options.hasTax ? options.taxPercentage / 100 : 0));

  const serviceAmount = options.hasService ? subtotal * (options.servicePercentage / 100) : 0;
  const taxAmount = options.hasTax ? subtotal * (options.taxPercentage / 100) : 0;
  const deliveryFee = options.hasDeliveryFee ? options.deliveryFee : 0;

  const participantCount = participants.length;
  const perPersonSubtotal = subtotal / participantCount;
  const perPersonService = serviceAmount / participantCount;
  const perPersonTax = taxAmount / participantCount;
  const perPersonDelivery = deliveryFee / participantCount;
  const perPersonTotal = perPersonSubtotal + perPersonService + perPersonTax + perPersonDelivery;

  const calculatedParticipants = participants.map((userId) => ({
    user_id: userId,
    item_subtotal: round2(perPersonSubtotal),
    service_share: round2(perPersonService),
    tax_share: round2(perPersonTax),
    delivery_share: round2(perPersonDelivery),
    total_amount: round2(perPersonTotal),
  }));

  return {
    subtotal: round2(subtotal),
    service_amount: round2(serviceAmount),
    tax_amount: round2(taxAmount),
    total_amount: round2(totalAmount),
    participants: calculatedParticipants,
  };
};

const round2 = (value: number): number => Math.round(value * 100) / 100;
