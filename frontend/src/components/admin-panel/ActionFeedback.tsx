import { adminError } from "./api";
import {
  useAdminAction,
  useAdminAuthority,
  useAdminResource,
  usePendingOperations,
} from "./hooks";
import { Button, Notice } from "./ui";
import { useEffect, useState } from "react";
import type { Operation } from "./contracts";
import { useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "./hooks";
export function ActionFeedback({
  action,
}: {
  action: ReturnType<typeof useAdminAction>;
}) {
  return (
    <>
      {action.error != null && (
        <Notice error>
          {adminError(action.error)}
          {action.locked &&
            " The original request is preserved. Retry it or check its operation status."}
        </Notice>
      )}
      {action.receipt && (
        <Notice error={action.receipt.status === "failed"}>
          {action.receipt.message}
          {action.receipt.status === "pending" &&
            " Processing continues on the server."}
        </Notice>
      )}
    </>
  );
}
export function OperationRecovery() {
  const { registry, can, session } = useAdminAuthority();
  const pending = usePendingOperations();
  const client = useQueryClient();
  const [resolved, setResolved] = useState<Operation[]>([]);
  const query = useAdminResource(
    "operations",
    { ids: pending.map((item) => item.requestId).join(",") },
    pending.length > 0,
  );
  useEffect(() => {
    if (!can("operations.read") || !query.data || query.isError) return;
    const completed: Operation[] = [];
    for (const item of query.data.operations) {
      if (
        pending.some((operation) => operation.requestId === item.requestId) &&
        (item.status === "succeeded" || item.status === "failed")
      ) {
        registry.resolve(item.requestId);
        completed.push(item);
      }
    }
    if (completed.length) {
      setResolved((previous) =>
        [
          ...previous.filter(
            (item) =>
              !completed.some((value) => value.requestId === item.requestId),
          ),
          ...completed,
        ].slice(-3),
      );
      void client.invalidateQueries({ queryKey: adminKeys.scope(session) });
      void client.invalidateQueries({ queryKey: adminKeys.session });
    }
  }, [query.data, query.isError, registry, pending, can, client, session]);
  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <Notice>
          <p className="font-semibold">
            Financial request awaiting confirmation
          </p>
          <p className="mt-1">
            New financial requests are paused until the server confirms the
            existing outcome. A missing operation is not confirmation of
            failure.
          </p>
          {can("operations.read") && (
            <>
              <ul className="my-3 space-y-1">
                {pending.map((item) => (
                  <li key={item.requestId} className="break-all text-xs">
                    {item.requestId}:{" "}
                    {query.data?.operations.find(
                      (operation) => operation.requestId === item.requestId,
                    )?.status || "checking"}
                  </li>
                ))}
              </ul>
              {query.isError && <p role="alert">{adminError(query.error)}</p>}
              <Button
                secondary
                busy={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Check operation status
              </Button>
            </>
          )}
        </Notice>
      )}
      {can("operations.read") &&
        resolved.map((item) => (
          <Notice key={item.requestId} error={item.status === "failed"}>
            <p className="font-semibold">Financial operation {item.status}</p>
            <p>{item.message}</p>
            <p className="mt-1 break-all text-xs">{item.requestId}</p>
            <Button
              secondary
              className="mt-3"
              onClick={() =>
                setResolved((previous) =>
                  previous.filter(
                    (value) => value.requestId !== item.requestId,
                  ),
                )
              }
            >
              Dismiss operation result
            </Button>
          </Notice>
        ))}
    </div>
  );
}
