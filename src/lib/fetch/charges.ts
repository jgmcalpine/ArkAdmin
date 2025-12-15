import { db } from './db';
import type { Prisma } from '@/generated/prisma/client';

export interface CreateChargeInput {
  amountSat: number;
  description?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  paymentHash: string;
  invoice: string;
  expiresAt?: Date;
}

export type Charge = {
  id: string;
  amountSat: number;
  description: string | null;
  webhookUrl: string | null;
  status: string;
  webhookStatus: string;
  paymentHash: string;
  invoice: string;
  metadata: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Creates a new Charge record in the database.
 * @param data - The charge data to create
 * @returns The created Charge record
 */
export async function createCharge(input: CreateChargeInput): Promise<Charge> {
  const chargeData: Prisma.ChargeUncheckedCreateInput = {
    amountSat: input.amountSat,
    description: input.description ?? null,
    webhookUrl: input.webhookUrl ?? null,
    status: 'pending',
    webhookStatus: 'pending',
    paymentHash: input.paymentHash,
    invoice: input.invoice,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    expiresAt: input.expiresAt ?? null,
  };

  const charge = await db.charge.create({
    data: chargeData,
  });

  return charge as Charge;
}

/**
 * Retrieves a Charge by its ID.
 * @param id - The Charge ID
 * @returns The Charge record or null if not found
 */
export async function getCharge(id: string): Promise<Charge | null> {
  const charge = await db.charge.findUnique({
    where: { id },
  });

  return charge as Charge | null;
}

/**
 * Retrieves a Charge by its payment hash.
 * @param paymentHash - The payment hash to identify the charge
 * @returns The Charge record or null if not found
 */
export async function getChargeByHash(paymentHash: string): Promise<Charge | null> {
  const charge = await db.charge.findUnique({
    where: { paymentHash },
  });

  return charge as Charge | null;
}

/**
 * Updates the status of a Charge by payment hash.
 * @param paymentHash - The payment hash to identify the charge
 * @param status - The new status value
 * @returns The updated Charge record or null if not found
 */
export async function updateChargeStatus(
  paymentHash: string,
  status: string,
): Promise<Charge | null> {
  const charge = await db.charge.update({
    where: { paymentHash },
    data: { status },
  });

  return charge as Charge | null;
}

/**
 * Retrieves all charges with status="pending".
 * @returns Array of pending Charge records
 */
export async function getPendingCharges(): Promise<Charge[]> {
  const charges = await db.charge.findMany({
    where: { status: 'pending' },
  });

  return charges as Charge[];
}

/**
 * Marks a charge as paid by ID.
 * @param id - The Charge ID
 * @returns The updated Charge record or null if not found
 */
export async function markChargePaid(id: string): Promise<Charge | null> {
  const charge = await db.charge.update({
    where: { id },
    data: { status: 'paid' },
  });

  return charge as Charge | null;
}

/**
 * Updates the webhook status of a Charge by ID.
 * @param id - The Charge ID
 * @param status - The new webhook status (e.g., 'success', 'failed', 'pending')
 * @returns The updated Charge record or null if not found
 */
export async function updateWebhookStatus(
  id: string,
  status: string,
): Promise<Charge | null> {
  const charge = await db.charge.update({
    where: { id },
    data: { webhookStatus: status },
  });

  return charge as Charge | null;
}

