// Stat Gauge Component
// Circular instrument gauge with arc indicator

import { useEffect, useRef, useState } from 'react';

export default function StatGauge({ label, value, max, unit = '', icon = '', arcColor = '#F4C430' }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const svgRef = useRef(null);

  // Animate value changes
  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = (value - animatedValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedValue(prev => {
        const newValue = prev + increment;
        return currentStep >= steps ? value : newValue;
      });

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Calculate arc parameters
  const centerX = 90;
  const centerY = 90;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(animatedValue / max, 1);
  const strokeDashoffset = circumference * (1 - percentage * 0.75); // 75% of circle

  // Format display value
  const displayValue = typeof animatedValue === 'number'
    ? animatedValue >= 1000
      ? (animatedValue / 1000).toFixed(1) + 'K'
      : animatedValue.toFixed(animatedValue % 1 === 0 ? 0 : 1)
    : animatedValue;

  return (
    <div className="stat-gauge">
      <div className="gauge-container">
        <div className="gauge-ring"></div>

        <svg className="gauge-svg" width="180" height="180" ref={svgRef}>
          {/* Background arc */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="rgba(212, 175, 55, 0.1)"
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Foreground arc (animated) */}
          <circle
            className="gauge-arc"
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {[...Array(20)].map((_, i) => {
            const angle = -135 + (i * (270 / 19)); // -135 to 135 degrees
            const rad = (angle * Math.PI) / 180;
            const isMajor = i % 5 === 0;
            const tickLength = isMajor ? 12 : 8;
            const innerRadius = radius - 5;
            const outerRadius = innerRadius - tickLength;

            const x1 = centerX + innerRadius * Math.cos(rad);
            const y1 = centerY + innerRadius * Math.sin(rad);
            const x2 = centerX + outerRadius * Math.cos(rad);
            const y2 = centerY + outerRadius * Math.sin(rad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(212, 175, 55, 0.4)"
                strokeWidth={isMajor ? 2 : 1}
              />
            );
          })}
        </svg>

        <div className="gauge-value">
          {icon && <span className="gauge-icon">{icon}</span>}
          <div>{displayValue}{unit}</div>
        </div>

        <div className="gauge-label">{label}</div>
      </div>
    </div>
  );
}
