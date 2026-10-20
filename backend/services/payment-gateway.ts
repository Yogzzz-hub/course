import { prisma } from "./prisma";
import crypto from "crypto";
import {
  roundCurrency,
  generateTransactionNumber,
  generateReceiptNumber,
  calculatePaymentAllocations,
  recordLedgerEntry,
} from "./finance";
import { dispatchNotification } from "./notification";

export interface CreatePaymentOrderInput {
  studentProfileId: string;
  feeAgreementId: string;
  installmentId?: string | null;
  amount: number;
  currency?: string;
  provider?: "SANDBOX" | "RAZORPAY" | "STRIPE";
}

export async function createPaymentGatewayOrder(input: CreatePaymentOrderInput) {
  const provider = input.provider || "SANDBOX";
  const currency = input.currency || "INR";
  const roundedAmount = roundCurrency(input.amount);

  if (roundedAmount <= 0) {
    throw new Error("Payment order amount must be greater than zero");
  }

  const orderId = `order_${provider.toLowerCase()}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await prisma.paymentGatewayOrder.create({
    data: {
      orderId,
      provider,
      studentProfileId: input.studentProfileId,
      feeAgreementId: input.feeAgreementId,
      installmentId: input.installmentId || null,
      amount: roundedAmount,
      currency,
      status: "CREATED",
      checkoutUrl: `/student/payments/checkout?orderId=${orderId}`,
    },
  });

  return {
    success: true,
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    provider: order.provider,
    checkoutUrl: order.checkoutUrl,
    isSandbox: provider === "SANDBOX" || !process.env.RAZORPAY_KEY_ID,
  };
}

export async function processPaymentProviderWebhook(params: {
  provider: "SANDBOX" | "RAZORPAY" | "STRIPE";
  eventId: string;
  eventType: string;
  payload: any;
  signature?: string;
}) {
  const { provider, eventId, eventType, payload, signature } = params;

  // 1. Idempotency Check: Prevent duplicate webhook execution
  const existingEvent = await prisma.paymentProviderEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent && existingEvent.processed) {
    return {
      success: true,
      duplicate: true,
      message: "Webhook event already processed previously. Idempotent response returned.",
    };
  }

  // Record provider event
  const recordedEvent = await prisma.paymentProviderEvent.upsert({
    where: { eventId },
    create: {
      provider,
      eventId,
      eventType,
      payloadJson: JSON.stringify(payload),
      signature: signature || null,
      isVerified: true,
      processed: false,
    },
    update: {},
  });

  // Handle successful payment event
  const isPaymentSuccess =
    eventType === "payment.captured" ||
    eventType === "order.paid" ||
    eventType === "payment_intent.succeeded" ||
    eventType === "SANDBOX_PAYMENT_SUCCESS";

  if (!isPaymentSuccess) {
    await prisma.paymentProviderEvent.update({
      where: { id: recordedEvent.id },
      data: { processed: true, processedAt: new Date() },
    });
    return { success: true, processed: true, message: `Event ${eventType} recorded.` };
  }

  const orderId = payload.orderId || payload.order_id;
  const order = await prisma.paymentGatewayOrder.findUnique({
    where: { orderId },
  });

  if (!order) {
    await prisma.paymentProviderEvent.update({
      where: { id: recordedEvent.id },
      data: { errorMessage: `Gateway order not found for ${orderId}` },
    });
    throw new Error(`Order ${orderId} not found`);
  }

  const feeAgreement = await prisma.feeAgreement.findUnique({
    where: { id: order.feeAgreementId },
    include: {
      installments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  // Process transaction atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark order paid
    await tx.paymentGatewayOrder.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    const transactionNumber = await generateTransactionNumber();

    // 2. Create StudentPayment
    const payment = await tx.studentPayment.create({
      data: {
        transactionNumber,
        studentProfileId: order.studentProfileId,
        feeAgreementId: order.feeAgreementId,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: "ONLINE_GATEWAY",
        verificationStatus: "CONFIRMED",
        externalReference: order.orderId,
        verifiedAt: new Date(),
        notes: `Online checkout via ${provider}. Webhook Event ID: ${eventId}`,
      },
    });

    // 3. Allocate across installments
    const installmentsList = feeAgreement?.installments || [];
    const allocations = calculatePaymentAllocations(
      order.amount,
      installmentsList
    );

    for (const alloc of allocations) {
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          installmentId: alloc.installmentId,
          allocatedAmount: alloc.allocatedAmount,
        },
      });

      const updatedRemaining = alloc.newRemainingBalance;
      const status = updatedRemaining <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      await tx.feeInstallment.update({
        where: { id: alloc.installmentId },
        data: {
          remainingBalance: updatedRemaining,
          amountPaid: { increment: alloc.allocatedAmount },
          status,
          lastPaymentDate: new Date(),
        },
      });
    }

    // 4. Calculate total remaining balance for student
    const totalRemaining = installmentsList.reduce(
      (sum, inst) => {
        const alloc = allocations.find((a) => a.installmentId === inst.id);
        const rem = alloc ? alloc.newRemainingBalance : inst.remainingBalance;
        return sum + rem;
      },
      0
    );

    // 5. Generate Receipt
    const receiptNumber = await generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        studentPaymentId: payment.id,
        studentProfileId: order.studentProfileId,
        totalPaid: payment.amount,
        balanceRemaining: Math.max(0, totalRemaining),
        pdfUrl: `/api/receipts/${payment.id}/pdf`,
      },
    });

    // 6. Record in Financial Ledger
    await recordLedgerEntry(
      {
        transactionType: "PAYMENT",
        direction: "CREDIT",
        amount: payment.amount,
        currency: payment.currency,
        accountCode: "PAYMENT_GATEWAY",
        referenceType: "StudentPayment",
        referenceId: payment.id,
        studentProfileId: order.studentProfileId,
        notes: `Online gateway collection via ${provider}. Transaction ${transactionNumber}`,
      },
      tx
    );

    return { payment, receipt };
  });

  // Mark event as processed
  await prisma.paymentProviderEvent.update({
    where: { id: recordedEvent.id },
    data: { processed: true, processedAt: new Date() },
  });

  // Fetch student contact for notification
  const student = await prisma.studentProfile.findUnique({
    where: { id: order.studentProfileId },
    include: { user: true },
  });

  if (student) {
    await dispatchNotification({
      recipientId: student.userId,
      recipientContact: student.user.email,
      channel: "EMAIL",
      eventType: "PAYMENT_CONFIRMED",
      subject: "Payment Confirmed — Receipt {{receipt_number}}",
      message:
        "Hello {{student_name}}, your online payment of {{amount}} has been confirmed. Receipt #{{receipt_number}} is now available for download.",
      variables: {
        student_name: student.user.name,
        amount: `${order.currency} ${order.amount}`,
        receipt_number: result.receipt.receiptNumber,
      },
      linkUrl: "/student/fees",
    });
  }

  return {
    success: true,
    paymentId: result.payment.id,
    receiptNumber: result.receipt.receiptNumber,
    message: "Payment successfully confirmed and allocated.",
  };
}
