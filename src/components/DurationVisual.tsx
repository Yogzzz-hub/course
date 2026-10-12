import { Code2 } from 'lucide-react';
import { useMotionVisibility } from './MotionSystem';

export function DurationVisual() {
  const ref = useMotionVisibility<HTMLDivElement>();
  return <div className="duration-art" ref={ref}>
    <svg className="duration-dial" viewBox="0 0 300 300" fill="none" aria-hidden="true">
      <circle className="dial-track" cx="150" cy="150" r="120"/>
      <circle className="dial-orbit" cx="150" cy="150" r="141"/>
      {Array.from({ length: 7 }, (_, index) => <g key={index} transform={`rotate(${index * 360 / 7 - 90} 150 150)`}>
        <circle className="dial-segment" cx="150" cy="150" r="120" pathLength="7" style={{ animationDelay: `${index * 110}ms` }}/>
        <path className="dial-tick" d="M256 150h9"/>
      </g>)}
      <path className="dial-cross" d="M138 150h24m-12-12v24"/>
    </svg>
    <span>THE LEARNING JOURNEY</span><strong>07<span>months</span></strong>
    <div><Code2 size={21}/><p>Software engineering<br/>&amp; placement preparation</p></div>
  </div>;
}
