export const ROLES = ['Setter', 'Vendedor', 'Partner', 'Founder', 'Social Seller'] as const;
export type Role = typeof ROLES[number];

export const roleVariant = (r: string) =>
  r === 'Setter' ? 'purp' as const :
  r === 'Founder' ? 'red' as const :
  r === 'Partner' ? 'blue' as const :
  r === 'Social Seller' ? 'pink' as const :
  'gold' as const;
