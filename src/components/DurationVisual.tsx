import { Code2 } from 'lucide-react';
import { useMotionVisibility } from './MotionSystem';

export function DurationVisual({
  number = '07',
  unit = 'months',
  subtitle = 'Software engineering\n& placement preparation',
  segments = 7,
}: {
  number?: string;
  unit?: string;
  subtitle?: string;
  segments?: number;
}) {
  const ref = useMotionVisibility<HTMLDivElement>();
  const lines = subtitle.split('\n');

  return (
    <div className="duration-art" ref={ref}>
      <svg className="duration-dial" viewBox="0 0 300 300" fill="none" aria-hidden="true">
        <circle className="dial-track" cx="150" cy="150" r="120" />
        <circle className="dial-orbit" cx="150" cy="150" r="141" />
        {Array.from({ length: segments }, (_, index) => (
          <g key={index} transform={`rotate(${(index * 360) / segments - 90} 150 150)`}>
            <circle
              className="dial-segment"
              cx="150"
              cy="150"
              r="120"
              pathLength={segments}
              style={{ animationDelay: `${index * 110}ms` }}
            />
            <path className="dial-tick" d="M256 150h9" />
          </g>
        ))}
        <path className="dial-cross" d="M138 150h24m-12-12v24" />
      </svg>
      <span>THE LEARNING JOURNEY</span>
      <strong>
        {number}
        <span>{unit}</span>
      </strong>
      <div>
        <Code2 size={21} />
        <p>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
