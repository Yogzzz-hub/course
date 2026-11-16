import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApiError } from "./api";
import {
  adminCommandSchema,
  type AdminApi,
  type AdminCommand,
  type AdminSession,
  type Permission,
  type Resource,
  type VerifiedAdmin,
} from "./contracts";
import {
  commandPermissions,
  hasPermission,
  isFinancial,
  resourcePermissions,
} from "./permissions";
import { commandFingerprint, OperationRegistry } from "./operations";

export const adminKeys = {
  session: ["admin", "session"] as const,
  scope: (session: VerifiedAdmin) => ["admin", session.cacheKey] as const,
};
const retryRead = (failures: number, error: Error) =>
  failures < 1 && error instanceof AdminApiError && error.code === "network";
export function useAdminSession(api: AdminApi) {
  return useQuery({
    queryKey: adminKeys.session,
    queryFn: ({ signal }) => api.session(signal),
    retry: retryRead,
    staleTime: 0,
    refetchInterval: 15000,
  });
}
const AuthorityContext = createContext<{
  api: AdminApi;
  session: VerifiedAdmin;
  now: number;
  registry: OperationRegistry;
} | null>(null);
export function AdminAuthority({
  api,
  session,
  now,
  children,
}: {
  api: AdminApi;
  session: VerifiedAdmin;
  now: number;
  children: ReactNode;
}) {
  const [registry] = useState(() => {
    const value = new OperationRegistry(session.cacheKey);
    value.merge(session.pendingFinancialOperations);
    return value;
  });
  useEffect(
    () => registry.merge(session.pendingFinancialOperations),
    [registry, session.pendingFinancialOperations],
  );
  return (
    <AuthorityContext.Provider value={{ api, session, now, registry }}>
      {children}
    </AuthorityContext.Provider>
  );
}
export function useAdminAuthority() {
  const value = useContext(AuthorityContext);
  if (!value) throw new Error("AdminAuthority is required.");
  return {
    ...value,
    can: (permission: Permission) =>
      hasPermission(value.session, permission, Math.max(value.now, Date.now())),
  };
}
export function PermissionGate({
  permissions,
  children,
}: {
  permissions: readonly Permission[];
  children: ReactNode;
}) {
  const { can } = useAdminAuthority();
  return permissions.every(can) ? (
    <>{children}</>
  ) : (
    <div
      role="status"
      className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
    >
      You do not have access to this section.
    </div>
  );
}
export function useAdminResource<K extends Resource>(
  resource: K,
  params: Readonly<Record<string, string>> = {},
  enabled = true,
) {
  const { api, session, can } = useAdminAuthority();
  const client = useQueryClient();
  return useQuery({
    queryKey: [...adminKeys.scope(session), resource, params],
    enabled: enabled && resourcePermissions[resource].every(can),
    staleTime: 10000,
    retry: retryRead,
    queryFn: ({ signal }) => {
      const latest = client.getQueryData<AdminSession>(adminKeys.session);
      if (
        client.getQueryState(adminKeys.session)?.status !== "success" ||
        latest?.state !== "authenticated" ||
        latest.cacheKey !== session.cacheKey ||
        !resourcePermissions[resource].every((permission) =>
          hasPermission(latest, permission),
        )
      )
        throw new AdminApiError(403);
      return api.read(resource, params, signal);
    },
    refetchInterval: ["operations", "export", "programmes", "finance"].includes(
      resource,
    )
      ? 5000
      : false,
  });
}
export function usePendingOperations() {
  const { registry } = useAdminAuthority();
  return useSyncExternalStore(
    registry.subscribe,
    registry.snapshot,
    registry.snapshot,
  );
}
export function useAdminAction() {
  const { api, session, registry } = useAdminAuthority();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Awaited<
    ReturnType<AdminApi["command"]>
  > | null>(null);
  const [lockedCommand, setLockedCommand] = useState<AdminCommand | null>(null);
  const inFlight = useRef(false);
  const retry = useRef<{ signature: string; requestId: string } | null>(null);
  const pending = usePendingOperations();
  const mutation = useMutation({
    mutationFn: ({
      command,
      requestId,
    }: {
      command: AdminCommand;
      requestId: string;
    }) => {
      const latest = client.getQueryData<AdminSession>(adminKeys.session);
      if (
        client.getQueryState(adminKeys.session)?.status !== "success" ||
        latest?.state !== "authenticated" ||
        latest.cacheKey !== session.cacheKey ||
        !commandPermissions(command).every((permission) =>
          hasPermission(latest, permission),
        )
      )
        throw new AdminApiError(403);
      return api.command(command, {
        csrfToken: latest.csrfToken,
        sessionKey: latest.cacheKey,
        requestId,
      });
    },
    retry: false,
    networkMode: "always",
  });
  const locked =
    !!lockedCommand &&
    (isFinancial(lockedCommand)
      ? pending.some((item) => item.requestId === retry.current?.requestId)
      : receipt?.status === "pending" || !!error);
  async function run(input: AdminCommand) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setReceipt(null);
    let requestId: string | undefined;
    try {
      const command = adminCommandSchema.parse(
        locked && lockedCommand ? lockedCommand : input,
      );
      const signature = await commandFingerprint(command);
      const financial = isFinancial(command);
      requestId = financial
        ? registry.claim(signature)
        : retry.current?.signature === signature
          ? retry.current.requestId
          : crypto.randomUUID();
      retry.current = { signature, requestId };
      setLockedCommand(command);
      const result = await mutation.mutateAsync({ command, requestId });
      setReceipt(result);
      if (result.status === "succeeded" || result.status === "failed") {
        if (financial) registry.resolve(requestId);
        retry.current = null;
        setLockedCommand(null);
      }
      await client.invalidateQueries({ queryKey: adminKeys.scope(session) });
      await client.invalidateQueries({ queryKey: adminKeys.session });
      return result;
    } catch (failure) {
      setError(failure);
      if (
        failure instanceof AdminApiError &&
        failure.code !== "locked" &&
        failure.status >= 400 &&
        failure.status < 500
      ) {
        if (requestId) registry.resolve(requestId);
        retry.current = null;
        setLockedCommand(null);
        void client.invalidateQueries({ queryKey: adminKeys.scope(session) });
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    error,
    receipt,
    locked,
    reset: () => {
      if (!locked && !busy) {
        setError(null);
        setReceipt(null);
      }
    },
  };
}
