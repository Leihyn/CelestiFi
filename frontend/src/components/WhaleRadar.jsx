// WhaleRadar Component
// Real-time visualization of whale transactions (sonar display)

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function WhaleRadar() {
  const { whales } = useAppStore();
  const [activeWhales, setActiveWhales] = useState([]);
  const sweepAngleRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Filter whales from last 30 seconds and add position data
  useEffect(() => {
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;

    const active = whales
      .filter((whale) => whale.timestamp >= thirtySecondsAgo)
      .map((whale) => {
        // Calculate position
        const angle = (whale.timestamp % 360) * (Math.PI / 180);
        const radius = calculateRadius(whale.amountUSD || 0);

        return {
          ...whale,
          angle,
          radius,
          opacity: calculateOpacity(whale.timestamp, now),
        };
      });

    setActiveWhales(active);
  }, [whales]);

  // Animate sweep line
  useEffect(() => {
    const animate = () => {
      sweepAngleRef.current = (sweepAngleRef.current + 1) % 360;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleWhaleClick = (whale) => {
    console.log('Whale clicked:', whale);
    // TODO: Show whale details modal
  };

  return (
    <div className="whale-radar">
      <div className="radar-header">
        <h2>Whale Radar</h2>
        <div className="radar-status">
          <span className="status-dot live"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="radar-container">
        <svg viewBox="0 0 400 400" className="radar-svg">
          {/* Background grid */}
          <defs>
            <radialGradient id="radarGradient">
              <stop offset="0%" stopColor="rgba(0, 255, 136, 0.1)" />
              <stop offset="100%" stopColor="rgba(0, 255, 136, 0)" />
            </radialGradient>
          </defs>

          <circle cx="200" cy="200" r="200" fill="url(#radarGradient)" />

          {/* Concentric circles */}
          <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(0, 255, 136, 0.2)" strokeWidth="1" />
          <circle cx="200" cy="200" r="120" fill="none" stroke="rgba(0, 255, 136, 0.2)" strokeWidth="1" />
          <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(0, 255, 136, 0.2)" strokeWidth="1" />

          {/* Range labels */}
          <text x="200" y="150" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">
            $10K-$25K
          </text>
          <text x="200" y="90" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">
            $25K-$100K
          </text>
          <text x="200" y="30" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">
            $100K+
          </text>

          {/* Sweep line (animated via CSS) */}
          <line
            x1="200"
            y1="200"
            x2="200"
            y2="20"
            stroke="rgba(0, 255, 136, 0.6)"
            strokeWidth="2"
            className="radar-sweep"
          />

          {/* Whale dots */}
          {activeWhales.map((whale, index) => {
            const x = 200 + whale.radius * Math.cos(whale.angle);
            const y = 200 + whale.radius * Math.sin(whale.angle);
            const size = getWhaleSize(whale.amountUSD);
            const color = getSeverityColor(whale.severity || getSeverity(whale.amountUSD));

            return (
              <g key={whale.txHash || index} onClick={() => handleWhaleClick(whale)}>
                {/* Glow effect */}
                <circle cx={x} cy={y} r={size + 4} fill={color} opacity={whale.opacity * 0.3} className="whale-glow" />

                {/* Whale dot */}
                <circle cx={x} cy={y} r={size} fill={color} opacity={whale.opacity} className="whale-dot" />
              </g>
            );
          })}
        </svg>

        {/* Center info */}
        <div className="radar-center-info">
          <div className="whale-count">{activeWhales.length}</div>
          <div className="whale-label">Active Whales</div>
        </div>
      </div>

      {/* Legend */}
      <div className="radar-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
          <span>Low (&lt;$25K)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Medium ($25K-$100K)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
          <span>High ($100K+)</span>
        </div>
      </div>
    </div>
  );
}

// Calculate radius based on transaction amount (logarithmic scale)
function calculateRadius(amount) {
  if (amount < 25000) return 60; // Inner circle
  if (amount < 100000) return 120; // Middle circle
  return 180; // Outer circle
}

// Calculate opacity based on age (fade out over 30 seconds)
function calculateOpacity(timestamp, now) {
  const age = now - timestamp;
  const maxAge = 30000; // 30 seconds
  return Math.max(0.2, 1 - age / maxAge);
}

// Get whale dot size
function getWhaleSize(amount) {
  if (amount >= 100000) return 8;
  if (amount >= 50000) return 6;
  if (amount >= 25000) return 5;
  return 4;
}

// Get severity from amount
function getSeverity(amount) {
  if (amount >= 100000) return 'critical';
  if (amount >= 50000) return 'high';
  if (amount >= 25000) return 'medium';
  return 'low';
}

// Get color based on severity
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#10b981';
    default:
      return '#10b981';
  }
}
