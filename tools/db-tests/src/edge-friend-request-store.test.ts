// The real store of the `friend-request` Edge Function (supabase/functions/_shared/friend-request-store.ts). The pure
// handler tests mock the store, so the shape of the actual rpc answer was never pinned: send_friend_request_internal is
// declared `returns table (status text, created boolean)` — a SETOF function — and PostgREST answers such rpcs with a
// JSON ARRAY of rows, not one object. In production (2026-11-14) the request row was created, then the store's shape
// check threw on the array and the Edge Function 500ed before the mail was sent: the app showed a pending "Sent"
// request and the addressee never got the e-mail. These tests pin both shapes so neither regresses.
import { describe, expect, it, vi } from 'vitest';

import { makeFriendRequestStore } from '../../../supabase/functions/_shared/friend-request-store.ts';
import type { SupabaseLike } from '../../../supabase/functions/_shared/food-store.ts';

const USER = '11111111-1111-1111-1111-111111111111';

function adminWith(data: unknown, error: unknown = null): SupabaseLike {
  return {
    rpc: vi.fn(async () => ({ data, error })),
    from: vi.fn(() => {
      throw new Error('not used by sendRequestInternal');
    }),
  } as unknown as SupabaseLike;
}

describe('friend-request-store: the rpc answer shape of send_friend_request_internal', () => {
  it('a SETOF answer arrives as a one-element array: the row inside is read', async () => {
    const store = makeFriendRequestStore(adminWith([{ status: 'sent', created: true }]));
    const outcome = await store.sendRequestInternal(USER, 'bob@example.com');
    expect(outcome).toEqual({ kind: 'ok', status: 'sent', created: true });
  });

  it('a plain object answer (a non-setof deployment or future migration) still reads', async () => {
    const store = makeFriendRequestStore(adminWith({ status: 'already_requested', created: false }));
    const outcome = await store.sendRequestInternal(USER, 'bob@example.com');
    expect(outcome).toEqual({ kind: 'ok', status: 'already_requested', created: false });
  });

  it('an empty array is the unexpected response (never a made-up outcome)', async () => {
    const store = makeFriendRequestStore(adminWith([]));
    await expect(store.sendRequestInternal(USER, 'bob@example.com')).rejects.toThrow('unexpected response');
  });

  it('a row with a missing or non-boolean created stays an unexpected response', async () => {
    const store = makeFriendRequestStore(adminWith([{ status: 'sent' }]));
    await expect(store.sendRequestInternal(USER, 'bob@example.com')).rejects.toThrow('unexpected response');
  });
});
