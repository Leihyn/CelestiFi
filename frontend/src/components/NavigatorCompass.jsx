// Navigator's Compass Component
// Ancient Navigator's Instrument for Whale Tracking
// Canvas-based astronomical radar with ornate decorations

import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function NavigatorCompass() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const scanAngleRef = useRef(0);
  const { whales } = useAppStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Make canvas square - force same width and height
    const container = canvas.parentElement;
    const size = 420; // Fixed square size
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 800; // Scale factor from original 800px design

    // Scaled radius constants
    const R_OUTER = 380 * scale;    // Outer ring
    const R_1M = 320 * scale;        // $1M+ ring
    const R_250K = 260 * scale;      // $250K ring
    const R_50K = 200 * scale;       // $50K ring
    const R_10K = 140 * scale;       // $10K ring
    const R_100 = 100 * scale;       // Base ring
    const R_CENTER = 50 * scale;     // Center hub
    const R_SCAN = 350 * scale;      // Scan needle length

    // Color constants from theme
    const GOLD_DIVINE = '#FFD700';
    const GOLD_IMPERIAL = '#F4C430';
    const GOLD_ANCIENT = '#D4AF37';
    const GOLD_BRONZE = '#B8860B';
    const STELLAR_NAVY = '#1A3A4F';
    const DEEP_OCEAN = '#0A1628';

    const SEVERITY_COLORS = {
      low: '#4ECDC4',
      medium: '#FFE66D',
      high: '#FF8C42',
      critical: '#EE4266'
    };

    // Helper: Convert amount to radius (logarithmic scale)
    const amountToRadius = (amount) => {
      if (amount >= 1000000) return R_1M;   // $1M+
      if (amount >= 250000) return R_250K;  // $250K
      if (amount >= 50000) return R_50K;    // $50K
      if (amount >= 10000) return R_10K;    // $10K
      return R_100;
    };

    // Helper: Convert timestamp to angle
    const timestampToAngle = (timestamp) => {
      const now = Date.now();
      const age = now - timestamp;
      const maxAge = 60000; // 60 seconds
      const normalizedAge = Math.min(age / maxAge, 1);
      // Recent whales appear ahead of scan line
      return (scanAngleRef.current - (normalizedAge * 360) + 360) % 360;
    };

    // Helper: Get severity from amount
    const getSeverity = (amount) => {
      if (amount >= 100000) return 'critical';
      if (amount >= 50000) return 'high';
      if (amount >= 25000) return 'medium';
      return 'low';
    };

    // Draw starfield background
    const drawStarfield = () => {
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const size_star = Math.random() * 1.5 * scale;
        const opacity = Math.random() * 0.5;

        ctx.fillStyle = `rgba(232, 232, 232, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size_star, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Draw radial background glow
    const drawRadialGlow = () => {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerY);
      gradient.addColorStop(0, 'rgba(26, 58, 75, 0.3)');
      gradient.addColorStop(0.7, 'rgba(26, 58, 75, 0.1)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    };

    // Draw concentric distance rings
    const drawDistanceRings = () => {
      const rings = [
        { radius: R_1M, label: '$1M+', color: GOLD_DIVINE, opacity: 0.6 },
        { radius: R_250K, label: '$250K', color: GOLD_IMPERIAL, opacity: 0.5 },
        { radius: R_50K, label: '$50K', color: GOLD_ANCIENT, opacity: 0.4 },
        { radius: R_10K, label: '$10K', color: GOLD_BRONZE, opacity: 0.3 }
      ];

      rings.forEach(ring => {
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = ring.opacity;
        ctx.lineWidth = 1.5 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label
        ctx.font = `${11 * scale}px Cinzel, serif`;
        ctx.fillStyle = ring.color;
        ctx.textAlign = 'center';
        ctx.fillText(ring.label, centerX, centerY - ring.radius - 8 * scale);
      });

      ctx.globalAlpha = 1;
    };

    // Draw degree markings on outer ring
    const drawDegreeMarks = () => {
      ctx.strokeStyle = GOLD_ANCIENT;
      ctx.fillStyle = GOLD_ANCIENT;

      // Draw marks every 10 degrees
      for (let angle = 0; angle < 360; angle += 10) {
        const isMajor = angle % 30 === 0;
        const rad = (angle - 90) * (Math.PI / 180);
        const length = isMajor ? 25 * scale : 15 * scale;
        const width = isMajor ? 2 * scale : 1 * scale;

        const x1 = centerX + R_OUTER * Math.cos(rad);
        const y1 = centerY + R_OUTER * Math.sin(rad);
        const x2 = centerX + (R_OUTER - length) * Math.cos(rad);
        const y2 = centerY + (R_OUTER - length) * Math.sin(rad);

        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw numeric degree labels at major marks
        if (isMajor) {
          ctx.save();
          ctx.font = `${10 * scale}px Cinzel, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const labelX = centerX + (R_OUTER - 15 * scale) * Math.cos(rad);
          const labelY = centerY + (R_OUTER - 15 * scale) * Math.sin(rad);

          ctx.fillText(`${angle}°`, labelX, labelY);
          ctx.restore();
        }
      }
    };

    // Draw cardinal direction labels
    const drawCardinalLabels = () => {
      ctx.font = `${20 * scale}px Cinzel, serif`;
      ctx.fillStyle = GOLD_IMPERIAL;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cardinals = [
        { angle: 0, label: 'N' },
        { angle: 90, label: 'E' },
        { angle: 180, label: 'S' },
        { angle: 270, label: 'W' }
      ];

      cardinals.forEach(({ angle, label }) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const x = centerX + (340 * scale) * Math.cos(rad);
        const y = centerY + (340 * scale) * Math.sin(rad);

        // Add glow effect
        ctx.shadowColor = GOLD_IMPERIAL;
        ctx.shadowBlur = 10 * scale;
        ctx.fillText(label, x, y);
        ctx.shadowBlur = 0;
      });
    };

    // Draw center hub
    const drawCenterHub = () => {
      // Hub gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, R_CENTER);
      gradient.addColorStop(0, STELLAR_NAVY);
      gradient.addColorStop(1, DEEP_OCEAN);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R_CENTER, 0, Math.PI * 2);
      ctx.fill();

      // Hub border
      ctx.strokeStyle = GOLD_IMPERIAL;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R_CENTER, 0, Math.PI * 2);
      ctx.stroke();

      // Radiating lines inside hub
      for (let i = 0; i < 16; i++) {
        const angle = (i * 360 / 16) * (Math.PI / 180);
        const x2 = centerX + (30 * scale) * Math.cos(angle);
        const y2 = centerY + (30 * scale) * Math.sin(angle);

        ctx.strokeStyle = `rgba(212, 175, 55, 0.3)`;
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    // Draw outer ring
    const drawOuterRing = () => {
      ctx.strokeStyle = GOLD_ANCIENT;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R_OUTER, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary ring
      ctx.strokeStyle = GOLD_BRONZE;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (386 * scale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // Draw whale blips
    const drawWhaleBlips = () => {
      const now = Date.now();
      const recentWhales = whales.filter(w => now - w.timestamp < 60000); // Last 60 seconds

      recentWhales.forEach(whale => {
        const amount = whale.amountUSD || 0;
        const severity = whale.severity || getSeverity(amount);
        const radius = amountToRadius(amount);
        const angle = timestampToAngle(whale.timestamp);
        const rad = (angle - 90) * (Math.PI / 180);

        const x = centerX + radius * Math.cos(rad);
        const y = centerY + radius * Math.sin(rad);

        const age = now - whale.timestamp;
        const opacity = Math.max(0.3, 1 - (age / 60000));

        const size = amount >= 100000 ? 10 * scale : amount >= 50000 ? 8 * scale : amount >= 25000 ? 6 * scale : 5 * scale;

        // Connection line to center
        ctx.strokeStyle = `rgba(212, 175, 55, ${opacity * 0.2})`;
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([2 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glow
        ctx.shadowColor = SEVERITY_COLORS[severity];
        ctx.shadowBlur = 15 * scale;
        ctx.fillStyle = SEVERITY_COLORS[severity];
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, size + 6 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Main blip
        ctx.globalAlpha = opacity;
        ctx.fillStyle = SEVERITY_COLORS[severity];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
    };

    // Draw rotating scan needle
    const drawScanNeedle = () => {
      const angle = scanAngleRef.current;
      const rad = (angle - 90) * (Math.PI / 180);

      // Scan trail (gradient)
      const trailLength = 60; // degrees
      for (let i = 0; i < trailLength; i += 2) {
        const trailAngle = angle - i;
        const trailRad = (trailAngle - 90) * (Math.PI / 180);
        const opacity = (1 - i / trailLength) * 0.3;

        const x = centerX + R_SCAN * Math.cos(trailRad);
        const y = centerY + R_SCAN * Math.sin(trailRad);

        ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // Main needle
      const x = centerX + R_SCAN * Math.cos(rad);
      const y = centerY + R_SCAN * Math.sin(rad);

      ctx.strokeStyle = GOLD_DIVINE;
      ctx.lineWidth = 3 * scale;
      ctx.shadowColor = GOLD_DIVINE;
      ctx.shadowBlur = 20 * scale;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = GOLD_IMPERIAL;
      ctx.beginPath();
      ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    };

    // Main render function
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Layer 1: Background
      drawStarfield();
      drawRadialGlow();

      // Layer 2: Grid structure
      drawDistanceRings();
      drawDegreeMarks();
      drawCardinalLabels();

      // Layer 3: Whale data
      drawWhaleBlips();

      // Layer 4: Scan needle
      drawScanNeedle();

      // Layer 5: Center hub and outer ring
      drawCenterHub();
      drawOuterRing();

      // Update scan angle
      scanAngleRef.current = (scanAngleRef.current + 0.5) % 360;

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [whales]);

  return (
    <div className="compass-container">
      <canvas
        ref={canvasRef}
        width="800"
        height="800"
        className="compass-canvas"
      />

      {/* Ornate corner decorations */}
      <div className="compass-corner compass-corner-tl"></div>
      <div className="compass-corner compass-corner-tr"></div>
      <div className="compass-corner compass-corner-bl"></div>
      <div className="compass-corner compass-corner-br"></div>

      {/* Center info overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#F4C430',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4)',
          lineHeight: 1
        }}>
          {whales.filter(w => Date.now() - w.timestamp < 60000).length}
        </div>
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#D4AF37',
          marginTop: '8px'
        }}>
          Active Whales
        </div>
      </div>
    </div>
  );
}
