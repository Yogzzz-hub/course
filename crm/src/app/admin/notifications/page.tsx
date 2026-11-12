"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Eye,
} from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  code: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
  subject?: string;
  body: string;
  variables: string;
  isActive: boolean;
}

interface DeliveryLogItem {
  id: string;
  channel: string;
  status: string;
  provider: string;
  providerMessageId?: string;
  errorReason?: string;
  attemptedAt: string;
  recipientName: string;
  recipientRole: string;
  eventType: string;
  subject: string;
}

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Template Form
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"IN_APP" | "EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [variables, setVariables] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        setDeliveryLogs(data.deliveryLogs || []);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditTemplate = (tmpl: TemplateItem) => {
    setSelectedTemplateId(tmpl.id);
    setName(tmpl.name);
    setCode(tmpl.code);
    setChannel(tmpl.channel);
    setSubject(tmpl.subject || "");
    setBodyText(tmpl.body);
    setVariables(tmpl.variables || "");
    setIsModalOpen(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplateId(undefined);
    setName("");
    setCode("");
    setChannel("EMAIL");
    setSubject("");
    setBodyText("");
    setVariables("");
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !bodyText) {
      setActionMessage({ type: "error", text: "Please fill in all required template fields." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplateId,
          name,
          code,
          channel,
          subject: subject || null,
          body: bodyText,
          variables: variables || null,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save template");
      }
      setActionMessage({ type: "success", text: data.message });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case "EMAIL":
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case "WHATSAPP":
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case "SMS":
        return <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#6D1A2B]" />;
    }
  };

  return (
    <AppShell
      user={{
        name: "Admin",
        email: "admin@apex.edu",
        role: "ADMIN",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2A0F16]">Automated Communications Engine</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Configure multi-channel message templates, dispatch rules, and monitor real provider delivery logs.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleNewTemplate}
            className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
          <button
            onClick={loadData}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 active:scale-95 transition-transform shrink-0"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm text-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A0F16]/10 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("templates")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap flex items-center ${
            activeTab === "templates"
              ? "bg-[#6D1A2B] text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Message Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap flex items-center ${
            activeTab === "logs"
              ? "bg-[#6D1A2B] text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Delivery Audit Logs ({deliveryLogs.length})
        </button>
      </div>

      {/* Tab: Templates */}
      {activeTab === "templates" && (
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading templates...</div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="block md:hidden divide-y divide-stone-100">
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#2A0F16]">{tmpl.name}</h3>
                        <span className="font-mono text-[11px] text-[#6D1A2B] font-semibold block mt-0.5">
                          {tmpl.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tmpl.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                            DISABLED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFBF5] border border-stone-200">
                        {getChannelIcon(tmpl.channel)}
                        <span className="font-medium text-[11px]">{tmpl.channel}</span>
                      </div>
                      {tmpl.subject && (
                        <span className="text-stone-600 text-[11px] truncate flex-1">
                          Sub: {tmpl.subject}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 font-mono text-[10px] text-stone-600 line-clamp-3">
                      {tmpl.body}
                    </div>

                    <button
                      onClick={() => handleEditTemplate(tmpl)}
                      className="min-h-[44px] w-full rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-[#6D1A2B] hover:bg-stone-100 active:scale-[0.99] transition flex items-center justify-center"
                    >
                      Edit Template
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Template Name</th>
                      <th className="py-3 px-4">Event Code</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Message Preview</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {templates.map((tmpl) => (
                      <tr key={tmpl.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-[#2A0F16]">{tmpl.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                          {tmpl.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {getChannelIcon(tmpl.channel)}
                            <span className="font-medium text-[11px]">{tmpl.channel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-600 truncate max-w-[150px]">
                          {tmpl.subject || "—"}
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono text-[10px] truncate max-w-[200px]">
                          {tmpl.body}
                        </td>
                        <td className="py-3 px-4">
                          {tmpl.isActive ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px]">
                              DISABLED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditTemplate(tmpl)}
                            className="text-xs font-semibold text-[#6D1A2B] hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Delivery Logs */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading delivery logs...</div>
          ) : deliveryLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              No delivery attempts logged yet. As payments and classes occur, automated dispatches will populate this log.
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="block md:hidden divide-y divide-stone-100">
                {deliveryLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-[#2A0F16]">{log.recipientName}</p>
                        <p className="text-[10px] text-stone-400">{log.recipientRole}</p>
                      </div>
                      <PaymentStatusBadge status={log.status} />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(log.channel)}
                        <span className="font-medium text-[11px]">{log.channel}</span>
                      </div>
                      <span className="font-mono text-[11px] text-stone-600 font-semibold">
                        {log.eventType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                      <span className="font-mono truncate max-w-[140px]">
                        ID: {log.providerMessageId || "—"}
                      </span>
                      <span>
                        {new Date(log.attemptedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Provider Msg ID</th>
                      <th className="py-3 px-4">Attempted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#2A0F16]">{log.recipientName}</p>
                          <p className="text-[10px] text-stone-400">{log.recipientRole}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                          {log.eventType}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {getChannelIcon(log.channel)}
                            <span className="font-medium text-[11px]">{log.channel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <PaymentStatusBadge status={log.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-stone-500">
                          {log.providerMessageId || "—"}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {new Date(log.attemptedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: Template Editor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#6D1A2B]" />
                <span>{selectedTemplateId ? "Edit Template" : "New Communication Template"}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Payment Confirmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Event Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PAYMENT_CONFIRMED"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Channel *</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                >
                  <option value="EMAIL">Transactional Email</option>
                  <option value="IN_APP">In-App Notification</option>
                  <option value="WHATSAPP">WhatsApp Business Template</option>
                  <option value="SMS">SMS Gateway</option>
                </select>
              </div>

              {channel === "EMAIL" && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Academy: Your payment of {{amount}} is confirmed"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Message Body (Supports variables like {"{{student_name}}"}, {"{{amount}}"}, {"{{due_date}}"}) *
                </label>
                <textarea
                  rows={4}
                  placeholder="Hello {{student_name}}, your installment of {{amount}} is due on {{due_date}}..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs font-mono border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-xs transition flex items-center justify-center"
                >
                  {submitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
