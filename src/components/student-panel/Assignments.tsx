import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import type { Assignment, StudentApi, StudentSession } from "./contracts";
import { friendlyError, StudentApiError } from "./api";
import { useAssignments, useRequestKey, useStudentActions } from "./hooks";
import {
  Button,
  Card,
  Empty,
  Field,
  fieldProps,
  inputClass,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { dateTime, submissionError } from "./utils";

function AssignmentDetail({
  assignment,
  api,
  session,
}: {
  assignment: Assignment;
  api: StudentApi;
  session: StudentSession;
}) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [success, setSuccess] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { submit } = useStudentActions(api, session);
  const requestKey = useRequestKey();
  const canSubmit =
    assignment.canSubmit && assignment.attempts.length < assignment.maxAttempts;
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    const validation = submissionError(repositoryUrl, liveUrl, file);
    setError(validation);
    if (validation) {
      formRef.current?.querySelector("input")?.focus();
      return;
    }
    setFrozen(true);
    const input = {
      assignmentId: assignment.id,
      repositoryUrl: repositoryUrl.trim(),
      liveUrl: liveUrl.trim(),
      file,
    };
    const signature = JSON.stringify([
      input.assignmentId,
      input.repositoryUrl,
      input.liveUrl,
      file?.name,
      file?.size,
      file?.lastModified,
    ]);
    try {
      await submit.mutateAsync({
        input,
        requestId: requestKey.forPayload(signature),
      });
      requestKey.reset();
      setRepositoryUrl("");
      setLiveUrl("");
      setFile(null);
      if (uploadRef.current) uploadRef.current.value = "";
      setFrozen(false);
      setSuccess(true);
    } catch (failure) {
      if (
        failure instanceof StudentApiError &&
        failure.status >= 400 &&
        failure.status < 500
      ) {
        setFrozen(false);
        requestKey.reset();
      }
    }
  }
  return (
    <div className="space-y-5">
      <Card>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          {assignment.kind}
        </span>
        <h2 className="mt-2 text-xl font-semibold">{assignment.title}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
          {assignment.description}
        </p>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Due {dateTime(assignment.dueAt)} · {assignment.attempts.length}/
          {assignment.maxAttempts} attempts used
        </p>
        <h3 className="mb-3 mt-6 font-semibold">How you’ll be assessed</h3>
        <dl className="space-y-2">
          {assignment.rubric.map((item) => (
            <div className="flex justify-between gap-3 text-sm" key={item.id}>
              <dt className="text-slate-600">{item.label}</dt>
              <dd className="shrink-0 font-semibold">
                {item.maxPoints} points
              </dd>
            </div>
          ))}
        </dl>
        {!assignment.rubric.length && (
          <p className="text-sm text-slate-600">
            The rubric has not been published yet.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Submit your work</h2>
        {success && (
          <Notice>
            Your submission was received. Your attempt history has been updated.
          </Notice>
        )}
        {!canSubmit && !frozen ? (
          <Notice>
            Submissions are closed or all attempts have been used. Contact your
            mentor for the next step.
          </Notice>
        ) : (
          <form
            ref={formRef}
            method="post"
            noValidate
            onSubmit={(event) => void send(event)}
            className="space-y-4"
          >
            <fieldset
              disabled={submit.isPending || frozen}
              className="space-y-4"
            >
              <legend className="sr-only">Submission details</legend>
              <Field name="repository" label="Repository URL">
                <input
                  {...fieldProps("repository")}
                  className={inputClass}
                  type="url"
                  value={repositoryUrl}
                  maxLength={2000}
                  placeholder="https://github.com/you/project"
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                />
              </Field>
              <Field name="live-url" label="Live demo URL">
                <input
                  {...fieldProps("live-url")}
                  className={inputClass}
                  type="url"
                  value={liveUrl}
                  maxLength={2000}
                  placeholder="https://your-project.example"
                  onChange={(event) => setLiveUrl(event.target.value)}
                />
              </Field>
              <Field name="attachment" label="File attachment">
                <input
                  {...fieldProps("attachment")}
                  ref={uploadRef}
                  type="file"
                  className={`${inputClass} text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-800`}
                  accept=".pdf,.zip,.png,.jpg,.jpeg"
                  aria-describedby="attachment-help"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </Field>
              <p id="attachment-help" className="text-xs text-slate-500">
                PDF, ZIP, PNG or JPEG · Up to 10 MB. Add at least one URL or a
                file.
              </p>
            </fieldset>
            {error && <Notice error>{error}</Notice>}
            {submit.isError && (
              <Notice error>
                {friendlyError(submit.error)}
                {frozen &&
                  " Your submission result is uncertain. Retry the same work to recover the attempt."}
              </Notice>
            )}
            <Button type="submit" busy={submit.isPending}>
              {frozen && submit.isError
                ? "Retry submission safely"
                : "Submit for review"}
              <FileUp size={16} aria-hidden="true" />
            </Button>
          </form>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Attempt history</h2>
        {!assignment.attempts.length && (
          <p className="text-sm text-slate-600">
            Your first submission will appear here, followed by your mentor’s
            feedback.
          </p>
        )}
        <ol className="space-y-5">
          {[...assignment.attempts]
            .sort((a, b) => b.number - a.number)
            .map((attempt) => (
              <li
                key={attempt.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    Attempt {attempt.number}
                  </h3>
                  <span className="text-xs font-semibold capitalize text-indigo-700">
                    {attempt.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {dateTime(attempt.submittedAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {attempt.repositoryUrl && (
                    <SecureLink href={attempt.repositoryUrl}>
                      Repository
                    </SecureLink>
                  )}
                  {attempt.liveUrl && (
                    <SecureLink href={attempt.liveUrl}>Live demo</SecureLink>
                  )}
                </div>
                {attempt.attachmentName && (
                  <p className="mt-2 text-xs text-slate-600">
                    Attachment: {attempt.attachmentName}
                  </p>
                )}
                {attempt.scores.length > 0 && (
                  <dl className="mt-3 space-y-2">
                    {attempt.scores.map((score) => {
                      const rubric = assignment.rubric.find(
                        (item) => item.id === score.rubricId,
                      )!;
                      return (
                        <div
                          className="flex justify-between gap-3 text-sm"
                          key={score.rubricId}
                        >
                          <dt>{rubric.label}</dt>
                          <dd>
                            {score.points}/{rubric.maxPoints}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {attempt.feedback && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {attempt.feedback}
                  </p>
                )}
              </li>
            ))}
        </ol>
      </Card>
    </div>
  );
}
function AssignmentList({
  assignments,
  api,
  session,
}: {
  assignments: Assignment[];
  api: StudentApi;
  session: StudentSession;
}) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id);
  const selected =
    assignments.find((item) => item.id === selectedId) || assignments[0];
  if (!selected)
    return (
      <Empty title="No assignments released yet">
        Your assignments and projects will appear here as you progress through
        your modules.
      </Empty>
    );
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[240px_1fr]">
      <nav aria-label="Assignments and projects" className="space-y-2">
        {assignments.map((item) => (
          <button
            className={`w-full rounded-xl border p-4 text-left ${item.id === selected.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            key={item.id}
            aria-current={item.id === selected.id ? "true" : undefined}
            onClick={() => setSelectedId(item.id)}
          >
            <span className="block text-sm font-semibold">{item.title}</span>
            <span className="mt-1 block text-xs capitalize text-slate-600">
              {item.kind} · {item.attempts.length} submitted
            </span>
          </button>
        ))}
      </nav>
      <AssignmentDetail
        key={selected.id}
        assignment={selected}
        api={api}
        session={session}
      />
    </div>
  );
}
export function AssignmentsView({
  api,
  session,
}: {
  api: StudentApi;
  session: StudentSession;
}) {
  const query = useAssignments(api, session);
  return (
    <QueryView query={query}>
      {(assignments) => (
        <AssignmentList assignments={assignments} api={api} session={session} />
      )}
    </QueryView>
  );
}
