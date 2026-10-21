import { DurationVisual } from '../components/DurationVisual';
import { AnimatedText } from '../components/AnimatedText';
import { Clock3, ArrowRight, Check } from 'lucide-react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { detailedProgrammes, type DetailedProgramme } from '../data/programmeCatalog';
import { Accordion, BookingCTA, Button, FAQ, SectionHeading, Tags, TextLink } from '../components/ui';
import { CourseFeesComparison } from '../components/course-fees';
import type { FeeView } from '../components/course-fees';
import { checkoutHref } from '../utils/checkoutIntent';
import { track } from '../analytics/events';
import { ContextPromptCard } from '../components/platform/ui';

const validViews: FeeView[] = ['individual', 'packages', 'savings'];
const sectionIds = ['overview', 'curriculum', 'projects', 'pricing'];

/** Highlights the section currently under the sticky anchor bar. */
function useCurrentSection() {
  const [current, setCurrent] = useState(sectionIds[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setCurrent(visible.target.id);
    }, { rootMargin: '-35% 0px -55% 0px' });
    sectionIds.forEach(id => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  return current;
}

export default function ProgrammeDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSection = useCurrentSection();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const initialView: FeeView = validViews.includes(viewParam as FeeView) ? (viewParam as FeeView) : 'packages';

  // Identify programme based on current URL path
  const currentPath = location.pathname.replace(/\/$/, '');
  const prog: DetailedProgramme =
    detailedProgrammes.find(p => p.slug === currentPath || currentPath.endsWith(p.id)) ?? detailedProgrammes[0];

  const durationNumber = prog.isFlagship ? '07' : (prog.duration.match(/\d+/)?.[0] ?? '04').padStart(2, '0');
  const durationUnit = prog.duration.includes('month') ? 'months' : 'weeks';
  const durationSubtitle = prog.isFlagship
    ? 'Software engineering\n& placement preparation'
    : `${prog.name}\n& practical implementation`;
  const durationSegments = prog.isFlagship ? 7 : parseInt(durationNumber, 10) || 4;
  useEffect(() => { track('course_viewed', { programme: prog.id }); }, [prog.id]);

  return (
    <>
      <section className="container detail-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/programmes">Programmes</Link>
          <span>/</span>
          <span aria-current="page">{prog.name}</span>
        </nav>
        <div className="detail-hero-grid">
          <div>
            
            <h1 tabIndex={-1}>
              <AnimatedText>
                {prog.heroTitle}
                <br />
                <span>{prog.heroHighlight}</span>
              </AnimatedText>
            </h1>
            <p>{prog.heroSubtitle}</p>
            <Tags items={prog.technologies} />
            <div className="hero-actions">
              <Button to={`/book-session?programme=${encodeURIComponent(prog.id)}`}>
                Discuss the programme
              </Button>
              <TextLink to={`${prog.slug}#curriculum`}>Explore curriculum</TextLink>
            </div>
          </div>
          <DurationVisual
            number={durationNumber}
            unit={durationUnit}
            subtitle={durationSubtitle}
            segments={durationSegments}
          />
        </div>
      </section>

      <div className="container"><ContextPromptCard className="pf-prompt-slot"/></div>
      <nav className="programme-anchor-nav" aria-label="Programme sections">
        <div className="container">
          {[
            ['overview', 'Overview'],
            ['curriculum', 'Curriculum'],
            ['projects', 'Projects & support'],
            ['pricing', 'Packages & fees'],
          ].map(([id, label]) => (
            <a href={`#${id}`} key={id} data-current={currentSection === id} aria-current={currentSection === id ? 'location' : undefined}>
              {label}
              <ArrowRight size={14} />
            </a>
          ))}
        </div>
      </nav>

      <div className="container programme-detail-layout">
        <div className="programme-main">
          <section id="overview" className="detail-section">
            <SectionHeading
              title="A connected engineering foundation."
              description={prog.name}
            />
            <p>{prog.description}</p>
            <div className="two-columns">
              <div>
                <h3>Is this your next step?</h3>
                <p>{prog.whoIsThisFor}</p>
              </div>
              <div>
                <h3>Before you enrol.</h3>
                <p>
                  Duration is {prog.duration}. {prog.prerequisites} Delivery mode, class timings, and prerequisites will be confirmed during counselling.
                </p>
              </div>
            </div>
            <div className="outcomes">
              <h3>Your learning focus</h3>
              <ul>
                {prog.learningFocus.map((focus, i) => (
                  <li key={i}>{focus}</li>
                ))}
              </ul>
            </div>
          </section>

          <section id="curriculum" className="detail-section">
            <SectionHeading
              title="See how the pieces connect."
              description={`${prog.modules.length} learning modules, from programming foundations to advanced implementation.`}
            />
            <p className="small">
              Topics below follow the academy syllabus. The teaching sequence, assignments and schedule will be confirmed before enrolment.
            </p>
            <div className="curriculum-timeline">
            <Accordion
              items={prog.modules.map(module => ({
                question: module.name,
                answer: (
                  <>
                    <p>{module.description}</p>
                    <p className="small" style={{ marginTop: '10px', marginBottom: '6px' }}>
                      Learning areas included:
                    </p>
                    <Tags items={module.topics} />
                    <p className="small" style={{ marginTop: '8px' }}>
                      Detailed outcomes and assignments will be confirmed by the academy.
                    </p>
                  </>
                ),
              }))}
            />
            </div>
          </section>

          <section id="projects" className="detail-section">
            <SectionHeading
              title="Build. Review. Improve."
            />
            <p>
              Start with guided technical exercises, connect learning in end-to-end programme projects, and develop independent portfolio deliverables.
            </p>
            <div className="two-columns">
              <div>
                <h3>Technical mentorship</h3>
                <p>{prog.mentorship}</p>
              </div>
              <div>
                <h3>Career preparation</h3>
                <p>{prog.careerPrep}</p>
              </div>
            </div>
            <div className="notice">
              <h3>Portfolio deliverables & projects</h3>
              <ul>
                {prog.projects.map((proj, idx) => (
                  <li key={idx} style={{ marginTop: '6px' }}>
                    {proj}
                  </li>
                ))}
              </ul>
            </div>
            <TextLink to="/career-support">Read about career support</TextLink>
            <br />
            <TextLink to="/learning-experience">Explore the five-step learning method</TextLink>
          </section>
        </div>

        <aside className="programme-sidebar">
          <div className="summary-card">
            
            <h2>
              <AnimatedText>{prog.name}</AnimatedText>
            </h2>
            <p className="summary-duration">
              <Clock3 size={17} />
              {prog.duration}
            </p>
            <span className="small">{prog.feeLabel}</span>
            <strong className="summary-price">{prog.feeDisplay}</strong>
            <p className="small">Delivery format and class timings to be confirmed.</p>
            <Button to={`/book-session?programme=${encodeURIComponent(prog.id)}`}>
              Talk through your options
            </Button>
            <Link to="/contact" className="summary-enquiry">
              Prefer to send an enquiry?
            </Link>
            <span className="summary-bottom">Clarity before commitment.</span>
          </div>
        </aside>
      </div>

      <section id="pricing" className="section section-tinted">
        <div className="container">
          <SectionHeading
            title="Fees and inclusions."
            description={
              prog.isFlagship
                ? 'Compare the listed master packages. Confirm detailed inclusions and conditions with the academy before enrolling.'
                : `Review the listed track fee and inclusions for ${prog.name}. Confirm class format and schedules before enrolling.`
            }
          />

          {prog.isFlagship ? (
            <CourseFeesComparison
              initialView={initialView}
              onProceed={selection => navigate(checkoutHref(selection.packageId))}
              counsellingHref={packageId => `/book-session?package=${encodeURIComponent(packageId)}`}
            />
          ) : (
            <div style={{ maxWidth: '640px', margin: '40px auto 0' }}>
              <article className="pricing-card" data-tilt="5" style={{ borderColor: 'var(--accent)' }}>
                                <h3>{prog.name}</h3>
                <p className="tier-caption">{prog.description}</p>
                <p className="price">
                  {prog.feeDisplay}
                  <span>listed track tuition</span>
                </p>
                <ul>
                  <li>
                    <Check size={16} aria-hidden="true" /> Complete curriculum syllabus ({prog.duration})
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Guided practical exercises and code repository
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> 1-on-1 code reviews and mentor feedback
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> End-to-end portfolio projects
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Certificate of programme completion
                  </li>
                </ul>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                  <Button to={`/book-session?programme=${encodeURIComponent(prog.id)}`}>
                    Discuss {prog.name}
                  </Button>
                  <Button to="/programmes" secondary>
                    View all other programmes
                  </Button>
                </div>
              </article>
              <div className="pricing-note" style={{ marginTop: '20px' }}>
                <p>
                  * Listed fees reflect current programme tuition. Taxes, payment schedules, and exact class timing require confirmation before enrolment.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <FAQ />
      <BookingCTA />
    </>
  );
}
