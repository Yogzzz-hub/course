import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, ListChecks, Map } from 'lucide-react';
import { useExperiment } from '../../analytics/experiments';
import { CodeBlock, ContextPromptCard } from '../platform/ui';

/** The homepage's primary call to action: the free Developer Reality Check. */
export function ReadinessBand() {
  const heading = useExperiment('home-cta-2026-10');
  return <section className="container readiness-band" aria-labelledby="readiness-title">
    <ContextPromptCard className="pf-prompt-slot"/>
    <div className="readiness-grid">
      <div className="readiness-copy">
        <h2 id="readiness-title" className="display-title">{heading.label}</h2>
        <p>Discover your skills, identify your gaps, and build your personalized career roadmap.</p>
        <ol className="readiness-steps">
          <li><ListChecks size={18} aria-hidden="true"/><span><strong>Answer ten questions</strong> on Python, logic, SQL, JavaScript, APIs and debugging.</span></li>
          <li><Clock3 size={18} aria-hidden="true"/><span><strong>See every answer explained</strong>, with a score built only from your responses.</span></li>
          <li><Map size={18} aria-hidden="true"/><span><strong>Get a roadmap</strong> and the programme modules that match your gaps.</span></li>
        </ol>
        <div className="pf-actions"><Link to="/skill-test" className="button button-primary" data-magnetic>Take the Free Skill Test<ArrowUpRight size={17} aria-hidden="true"/></Link><Link to="/coding-arena" className="text-link">Or try a coding challenge</Link></div>
      </div>
      <div className="readiness-sample" aria-label="Sample question">
        <span className="pf-chip">Sample question · Intermediate</span>
        <p className="readiness-sample-q">What does this program print?</p>
        <CodeBlock language="python" source={'def add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd(1)\nprint(add(2))'}/>
        <p className="pf-small pf-muted">Answer and explanation in the test. Free, no account, about eight minutes.</p>
      </div>
    </div>
  </section>;
}
