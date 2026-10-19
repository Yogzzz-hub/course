import { useState } from 'react';
import { Mail, Send, CheckCircle2, ArrowUpRight, X } from 'lucide-react';
import type { StudentSession } from './contracts';
import { sendStudentNotification, buildMailtoUrl, RECEIVER_EMAIL } from '../../utils/studentNotification';
import { Button, Card, Notice } from './ui';

interface ConsultationEnquiryModalProps {
  session: StudentSession;
  programmeTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConsultationEnquiryModal({
  session,
  programmeTitle = 'Python Full-Stack',
  isOpen,
  onClose,
}: ConsultationEnquiryModalProps) {
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('morning');
  const [topics, setTopics] = useState('Curriculum & Learning Pace');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const mailPayload = {
    type: 'consultation' as const,
    studentName: session.name,
    studentEmail: session.email,
    phone: phone.trim() || undefined,
    programme: programmeTitle,
    preferredDate: preferredDate || undefined,
    preferredTime,
    topics,
    message: message.trim() || undefined,
  };

  const mailtoUrl = buildMailtoUrl(mailPayload);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await sendStudentNotification(mailPayload);
      setSubmitted(true);
    } catch {
      setError('Could not send notification. You can use the Direct Email button below.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          aria-label="Close consultation modal"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="space-y-4 py-2 text-center" role="status">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={32} />
            </div>
            <h2 id="consultation-modal-title" className="text-xl font-bold text-slate-900">
              Consultation Enquiry Sent!
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Your consultation request has been forwarded to the academy admissions desk at{' '}
              <strong className="text-slate-900">{RECEIVER_EMAIL}</strong>.
            </p>
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              A counsellor will review your details and reach out to <strong>{session.email}</strong> to confirm your consultation schedule.
            </p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <a
                href={mailtoUrl}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Mail size={16} /> Open in Email App
              </a>
              <Button onClick={onClose} className="flex-1">
                Back to Workspace
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Mail size={22} />
              </div>
              <div>
                <h2 id="consultation-modal-title" className="text-lg font-bold text-slate-950">
                  Enquire for Consultation via Mail
                </h2>
                <p className="text-xs text-slate-500">
                  Direct dispatch to: <span className="font-semibold text-indigo-700">{RECEIVER_EMAIL}</span>
                </p>
              </div>
            </div>

            {error && <Notice error>{error}</Notice>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Name</label>
                <input
                  type="text"
                  readOnly
                  value={session.name}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Email</label>
                <input
                  type="email"
                  readOnly
                  value={session.email}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label htmlFor="consult-phone" className="block text-xs font-semibold text-slate-700">
                Contact Phone <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="consult-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="consult-date" className="block text-xs font-semibold text-slate-700">
                  Preferred Date
                </label>
                <div className="relative mt-1">
                  <input
                    id="consult-date"
                    type="date"
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="consult-time" className="block text-xs font-semibold text-slate-700">
                  Preferred Time Slot
                </label>
                <select
                  id="consult-time"
                  value={preferredTime}
                  onChange={e => setPreferredTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                >
                  <option value="morning">Morning (10:00 AM – 1:00 PM)</option>
                  <option value="afternoon">Afternoon (2:00 PM – 5:00 PM)</option>
                  <option value="evening">Evening (6:00 PM – 8:30 PM)</option>
                  <option value="weekend">Weekend Slots</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="consult-topic" className="block text-xs font-semibold text-slate-700">
                Consultation Topic
              </label>
              <select
                id="consult-topic"
                value={topics}
                onChange={e => setTopics(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              >
                <option value="Curriculum & Learning Pace">Curriculum & Learning Pace</option>
                <option value="Career Support & Internship Eligibility">Career Support & Internship Eligibility</option>
                <option value="Fee Breakdown & Payment Plans">Fee Breakdown & Payment Plans</option>
                <option value="1-on-1 Mentor Consultation">1-on-1 Mentor Consultation</option>
                <option value="General Enrolment Advice">General Enrolment Advice</option>
              </select>
            </div>

            <div>
              <label htmlFor="consult-message" className="block text-xs font-semibold text-slate-700">
                Your Questions or Learning Goals
              </label>
              <textarea
                id="consult-message"
                rows={3}
                placeholder="Mention any specific background, questions or scheduling preferences..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                maxLength={1000}
              />
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900">
              <p>
                This request will be routed directly to <strong>{RECEIVER_EMAIL}</strong>. A dedicated counsellor will reply with session details.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="submit" busy={busy} className="flex-1">
                <Send size={16} /> Send via Mail
              </Button>
              <a
                href={mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowUpRight size={16} /> Direct Email
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function ConsultationCard({
  session,
  programmeTitle,
}: {
  session: StudentSession;
  programmeTitle?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Mail size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Need guidance? Enquire for consultation via mail
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Send a consultation enquiry directly to our admissions team at <strong className="text-slate-800">{RECEIVER_EMAIL}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-800 transition"
          >
            <Send size={15} aria-hidden="true" />
            Enquire for consultation
          </button>
        </div>
      </Card>

      <ConsultationEnquiryModal
        session={session}
        programmeTitle={programmeTitle}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
