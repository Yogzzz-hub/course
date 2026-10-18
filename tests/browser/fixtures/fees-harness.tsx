import { createRoot } from 'react-dom/client';
import { CourseFeesComparison, type PackageSelection } from '../../../src/components/course-fees';
import '../../../src/styles/global.css';

/** Browser-only fixture for asynchronous host callback failures and double clicks. */
export function mount(target: HTMLElement) {
  let calls = 0;
  createRoot(target).render(<main className="p-5"><h1>Course fee integration test</h1><CourseFeesComparison onProceed={async (selection: PackageSelection) => {
    target.dataset.calls = String(++calls);
    target.dataset.selection = JSON.stringify(selection);
    await new Promise<void>(resolve => target.addEventListener('finish-attempt',()=>resolve(),{once:true}));
    if (calls === 1) throw new Error('Synthetic host failure');
  }}/></main>);
}
