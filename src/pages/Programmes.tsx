import { useState, useMemo } from 'react';
import { Clock3, ArrowUpRight, Search, Check, BookOpen, ArrowDown, Layers3, Sparkles } from 'lucide-react';
import { AnimatedText } from '../components/AnimatedText';
import { BookingCTA, TextLink, SectionHeading, Button, Eyebrow } from '../components/ui';
import { ProgrammeFeature } from '../components/Programme';
import { detailedProgrammes } from '../data/programmeCatalog';

type FilterCategory = 'all' | 'flagship-track' | 'module';

export default function Programmes() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProgrammes = useMemo(() => {
    return detailedProgrammes.filter(item => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'flagship-track' && (item.category === 'flagship' || item.category === 'track')) ||
        (activeFilter === 'module' && item.category === 'module');

      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.technologies.some(tech => tech.toLowerCase().includes(query)) ||
        item.learningFocus.some(topic => topic.toLowerCase().includes(query))
      );
    });
  }, [activeFilter, searchQuery]);

  return (
    <>
      <section className="container page-hero programmes-hero">
        <div className="programmes-hero-grid">
          <div className="programmes-hero-copy">
            <Eyebrow>YOUR LEARNING PATH</Eyebrow>
            <h1 tabIndex={-1}>
              <AnimatedText>
                One focused programme.<br />
                <span className="muted">All pathways &amp; specialisations.</span>
              </AnimatedText>
            </h1>
            <p className="programmes-hero-desc">
              A seven-month path that brings programming, full-stack development and career preparation together. Explore the flagship curriculum or individual technical tracks.
            </p>
            <div className="programmes-hero-actions">
              <a
                href="#catalogue"
                className="button button-primary"
                onClick={e => {
                  e.preventDefault();
                  document.getElementById('catalogue')?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                  });
                }}
              >
                Explore 12 programmes <ArrowDown size={15} aria-hidden="true" />
              </a>
              <Button to="/book-session" secondary>
                Book counselling
              </Button>
            </div>
          </div>

          <aside className="programmes-hero-card" aria-label="Curriculum Architecture Summary">
            <div className="programmes-hero-card-header">
              <div className="hero-card-title-group">
                <span className="hero-status-pulse" aria-hidden="true" />
                <span className="eyebrow" style={{ margin: 0 }}>CURRICULUM ARCHITECTURE</span>
              </div>
              <span className="hero-pill-badge">12 ACTIVE PROGRAMMES</span>
            </div>

            <div className="programmes-hero-stats">
              <div className="hero-stat-box">
                <strong>01</strong>
                <span>Flagship</span>
                <p>Full-Stack Engineering</p>
              </div>
              <div className="hero-stat-box">
                <strong>03</strong>
                <span>Specialist</span>
                <p>Career Tracks</p>
              </div>
              <div className="hero-stat-box">
                <strong>08</strong>
                <span>Modular</span>
                <p>Skill Accelerators</p>
              </div>
            </div>

            <div className="programmes-hero-pathways">
              <button
                type="button"
                className="pathway-row"
                onClick={() => {
                  setActiveFilter('flagship-track');
                  document.getElementById('catalogue')?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                  });
                }}
              >
                <span className="pathway-step">01</span>
                <div className="pathway-content">
                  <h4>Full-Stack Software Engineering</h4>
                  <p>7 months · Python, Django, React, Databases &amp; Deployment</p>
                </div>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="pathway-row"
                onClick={() => {
                  setActiveFilter('flagship-track');
                  document.getElementById('catalogue')?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                  });
                }}
              >
                <span className="pathway-step">02</span>
                <div className="pathway-content">
                  <h4>Specialised Engineering Tracks</h4>
                  <p>Frontend Engineering, Backend APIs &amp; DevOps Tracks</p>
                </div>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="pathway-row"
                onClick={() => {
                  setActiveFilter('module');
                  document.getElementById('catalogue')?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                  });
                }}
              >
                <span className="pathway-step">03</span>
                <div className="pathway-content">
                  <h4>Individual Skill Modules</h4>
                  <p>SQL, Python, React, Testing, DSA &amp; Interview Prep</p>
                </div>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="programmes-hero-card-footer">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" aria-hidden="true" />
                Hands-on code reviews &amp; portfolio projects
              </span>
              <span className="text-xs font-semibold text-slate-700">7 Months</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="container section section-first">
        <div className="programmes-catalogue" id="catalogue" style={{ marginTop: '0' }}>
          <div className="catalogue-header">
            <SectionHeading
              label="01 / PROGRAMME CATALOGUE"
              title="All programmes & engineering tracks."
              description="Explore all learning tracks, full programmes, and individual technical modules presented card-by-card with clear fees and inclusions."
            />
          </div>

          <div className="catalogue-controls">
            <div className="catalogue-filter-tabs" role="tablist" aria-label="Programme categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeFilter === 'all'}
                className={`catalogue-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Programmes ({detailedProgrammes.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFilter === 'flagship-track'}
                className={`catalogue-tab-btn ${activeFilter === 'flagship-track' ? 'active' : ''}`}
                onClick={() => setActiveFilter('flagship-track')}
              >
                Full Programmes & Tracks (7)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFilter === 'module'}
                className={`catalogue-tab-btn ${activeFilter === 'module' ? 'active' : ''}`}
                onClick={() => setActiveFilter('module')}
              >
                Modular Courses (5)
              </button>
            </div>

            <div className="catalogue-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search by topic, tech, or skill…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search programmes and tracks"
              />
            </div>
          </div>

          {filteredProgrammes.length === 0 ? (
            <div role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen className="mx-auto mb-4 text-slate-400" size={32} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">No matching programmes found</h3>
              <p className="mt-2 text-sm text-slate-600">Try adjusting your search terms or selecting another category.</p>
              <button
                type="button"
                className="button button-secondary mt-5"
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset search filters
              </button>
            </div>
          ) : (
            <div className="programmes-grid" role="region" aria-label="Programme catalogue cards">
              {filteredProgrammes.map(card => (
                <article
                  key={card.id}
                  className={`programme-card-item ${card.isFlagship ? 'featured' : ''}`}
                >
                  <div className="card-badge-row">
                    <span className={`card-badge ${card.isFlagship ? 'flagship' : ''}`}>
                      {card.badge}
                    </span>
                    <span className="card-duration">
                      <Clock3 size={14} aria-hidden="true" /> {card.duration}
                    </span>
                  </div>

                  <h3>{card.name}</h3>
                  <p className="card-summary">{card.description}</p>

                  <div className="card-tech-tags" aria-label="Technologies covered">
                    {card.technologies.map(tech => (
                      <span key={tech} className="card-tech-tag">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <ul className="card-topics-list" aria-label="Key learning areas">
                    {card.learningFocus.slice(0, 3).map((topic, i) => (
                      <li key={i} className="card-topic-item">
                        <Check size={14} aria-hidden="true" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="card-pricing-row">
                    <span className="card-fee-label">{card.feeLabel}</span>
                    <span className="card-fee-value">{card.feeDisplay}</span>
                  </div>

                  <div className="card-actions">
                    <Button to={card.slug}>
                      {card.isFlagship ? 'Explore flagship' : (card.category === 'module' ? 'Explore module' : 'Explore track')}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Button>
                    <Button to={`/book-session?programme=${encodeURIComponent(card.id)}`} secondary>
                      Discuss
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Learning Architecture Section */}
        <div id="flagship-architecture" style={{ marginTop: '70px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
          <SectionHeading
            label="02 / ARCHITECTURE & SKILL SET"
            title="Connected software engineering architecture."
            description="Explore the connected multi-tier stack architecture taught across our flagship and specialised engineering tracks."
          />
          <ProgrammeFeature />
        </div>

        <div className="editorial-grid" style={{ marginTop: '70px' }}>
          <div>
            <h2>
              <AnimatedText>Start with your goals.</AnimatedText>
            </h2>
            <p>
              Explore the curriculum and consider what you want to build. Counselling can help you discuss your background and the right starting point.
            </p>
          </div>
          <div>
            <h3>Learning that connects.</h3>
            <p>
              Programming foundations lead into interfaces, backend development, data, testing and deployment. Guided exercises and programme projects connect these areas in practice.
            </p>
            <TextLink to="/programmes/python-full-stack#curriculum">Explore the learning areas</TextLink>
          </div>
          <div>
            <h3>Make an informed choice.</h3>
            <p>
              Review the listed fees and package inclusions. Prerequisites, teaching format and class timings must be confirmed before enrolment.
            </p>
            <TextLink to="/programmes/python-full-stack#pricing">Compare fees and inclusions</TextLink>
          </div>
        </div>
      </section>

      <BookingCTA />
    </>
  );
}
