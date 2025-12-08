import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { ArkMovementSchema } from './schemas';

const realData = [
  {
    id: 8,
    status: 'Finished',
    subsystem: {
      name: 'bark.round',
      kind: 'refresh',
    },
    metadata: {
      funding_txid: '10a215856215f9e4a5a2b5da42620335e650f410b9cf8b6dd53d6a2009eac870',
    },
    intended_balance_sat: 0,
    effective_balance_sat: 0,
    offchain_fee_sat: 0,
    sent_to: [],
    received_on: [],
    input_vtxos: ['9319300982ff27dd79b0c60a8059490b5b18f79eab2209eb81d7db644022b1d2:0'],
    output_vtxos: ['08d3b3f806ba3bc64be8049502068f90a0fee545dd41dddf25bb111c5ef15fe1:0'],
    exited_vtxos: [],
    time: {
      created_at: '2025-12-07T09:13:57.642406-06:00',
      updated_at: '2025-12-07T09:15:58.230318-06:00',
      completed_at: '2025-12-07T09:15:58.237904-06:00',
    },
  },
  {
    id: 5,
    status: 'Failed',
    subsystem: {
      name: 'bark.round',
      kind: 'refresh',
    },
    metadata: {
      funding_txid: 'da3643abc577211b43b02dc8f38f579749c369f0cf562ad37be902cbcf309d82',
    },
    intended_balance_sat: 0,
    effective_balance_sat: 0,
    offchain_fee_sat: 0,
    sent_to: [],
    received_on: [],
    input_vtxos: ['ae1151e6e89c90f75361200ab436a84e59cd04f3c82fd142275bbb61943f8be0:1'],
    output_vtxos: ['9319300982ff27dd79b0c60a8059490b5b18f79eab2209eb81d7db644022b1d2:0'],
    exited_vtxos: [],
    time: {
      created_at: '2025-12-06T08:46:23.921880-06:00',
      updated_at: '2025-12-06T08:47:02.358958-06:00',
      completed_at: '2025-12-06T08:46:51.911782-06:00',
    },
  },
];

describe('ArkMovementSchema', () => {
  it('parses real movement data and validates key fields', () => {
    const parsed = z.array(ArkMovementSchema).parse(realData);

    expect(parsed[0].status).toBe('Finished');
    expect(parsed[0].subsystem.kind).toBe('refresh');

    const failed = parsed.find((movement) => movement.id === 5);
    expect(failed?.status).toBe('Failed');
  });
});

