import { AnimatedText } from '../components/AnimatedText';
import { Hammer, Lightbulb, RefreshCcw, Target, Telescope } from 'lucide-react';
import { PageHero, BookingCTA, TextLink } from '../components/ui';
import { ScrollRing } from '../components/fx';
import { journey } from '../data/programmes';

const stageIcons = [Lightbulb, Target, Hammer, RefreshCcw, Telescope];

export default function LearningExperience() {
  return <>
    <PageHero labels={['Understand', 'Build']} title={<>Understanding is the start.<br/><span className="muted">Building is the difference.</span></>} description="A structured, practical approach that connects concepts to implementation, with space to question, practise and improve."/>
    <ScrollRing
      className="journey-ring"
      items={journey}
      header={<div className="container ring-head"><h2 className="display-title">Five stages, one loop.</h2></div>}
      renderFace={(stage, index) => {
        const Icon = stageIcons[index];
        return <article className="ring-card">
          
          <span className="ring-card-icon"><Icon size={26} aria-hidden="true"/></span>
          <h3>{stage.title}</h3>
          <p>{stage.text}</p>
          
        </article>;
      }}
    />
    <section className="light-section section"><div className="container spotlight"><div><h2><AnimatedText>Make the concept<br/>your own.</AnimatedText></h2><p>Understanding becomes useful when you can apply it, explain your choices and improve the result.</p><TextLink to="/programmes">Explore all programmes</TextLink></div><div className="foundation-list">{[{title:'Build the foundations.',text:'Structured fundamentals give new concepts context. Guided exercises help connect an idea to its implementation.'},{title:'Work through a problem.',text:'Programme projects bring learning areas together. Explore how your interface, logic and data connect.'},{title:'Return with a better question.',text:'Technical feedback and iteration help you identify what worked, what needs attention and what to try next.'}].map(item=><div key={item.title} data-tilt="6" className="spot"><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></div></section>
    <section className="container section"><div className="editorial-grid" style={{ marginTop: '24px' }}><div data-tilt="6"><h2><AnimatedText>Progress with purpose.</AnimatedText></h2></div><div data-tilt="6"><h3>Guidance along the way.</h3><p>Mentorship connects learning-path questions with technical feedback and project reviews. Specific arrangements depend on your confirmed package.</p><TextLink to="/career-support">Explore mentorship</TextLink></div><div data-tilt="6"><h3>Prepare for what follows.</h3><p>Portfolio development and technical interview preparation help you communicate your thinking. Class format, resources and schedules will be confirmed by the academy.</p><TextLink to="/book-session">Discuss the learning format</TextLink></div></div></section>
    <BookingCTA/>
  </>;
}
