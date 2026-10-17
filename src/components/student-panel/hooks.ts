import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StudentApiError } from "./api";
import type {
  StudentApi,
  StudentSession,
  CheckoutInput,
  SubmissionInput,
} from "./contracts";

export const studentKeys = {
  session: ["student", "session"] as const,
  scope: (session: StudentSession) =>
    ["student", session.cacheKey, session.mode] as const,
  resource: (session: StudentSession, resource: string) =>
    [...studentKeys.scope(session), resource] as const,
};
export const retryRead = (failures: number, error: Error) =>
  failures < 1 &&
  error instanceof StudentApiError &&
  error.code !== "contract" &&
  (error.status === 0 || error.status >= 500);
export function useStudentSession(api: StudentApi) {
  return useQuery({
    queryKey: studentKeys.session,
    queryFn: ({ signal }) => api.session(signal),
    staleTime: 0,
    retry: retryRead,
    refetchInterval: 30000,
  });
}
function useResource<T>(
  session: StudentSession,
  name: string,
  read: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  return useQuery({
    queryKey: studentKeys.resource(session, name),
    queryFn: ({ signal }) => read(signal),
    staleTime: 15000,
    retry: retryRead,
    enabled,
  });
}
export const useLearningPlan = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "learning-plan",
    (signal) => api.learningPlan(signal),
    session.mode === "prospect",
  );
export const useDashboard = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "dashboard",
    (signal) => api.dashboard(signal),
    session.mode === "enrolled",
  );
export const useAssignments = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "assignments",
    (signal) => api.assignments(signal),
    session.mode === "enrolled",
  );
export const useMentorship = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "mentorship",
    (signal) => api.mentorship(signal),
    session.mode === "enrolled",
  );
export const usePayments = (api: StudentApi, session: StudentSession) =>
  useQuery({
    queryKey: studentKeys.resource(session, "payments"),
    queryFn: ({ signal }) => api.payments(signal),
    staleTime: 15000,
    retry: retryRead,
    refetchInterval: (query) =>
      query.state.data?.instalments.some((item) => item.status === "processing")
        ? 4000
        : false,
  });
export const useClassProgress = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "class-progress",
    (signal) => api.classProgress(signal),
    session.mode === "enrolled",
  );
export const useSessions = (api: StudentApi, session: StudentSession) =>
  useResource(
    session,
    "sessions",
    (signal) => api.sessions(signal),
    session.mode === "prospect",
  );
export function useMentorshipSlots(
  api: StudentApi,
  session: StudentSession,
  timeZone: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...studentKeys.resource(session, "slots"), timeZone],
    queryFn: ({ signal }) => api.slots(timeZone, signal),
    enabled: session.mode === "enrolled" && enabled,
    staleTime: 0,
    retry: retryRead,
  });
}
export function usePaymentOrder(
  api: StudentApi,
  session: StudentSession,
  orderId: string | null,
) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...studentKeys.resource(session, "order"), orderId],
    queryFn: ({ signal }) => api.order(orderId!, signal),
    enabled: !!orderId,
    staleTime: 0,
    retry: retryRead,
    refetchInterval: (query) =>
      ["pending", "verified"].includes(query.state.data?.status || "")
        ? 4000
        : false,
  });
  const verified = query.data?.status === "verified";
  const terminal = query.data && query.data.status !== "pending";
  useEffect(() => {
    if (terminal) {
      void client.invalidateQueries({ queryKey: studentKeys.session });
      void client.invalidateQueries({
        queryKey: studentKeys.resource(session, "payments"),
      });
    }
  }, [client, terminal, verified, session]);
  return query;
}
// Keep a request key on an ambiguous retry. A changed payload starts a different operation.
export function useRequestKey() {
  const ref = useRef<{ signature: string; key: string } | null>(null);
  return {
    forPayload(signature: string) {
      if (!ref.current || ref.current.signature !== signature)
        ref.current = { signature, key: crypto.randomUUID() };
      return ref.current.key;
    },
    reset() {
      ref.current = null;
    },
  };
}
export function useStudentActions(api: StudentApi, session: StudentSession) {
  const client = useQueryClient();
  const isCurrentSession = () => {
    const current = client.getQueryData<StudentSession | null>(
      studentKeys.session,
    );
    return (
      current?.cacheKey === session.cacheKey && current?.mode === session.mode
    );
  };
  const context = (requestId: string) => ({
    csrfToken: session.csrfToken,
    requestId,
  });
  const invalidate = (resource: string) =>
    client.invalidateQueries({
      queryKey: studentKeys.resource(session, resource),
    });
  const checkout = useMutation({
    mutationFn: ({
      input,
      requestId,
    }: {
      input: CheckoutInput;
      requestId: string;
    }) => api.checkout(input, context(requestId)),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: studentKeys.session }),
    onError: (error) => {
      if (error instanceof StudentApiError && error.status === 409)
        return invalidate("learning-plan");
    },
  });
  const payInstalment = useMutation({
    mutationFn: ({ id, requestId }: { id: string; requestId: string }) =>
      api.payInstalment(id, context(requestId)),
  });
  const submit = useMutation({
    mutationFn: ({
      input,
      requestId,
    }: {
      input: SubmissionInput;
      requestId: string;
    }) => api.submit(input, context(requestId)),
    onSuccess: () => invalidate("assignments"),
    onError: (error) => {
      if (error instanceof StudentApiError && error.status === 409)
        return invalidate("assignments");
    },
  });
  const bookMentorship = useMutation({
    mutationFn: ({
      slotId,
      requestId,
    }: {
      slotId: string;
      requestId: string;
    }) => api.bookMentorship(slotId, context(requestId)),
    onSuccess: (data) => {
      if (!isCurrentSession()) return;
      client.setQueryData(studentKeys.resource(session, "mentorship"), data);
      return invalidate("slots");
    },
    onError: () => Promise.all([invalidate("slots"), invalidate("mentorship")]),
  });
  const onboarding = useMutation({
    mutationFn: ({ id, requestId }: { id: string; requestId: string }) =>
      api.completeOnboarding(id, context(requestId)),
    onSuccess: (data) => {
      if (isCurrentSession())
        client.setQueryData(studentKeys.resource(session, "dashboard"), data);
    },
  });
  const logout = useMutation({
    mutationFn: () => api.logout(context(crypto.randomUUID())),
    onSuccess: async () => {
      await client.cancelQueries();
      client.setQueryData(studentKeys.session, null);
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "student" && query.queryKey[1] !== "session",
      });
      client.getMutationCache().clear();
    },
  });
  return {
    checkout,
    payInstalment,
    submit,
    bookMentorship,
    onboarding,
    logout,
  };
}
