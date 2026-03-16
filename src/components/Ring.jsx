import { T } from "../constants/theme.js";

function Ring({ pct, color, size=52, strokeWidth=4 }) {
  const r=(size-strokeWidth*2)/2, circ=2*Math.PI*r, offset=circ-(pct/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 0.7s ease"}}/>
    </svg>
  );
}


export { Ring };