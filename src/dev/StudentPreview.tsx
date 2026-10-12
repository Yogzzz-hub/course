import { useMemo, useState } from 'react';
import { StudentPanel } from '../components/student-panel';
import { StudentApiError } from '../components/student-panel/api';
import type { PaymentGateway, StudentSession } from '../components/student-panel/contracts';
import { createStudentPreviewApi } from './student-preview-api';
import './student-preview.css';

const gateway: PaymentGateway = { open: async () => { throw new StudentApiError(400, 'preview'); } };
export default function StudentPreview({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<StudentSession['mode']>('enrolled');
  const api = useMemo(() => createStudentPreviewApi(mode), [mode]);
  return <div className="student-demo">
    <div className="student-demo-banner" role="region" aria-label="Local demo controls">
      <div><strong>Local demo · Sample data</strong><p>Read-only preview. No real enrolment, payments, bookings or submissions.</p></div>
      <div className="student-demo-buttons">
        <button type="button" aria-pressed={mode === 'prospect'} onClick={() => setMode('prospect')}>Prospect demo</button>
        <button type="button" aria-pressed={mode === 'enrolled'} onClick={() => setMode('enrolled')}>Enrolled demo</button>
        <button type="button" onClick={onExit}>Exit demo</button>
      </div>
    </div>
    <StudentPanel key={mode} api={api} gateway={gateway}/>
  </div>;
}
