import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { useMotionVisibility } from './MotionSystem';

/** Keep the real text and its line breaks in the HTML and accessibility tree. */
export function AnimatedText({ children }: { children: ReactNode }) {
  const ref = useMotionVisibility<HTMLSpanElement>(true);
  let word = 0;
  function split(nodes: ReactNode): ReactNode {
    return Children.map(nodes, node => {
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node).split(/(\s+)/).map((part, index) => /^\s+$/.test(part) || !part ? part :
          <span className="motion-word" key={index} style={{ animationDelay: `${Math.min(word++ * 45, 450)}ms` }}>{part}</span>);
      }
      if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
        return cloneElement(node, { children: split(node.props.children) });
      }
      return node;
    });
  }
  return <span ref={ref} className="text-motion">{split(children)}</span>;
}
