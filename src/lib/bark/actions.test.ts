import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../env', () => ({
  env: {
    BARKD_URL: 'http://localhost:3001',
    NODE_ENV: 'test',
  },
}));

import { sendArkPayment, sendOnchainPayment } from './actions';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Response);

  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('bark send actions', () => {
  it('sendArkPayment posts correct payload', async () => {
    const input = {
      destination: 'ark_destination_12345',
      amount: 5000,
      comment: 'test memo',
    };

    await sendArkPayment(input);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/wallet/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          destination: input.destination,
          amount_sat: input.amount,
          comment: input.comment,
        }),
      },
    );
  });

  it('sendOnchainPayment posts correct payload', async () => {
    const input = {
      destination: 'tb1qexampleaddress12345',
      amount: 2500,
    };

    await sendOnchainPayment(input);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/onchain/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          destination: input.destination,
          amount_sat: input.amount,
        }),
      },
    );
  });

  it('fails validation for invalid input before fetch', async () => {
    const arkResult = await sendArkPayment({
      destination: 'ark_destination_12345',
      amount: 500, // below 10k min
    });
    expect(arkResult.success).toBe(false);
    expect(arkResult.message).toContain('10,000');

    const onchainResult = await sendOnchainPayment({
      destination: 'm1234567890',
      amount: 500, // below dust limit
    });
    expect(onchainResult.success).toBe(false);
    expect(onchainResult.message).toContain('546');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

