import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import { readCrmSession, writeCrmSession } from '../utils/authSession';
import {
  StudentPanel,
  createHttpStudentApi,
  createHostedPaymentGateway,
} from "../components/student-panel";

export default function StudentPanelPage() {
  const [search] = useSearchParams();
  const checkoutPackageId = requestedCheckoutPackage(search);
  const modeParam = search.get("mode");

  const customFetcher: typeof fetch = useMemo(() => {
    return (input: RequestInfo | URL, init: RequestInit = {}) => {
      const session = readCrmSession();
      const headers = new Headers(init.headers);
      if (session) {
        headers.set("x-crm-session", JSON.stringify(session));
      }
      let urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (modeParam && !urlStr.includes("mode=")) {
        const separator = urlStr.includes("?") ? "&" : "?";
        urlStr += `${separator}mode=${encodeURIComponent(modeParam)}`;
      }
      return fetch(urlStr, { ...init, headers, credentials: "include" });
    };
  }, [modeParam]);

  const api = useMemo(() => {
    return createHttpStudentApi({
      baseUrl: import.meta.env.VITE_STUDENT_API_URL || "/api/student",
      fetcher: customFetcher,
    });
  }, [customFetcher]);

  const gateway = useMemo(() => {
    return createHostedPaymentGateway(
      (import.meta.env.VITE_PAYMENT_GATEWAY_ORIGINS || "")
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean),
    );
  }, []);

  const signInUrl =
    import.meta.env.VITE_STUDENT_SIGN_IN_URL ||
    (checkoutPackageId
      ? `/login?returnTo=${encodeURIComponent(checkoutHref(checkoutPackageId))}`
      : "/login?returnTo=/student-panel");

  const demoStudentAction = (
    <button
      type="button"
      onClick={() => {
        writeCrmSession({
          userId: "usr-student-01",
          name: "Aryan Verma",
          email: "student@aintrixacademy.edu",
          role: "STUDENT",
          authenticated: true,
        });
        window.location.href = "/student-panel?mode=enrolled";
      }}
      className="mt-4 block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer shadow-xs"
    >
      Explore as Demo Student
    </button>
  );

  return (
    <StudentPanel
      key={checkoutPackageId ?? modeParam ?? 'workspace'}
      api={api}
      gateway={gateway}
      signInUrl={signInUrl}
      checkoutPackageId={checkoutPackageId}
      unavailableAction={demoStudentAction}
    />
  );
}
