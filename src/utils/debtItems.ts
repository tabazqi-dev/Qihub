import { DebtLineItem, DebtReceivable } from '../types';

/**
 * Extracts itemized line items from a DebtReceivable.
 * Supports explicit `debt.items` and falls back to parsing legacy "+ Tambahan Rp X: desc" notes.
 */
export function getDebtLineItems(debt: DebtReceivable): DebtLineItem[] {
  if (Array.isArray(debt.items) && debt.items.length > 0) {
    return debt.items;
  }

  const parsedExtras: DebtLineItem[] = [];
  if (debt.notes) {
    const lines = debt.notes.split('\n');
    const regex = /^\+\s*Tambahan\s+Rp\s*([\d.,]+)\s*:\s*(.+)$/i;
    lines.forEach((line, idx) => {
      const m = line.trim().match(regex);
      if (m) {
        const amt = parseInt(m[1].replace(/\D/g, ''), 10) || 0;
        const desc = m[2].trim();
        if (amt > 0) {
          parsedExtras.push({
            id: `${debt.id}-extra-${idx}`,
            description: desc || 'Tambahan Piutang',
            amount: amt,
            date: debt.issuedDate,
          });
        }
      }
    });
  }

  const extrasSum = parsedExtras.reduce((s, item) => s + item.amount, 0);
  if (parsedExtras.length > 0 && debt.amount > extrasSum) {
    return [
      {
        id: `${debt.id}-base`,
        description: debt.description || 'Piutang Awal',
        amount: debt.amount - extrasSum,
        date: debt.issuedDate,
      },
      ...parsedExtras,
    ];
  }

  return [
    {
      id: `${debt.id}-single`,
      description: debt.description || 'Tagihan Piutang',
      amount: debt.amount,
      date: debt.issuedDate,
    },
  ];
}

/**
 * Validates that an image URL or data URI is safe for rendering in <img> src attributes.
 */
export function sanitizeSafeImageSrc(val?: string, maxLen = 245000): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLen) return undefined;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}
