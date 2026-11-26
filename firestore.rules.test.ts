/**
 * Payload-First Security Test Specification for Pruthvi FX Firestore Rules.
 * Verifies all 12 "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED
 * against firestore.rules when executed in the Firebase Rules Emulator.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actor: { uid?: string; email?: string; email_verified?: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated write to site_config/main',
    actor: null,
    operation: 'update',
    path: 'site_config/main',
    payload: { brandPrefix: 'Hacked' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Non-admin authenticated user creates category',
    actor: { uid: 'user-123', email: 'attacker@example.com', email_verified: true },
    operation: 'create',
    path: 'categories/hacked',
    payload: { name: 'Hacked', description: '', order: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified admin email spoof attack',
    actor: { uid: 'spoof-1', email: 'gamerking94p@gmail.com', email_verified: false },
    operation: 'update',
    path: 'site_config/main',
    payload: { brandName: 'Spoofed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-assigned admin privilege escalation',
    actor: { uid: 'user-123', email: 'attacker@example.com', email_verified: true },
    operation: 'create',
    path: 'admins/user-123',
    payload: { email: 'attacker@example.com', addedBy: 'user-123' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Non-admin attempts to read /admins PII collection',
    actor: { uid: 'user-123', email: 'attacker@example.com', email_verified: true },
    operation: 'list',
    path: 'admins',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow ghost field injection on FAQ write',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'faqs/faq-ghost',
    payload: { question: 'Q?', answer: 'A.', order: 1, isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned thumbnail referencing non-existent category',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'thumbnails/orphan-1',
    payload: {
      categoryId: 'nonexistent_cat',
      title: 'Test',
      src: 'https://example.com/a.jpg',
      client: '',
      videoUrl: '',
      order: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID poisoning with invalid characters',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'categories/invalid$id!with.dots',
    payload: { name: 'Bad', description: '', order: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Oversized string payload denial-of-wallet test',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'categories/oversized',
    payload: { name: 'A'.repeat(250), description: '', order: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Forged client timestamp on FAQ create',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'faqs/faq-time',
    payload: { question: 'Q?', answer: 'A.', order: 1, updatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Invalid row enum value on Client create',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'create',
    path: 'clients/c-badrow',
    payload: {
      name: 'Creator',
      subs: '1M+ subscribers',
      avatar: 'https://example.com/a.png',
      channelUrl: 'https://youtube.com/@test',
      row: 99,
      order: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable createdAt mutation on admins update',
    actor: { uid: 'admin-1', email: 'gamerking94p@gmail.com', email_verified: true },
    operation: 'update',
    path: 'admins/admin-2',
    payload: { email: 'admin2@example.com', addedBy: 'other', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
];
