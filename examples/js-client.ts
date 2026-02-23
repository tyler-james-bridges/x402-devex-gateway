/**
 * JS/TS client example aligned to current scaffold:
 * - Unpaid call returns 402 with error.x402 instructions
 * - Retry with X-Paid: true and same Idempotency-Key
 */

type Unpaid402 = {
  error: {
    code: 'PAYMENT_REQUIRED' | 'PAYMENT_UNDERPAID' | 'POLICY_CAP_EXCEEDED' | 'WALLET_FUNDING_FAILED' | string;
    message: string;
    x402?: {
      resourceId?: string;
      amount?: { currency?: string; value?: string };
      receiver?: string;
      paymentHeader?: string;
      retryHint?: string;
    };
  };
};

type Paid200 = {
  status: 'completed';
  result: { taskId: string; output: { summary: string }; durationMs: number };
  receipt: {
    paid: boolean;
    receiptId: string;
    network: string;
    txHash: string;
    payer: string;
    receiver: string;
    amount: { currency: string; value: string };
    paidAt: string;
  };
  idempotencyKey: string | null;
};

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';

async function postTask(task: string, idempotencyKey: string, paid = false): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  };
  if (paid) headers['X-Paid'] = 'true';

  return fetch(`${API_BASE}/agent/task`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ task }),
  });
}

export async function runTaskWith402Retry(task: string): Promise<Paid200> {
  const idempotencyKey = crypto.randomUUID();

  let res = await postTask(task, idempotencyKey, false);

  if (res.status === 402) {
    const unpaid = (await res.json()) as Unpaid402;

    if (unpaid.error.code === 'POLICY_CAP_EXCEEDED') {
      throw new Error(`Policy blocked payment: ${unpaid.error.message}`);
    }

    // In this scaffold, paying is represented by setting X-Paid: true.
    res = await postTask(task, idempotencyKey, true);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Unpaid402 | null;
    throw new Error(`Request failed (${res.status}): ${body?.error?.code ?? 'UNKNOWN'}`);
  }

  return (await res.json()) as Paid200;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTaskWith402Retry('summarize this')
    .then((data) => {
      console.log('taskId:', data.result.taskId);
      console.log('receiptId:', data.receipt.receiptId);
      console.log('idempotencyKey:', data.idempotencyKey);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
