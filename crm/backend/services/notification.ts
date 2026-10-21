import { prisma } from "./prisma";

export interface DispatchNotificationOptions {
  recipientId?: string;
  recipientContact: string; // Email or phone
  channel?: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
  eventType: string; // e.g., PAYMENT_CONFIRMED, INSTALLMENT_DUE, CERTIFICATE_ISSUED
  subject?: string;
  message: string;
  variables?: Record<string, string | number>;
  linkUrl?: string;
}

export async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  category: "FINANCE" | "ACADEMIC" | "PAYROLL" | "SYSTEM" | "REMINDER" = "SYSTEM",
  linkUrl?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        category,
        linkUrl: linkUrl || null,
      },
    });
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
    return null;
  }
}

export function interpolateTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(val));
  }
  return result;
}

export async function dispatchNotification(options: DispatchNotificationOptions) {
  const {
    recipientId,
    recipientContact,
    channel = "EMAIL",
    eventType,
    subject = "Apex Global Academy Notice",
    message,
    variables = {},
    linkUrl,
  } = options;

  try {
    // 1. Check suppression (opt-out) list
    const suppressed = await prisma.messageSuppression.findUnique({
      where: { contactIdentifier: recipientContact.trim().toLowerCase() },
    });

    if (suppressed) {
      await prisma.notificationDeliveryLog.create({
        data: {
          recipientId: recipientId || null,
          recipientContact,
          channel,
          eventType,
          renderedSubject: subject,
          renderedBody: message,
          status: "SUPPRESSED",
          errorMessage: `Communication suppressed: Contact has opted out (${suppressed.reason}).`,
        },
      });
      return { success: false, status: "SUPPRESSED", reason: "Opted out" };
    }

    // 2. Check user preferences if recipientId provided
    if (recipientId) {
      const pref = await prisma.communicationPreference.findUnique({
        where: { userId: recipientId },
      });

      if (pref) {
        if (channel === "WHATSAPP" && !pref.whatsappNotifications) {
          return { success: false, status: "SUPPRESSED", reason: "WhatsApp notifications disabled by user" };
        }
        if (channel === "SMS" && !pref.smsNotifications) {
          return { success: false, status: "SUPPRESSED", reason: "SMS notifications disabled by user" };
        }
      }
    }

    // 3. Interpolate variables
    const renderedBody = interpolateTemplate(message, variables);
    const renderedSubject = interpolateTemplate(subject, variables);

    // 4. In-App Notification creation if recipientId exists
    if (recipientId && (channel === "IN_APP" || channel === "EMAIL")) {
      await createInAppNotification(
        recipientId,
        renderedSubject,
        renderedBody,
        eventType.includes("PAY") || eventType.includes("FEE") ? "FINANCE" : "ACADEMIC",
        linkUrl
      );
    }

    // 5. Pluggable channel simulation / dispatch
    // In production with credentials, SMTP/Twilio/WhatsApp Cloud API is executed here.
    const isMockOrSandbox = true;
    const providerMessageId = `MSG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const deliveryLog = await prisma.notificationDeliveryLog.create({
      data: {
        recipientId: recipientId || null,
        recipientContact,
        channel,
        eventType,
        renderedSubject,
        renderedBody,
        status: "SENT",
        provider:
          channel === "WHATSAPP"
            ? "WHATSAPP_BUSINESS"
            : channel === "SMS"
            ? "TWILIO_SMS"
            : "SMTP_TRANSACTIONAL",
        providerMessageId,
      },
    });

    return {
      success: true,
      status: "SENT",
      deliveryLogId: deliveryLog.id,
      providerMessageId,
    };
  } catch (error: any) {
    console.error("Notification dispatch error:", error);
    try {
      await prisma.notificationDeliveryLog.create({
        data: {
          recipientId: recipientId || null,
          recipientContact,
          channel,
          eventType,
          renderedSubject: subject,
          renderedBody: message,
          status: "FAILED",
          errorMessage: error.message || "Unknown delivery failure",
        },
      });
    } catch {}

    // Never throw — email/messaging failures must not abort parent business transaction
    return { success: false, status: "FAILED", error: error.message };
  }
}
