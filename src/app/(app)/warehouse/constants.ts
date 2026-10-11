export const LOW_STOCK_THRESHOLD = 35;

export const STORAGE_TYPES = [
  { value: 'Ambient', label: 'Normal / Ambient', description: 'General warehouse stock' },
  { value: 'Cold Room', label: 'Cold Room', description: 'Chilled / temperature-controlled' },
  { value: 'Frozen', label: 'Frozen', description: 'Frozen cargo and perishables' },
  { value: 'Secure', label: 'Secure', description: 'High-value / restricted stock' },
  { value: 'Quarantine', label: 'Quarantine', description: 'Held pending inspection' },
  { value: 'Oversize', label: 'Oversize', description: 'Bulky freight and equipment' },
] as const;
