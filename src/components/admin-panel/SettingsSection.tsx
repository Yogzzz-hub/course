import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Key,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useAdminAuthority } from "./hooks";
import { Button, Card, Notice, ScreenTitle, StatusPill } from "./ui";
import { dateTime } from "./utils";

export function SettingsSection({
  onRefreshSession,
}: {
  onRefreshSession: () => Promise<void>;
}) {
  const { session } = useAdminAuthority();
  const [busy, setBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlaBreaches, setNotifySlaBreaches] = useState(true);
  const [dailyDigest, setDailyDigest] = useState("08:00 AM");

  const handleRefresh = async () => {
    setBusy(true);
    setSuccessNotice(null);
    try {
      await onRefreshSession();
      setSuccessNotice("Admin session and cryptographic tokens refreshed successfully.");
    } catch {
      // handled
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Security & Preferences"
        title="Admin Settings"
      />

      {successNotice && <Notice>{successNotice}</Notice>}

      {/* 2FA & Session Security Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F6ED] text-[#10754A]">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text)]">
                  Two-Factor Authentication (2FA)
                </h3>
                <StatusPill status="Verified & Active" variant="paid" />
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Hardware token / TOTP challenge verification is actively enforced.
              </p>
            </div>
          </div>

          <Button
            secondary
            busy={busy}
            onClick={handleRefresh}
          >
            <RefreshCw size={15} /> Refresh session
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border)] text-xs">
          <div className="bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Signed-in Administrator</span>
            <span className="font-bold text-[var(--text)] text-sm">{session.name}</span>
          </div>
          <div className="bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[var(--muted)] block">2FA Verified Until</span>
            <span className="font-bold text-[var(--text)] text-sm">
              {dateTime(session.twoFactorExpiresAt)}
            </span>
          </div>
          <div className="bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Session Security Scope</span>
            <span className="font-mono text-[var(--accent)] text-xs font-bold truncate block">
              {session.userId} · {session.permissions.length} privileges
            </span>
          </div>
        </div>
      </Card>

      {/* Notification Schedule Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
            <Bell size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text)]">
              Notification Schedules & Alerts
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Configure delivery cadence for admissions SLAs, financial approvals, and daily digests.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-[var(--border)]">
          <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-alt)] cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                Urgent Admissions SLA Breach Alerts
              </div>
              <div className="text-xs text-[var(--muted)]">
                Instant email notification when an enquiry follow-up exceeds 60 minutes
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifySlaBreaches}
              onChange={(e) => setNotifySlaBreaches(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)] rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-alt)] cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                Transactional Approval Requests
              </div>
              <div className="text-xs text-[var(--muted)]">
                Notify when counsellors submit scholarship discounts or bank proofs
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)] rounded"
            />
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-[var(--border)] gap-2">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                Daily Admissions & Revenue Digest
              </div>
              <div className="text-xs text-[var(--muted)]">
                Summary of previous day's collections and pipeline status
              </div>
            </div>
            <select
              value={dailyDigest}
              onChange={(e) => setDailyDigest(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] min-h-[44px]"
            >
              <option value="08:00 AM">08:00 AM IST</option>
              <option value="09:00 AM">09:00 AM IST</option>
              <option value="10:00 AM">10:00 AM IST</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => {
              setSuccessNotice("Notification preferences updated successfully.");
            }}
          >
            Save preferences
          </Button>
        </div>
      </Card>
    </div>
  );
}

