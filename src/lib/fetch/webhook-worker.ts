import { checkLightningStatus } from '@/lib/bark/actions';
import {
  getPendingCharges,
  markChargePaid,
  updateWebhookStatus,
  type Charge,
} from './charges';

export interface WebhookStats {
  processed: number;
  settled: number;
  webhooks_sent: number;
}

const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * Sends a webhook notification to the merchant.
 * @param webhookUrl - The URL to send the webhook to
 * @param charge - The charge data to send
 * @returns true if successful, false otherwise
 */
async function sendWebhook(webhookUrl: string, charge: Charge): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: charge.id,
        amountSat: charge.amountSat,
        description: charge.description,
        status: charge.status,
        paymentHash: charge.paymentHash,
        invoice: charge.invoice,
        metadata: charge.metadata ? JSON.parse(charge.metadata) : null,
        createdAt: charge.createdAt.toISOString(),
        updatedAt: charge.updatedAt.toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Consider 2xx status codes as success
    return response.ok;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Webhook dispatch failed for charge ${charge.id}:`, error.message);
    } else {
      console.error(`Webhook dispatch failed for charge ${charge.id}:`, 'Unknown error');
    }
    return false;
  }
}

/**
 * Processes pending charges, checks their lightning status, and dispatches webhooks.
 * @returns Statistics about the processing run
 */
export async function processWebhooks(): Promise<WebhookStats> {
  const stats: WebhookStats = {
    processed: 0,
    settled: 0,
    webhooks_sent: 0,
  };

  try {
    // 1. Get pending charges
    const pendingCharges = await getPendingCharges();
    stats.processed = pendingCharges.length;

    // 2. Loop through them
    for (const charge of pendingCharges) {
      try {
        // Check lightning status
        const statusResult = await checkLightningStatus(charge.paymentHash);

        if (!statusResult.success) {
          console.warn(
            `Failed to check status for charge ${charge.id} (hash: ${charge.paymentHash})`,
          );
          continue;
        }

        const { status } = statusResult;

        // If status is 'settled' or 'paid', mark as paid and send webhook
        if (status === 'settled' || status === 'paid') {
          // Update DB: markChargePaid
          const updatedCharge = await markChargePaid(charge.id);

          if (!updatedCharge) {
            console.error(`Failed to mark charge ${charge.id} as paid`);
            continue;
          }

          stats.settled++;

          // If webhookUrl exists, send webhook
          if (updatedCharge.webhookUrl) {
            const webhookSuccess = await sendWebhook(
              updatedCharge.webhookUrl,
              updatedCharge,
            );

            // Update DB: updateWebhookStatus
            await updateWebhookStatus(
              updatedCharge.id,
              webhookSuccess ? 'success' : 'failed',
            );

            if (webhookSuccess) {
              stats.webhooks_sent++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing charge ${charge.id}:`, errorMessage);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in processWebhooks:', errorMessage);
  }

  return stats;
}

