"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { Users, Plus, Shield, UserCheck, UserX, Search, CheckCircle2 } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TRAINER" | "MANAGER" | "ADMIN" | "FINANCIER">("TRAINER");
  const [specialization, setSpecialization] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (res.ok) {
        setFeedbackMsg(`Account ${user.email} status updated.`);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update user");
      }
    } catch {}
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role,
          specialization: role === "TRAINER" ? specialization : undefined,
          employeeCode: role === "TRAINER" ? employeeCode : undefined,
        }),
      });

      const data = await res.json();
      setCreating(false);

      if (res.ok) {
        setFeedbackMsg(`User account created successfully!`);
        setShowCreateModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        fetchUsers();
      } else {
        alert(data.error || "Failed to create user");
      }
    } catch {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.registrationNumber && u.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Identity Governance
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            User Accounts & Roles
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manage credentials, role assignments, and instant account deactivation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Create New User</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {["ALL", "STUDENT", "TRAINER", "MANAGER", "ADMIN", "FINANCIER"].map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-3.5 py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              filterRole === r
                ? "bg-[#6D1A2B] text-white shadow-sm"
                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Users Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-stone-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, email, or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-base sm:text-xs min-h-[40px] sm:min-h-0 focus:outline-none bg-transparent"
          />
        </div>

        {/* Mobile Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {filteredUsers.map((u) => (
            <div key={u.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-[#2A0F16]">{u.name}</h4>
                  <p className="text-xs text-stone-600 mt-0.5">{u.email}</p>
                </div>
                <StatusBadge status={u.isActive ? "ACTIVE" : "DISABLED"} size="sm" />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] text-[11px]">
                  {u.role}
                </span>
                {(u.registrationNumber || u.employeeCode || u.department) && (
                  <span className="font-mono text-stone-600 text-xs">
                    {u.registrationNumber || u.employeeCode || u.department}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={() => toggleUserStatus(u)}
                  className={`w-full py-2.5 min-h-[44px] rounded-xl font-semibold text-xs border transition-colors flex items-center justify-center active:scale-[0.98] ${
                    u.isActive
                      ? "border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/50"
                      : "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                  }`}
                >
                  {u.isActive ? "Deactivate Account" : "Reactivate Account"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Identity Reference</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#2A0F16]">{u.name}</td>
                  <td className="py-3.5 px-4 text-stone-600">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] text-[11px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">
                    {u.registrationNumber || u.employeeCode || u.department || "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={u.isActive ? "ACTIVE" : "DISABLED"} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(u)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                        u.isActive
                          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateUser}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-elevated text-xs my-auto"
          >
            <h3 className="text-base font-bold text-[#2A0F16]">Provision New Academy Account</h3>

            <div>
              <label className="block font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marcus Vance"
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@apexacademy.edu"
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Initial Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Assigned Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg font-semibold bg-white focus:outline-none focus:border-[#6D1A2B]"
              >
                <option value="TRAINER">Trainer / Faculty</option>
                <option value="MANAGER">Operations Manager</option>
                <option value="FINANCIER">Financier</option>
                <option value="ADMIN">Executive Admin</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            {role === "TRAINER" && (
              <>
                <div>
                  <label className="block font-semibold mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="TR-003"
                    className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Instructional Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Distributed Systems, Cloud Architecture..."
                    className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] border border-stone-200 rounded-xl font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={creating}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white font-bold"
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
