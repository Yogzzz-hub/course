export function StackSignal() {
  return <svg className="stack-signal" viewBox="0 0 360 64" fill="none" aria-hidden="true">
    <path className="stack-track" d="M30 32H330"/>
    <path className="stack-packet" pathLength="1" d="M30 32H330"/>
    {[30,130,230,330].map((x, index) => <g className="stack-node" key={x} style={{ animationDelay: `${index * 1.5}s` }}>
      <rect x={x-13} y="19" width="26" height="26" rx="6"/>
      <path d={`M${x-4} 32h8m-4-4v8`}/>
    </g>)}
  </svg>;
}
