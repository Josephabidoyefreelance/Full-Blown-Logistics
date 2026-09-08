// Role is a label for the owner's own reference, it doesn't determine
// what tabs someone can see, that's controlled per-person via checkboxes
// in the Administrator tab, stored in customer_team_members.permitted_modules.

export const STAFF_ROLE_OPTIONS = [
  'Marketing',
  'Customer Service',
  'Finance',
  'Warehouse',
  'Operations',
  'Sales',
  'Other',
] as const;

export type StaffRole = string;
