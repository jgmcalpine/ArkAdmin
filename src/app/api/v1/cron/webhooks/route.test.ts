import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GET } from './route';

// Mock the webhook worker
vi.mock('@/lib/fetch/webhook-worker', () => ({
  processWebhooks: vi.fn(),
}));

import { processWebhooks } from '@/lib/fetch/webhook-worker';

describe('GET /api/v1/cron/webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should return 200 and stats on success', async () => {
    const mockStats = {
      processed: 5,
      settled: 1,
      webhooks_sent: 1,
    };

    vi.mocked(processWebhooks).mockResolvedValue(mockStats);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockStats);
  });

  it('Should return 500 if worker fails', async () => {
    const mockError = new Error('Worker processing failed');
    vi.mocked(processWebhooks).mockRejectedValue(mockError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Worker processing failed');
  });
});

