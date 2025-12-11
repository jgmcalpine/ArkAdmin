import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayment } from './use-payment';

vi.mock('../bark/actions', () => ({
  createLightningInvoice: vi.fn(),
  checkLightningStatus: vi.fn(),
}));

import { createLightningInvoice, checkLightningStatus } from '../bark/actions';

describe('usePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => usePayment());

    expect(result.current.status).toBe('idle');
    expect(result.current.invoice).toBeNull();
    expect(result.current.hash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('startTransaction transitions idle -> creating -> awaiting_payment', async () => {
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
      message: 'Invoice created',
    });

    const { result } = renderHook(() => usePayment());

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.startTransaction(1000, 'Test payment');
    });

    // Should transition to awaiting_payment after successful invoice creation
    expect(result.current.status).toBe('awaiting_payment');
    expect(result.current.invoice).toBe(mockInvoice);
    expect(result.current.hash).toBe(mockHash);
    expect(result.current.error).toBeNull();
    expect(createLightningInvoice).toHaveBeenCalledWith({
      amount: 1000,
      description: 'Test payment',
    });
  });

  it('polling detects settled and transitions to paid', async () => {
    vi.useFakeTimers();
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
      message: 'Invoice created',
    });

    // First call returns pending, second returns settled
    vi.mocked(checkLightningStatus)
      .mockResolvedValueOnce({
        success: true,
        status: 'pending',
      })
      .mockResolvedValueOnce({
        success: true,
        status: 'settled',
      });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('awaiting_payment');

    // Advance time by 2 seconds (first poll)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(checkLightningStatus).toHaveBeenCalledWith(mockHash);
    expect(result.current.status).toBe('awaiting_payment'); // Still awaiting

    // Advance time by another 2 seconds (second poll)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.status).toBe('paid');
    expect(checkLightningStatus).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('handles invoice creation failure', async () => {
    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: false,
      message: 'Failed to create invoice',
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to create invoice');
    expect(result.current.invoice).toBeNull();
    expect(result.current.hash).toBeNull();
  });

  it('handles missing payment hash', async () => {
    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: 'lnbc1234567890',
      // paymentHash is missing
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Payment hash not returned from server');
  });

  it('handles expired payment status', async () => {
    vi.useFakeTimers();
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
    });

    vi.mocked(checkLightningStatus).mockResolvedValue({
      success: true,
      status: 'expired',
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('awaiting_payment');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Payment expired');
    vi.useRealTimers();
  });

  it('handles polling API errors', async () => {
    vi.useFakeTimers();
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
    });

    vi.mocked(checkLightningStatus).mockResolvedValue({
      success: false,
      status: 'unknown',
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to check payment status');
    vi.useRealTimers();
  });

  it('reset clears all state and stops polling', async () => {
    vi.useFakeTimers();
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
    });

    vi.mocked(checkLightningStatus).mockResolvedValue({
      success: true,
      status: 'pending',
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('awaiting_payment');
    expect(result.current.invoice).toBe(mockInvoice);
    expect(result.current.hash).toBe(mockHash);

    // Clear previous calls
    vi.clearAllMocks();

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.invoice).toBeNull();
    expect(result.current.hash).toBeNull();
    expect(result.current.error).toBeNull();

    // Advance time to verify polling stopped
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // checkLightningStatus should not be called after reset
    expect(checkLightningStatus).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cleans up polling on unmount', async () => {
    vi.useFakeTimers();
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
    });

    vi.mocked(checkLightningStatus).mockResolvedValue({
      success: true,
      status: 'pending',
    });

    const { result, unmount } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(result.current.status).toBe('awaiting_payment');

    const callCountBeforeUnmount = vi.mocked(checkLightningStatus).mock.calls.length;

    unmount();

    // Advance time after unmount
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // checkLightningStatus should not be called after unmount
    const callCountAfterUnmount = vi.mocked(checkLightningStatus).mock.calls.length;
    expect(callCountAfterUnmount).toBe(callCountBeforeUnmount);
    vi.useRealTimers();
  });

  it('uses default description when not provided', async () => {
    const mockInvoice = 'lnbc1234567890';
    const mockHash = 'abc123def456';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      invoice: mockInvoice,
      paymentHash: mockHash,
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.startTransaction(1000);
    });

    expect(createLightningInvoice).toHaveBeenCalledWith({
      amount: 1000,
      description: 'POS Payment',
    });
  });
});

