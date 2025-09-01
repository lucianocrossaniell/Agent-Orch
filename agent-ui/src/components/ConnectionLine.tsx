import React from 'react';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to }) => {
  console.log('ConnectionLine rendering with from:', from, 'to:', to);
  
  return (
    <svg
      className="absolute pointer-events-none inset-0 w-full h-full"
      style={{
        zIndex: 1,
      }}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
      />
      
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#3b82f6"
          />
        </marker>
      </defs>
    </svg>
  );
};

export default ConnectionLine;