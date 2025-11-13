// Starfield Background Component
// Creates animated starfield with twinkling stars

import { useEffect, useRef } from 'react';

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star properties - LOTS of diamond-like stars
    const stars = [];
    const starCount = 1200; // Increased to 1200 for more diamonds!

    // Diamond colors - various beautiful hues
    const diamondColors = [
      '#FFFFFF', // Clear white diamond
      '#F0F8FF', // Ice blue diamond
      '#E6F3FF', // Light blue diamond
      '#FFE4E1', // Pink diamond
      '#FFF8DC', // Champagne diamond
      '#FFFACD', // Yellow diamond
      '#E0FFE0', // Green diamond
      '#FFD700', // Golden diamond
      '#C0C0C0', // Silver diamond
      '#B0E0E6', // Powder blue diamond
      '#FFB6C1', // Light pink diamond
      '#98FB98', // Pale green diamond
    ];

    // Create stars with diamond-like properties
    for (let i = 0; i < starCount; i++) {
      const isDiamond = Math.random() > 0.7; // 30% chance to be a special diamond star

      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: isDiamond ? Math.random() * 3 + 1 : Math.random() * 2, // Diamonds are bigger
        opacity: Math.random() * 0.7 + 0.3,
        twinkleSpeed: isDiamond ? 0.02 + Math.random() * 0.03 : 0.005 + Math.random() * 0.015,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        color: diamondColors[Math.floor(Math.random() * diamondColors.length)],
        isDiamond: isDiamond,
        sparklePhase: Math.random() * Math.PI * 2, // For sparkle animation
        drift: {
          x: (Math.random() - 0.5) * 0.05,
          y: (Math.random() - 0.5) * 0.05
        }
      });
    }

    // Animation loop
    let animationId;
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      stars.forEach(star => {
        // Update twinkle
        star.opacity += star.twinkleSpeed * star.twinkleDirection;
        if (star.opacity >= 1 || star.opacity <= 0.3) {
          star.twinkleDirection *= -1;
        }

        // Update sparkle phase for diamonds
        if (star.isDiamond) {
          star.sparklePhase += 0.05;
        }

        // Update position (slow drift)
        star.x += star.drift.x;
        star.y += star.drift.y;

        // Wrap around edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        if (star.isDiamond) {
          // Draw diamond stars with sparkle effect
          const sparkleIntensity = (Math.sin(star.sparklePhase) + 1) / 2;

          // Outer glow (large)
          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.opacity * 0.2 * sparkleIntensity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
          ctx.fill();

          // Middle glow
          ctx.globalAlpha = star.opacity * 0.4 * sparkleIntensity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Inner glow
          ctx.globalAlpha = star.opacity * 0.6;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Core (bright center)
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = star.opacity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // Draw 4-point diamond sparkle
          ctx.strokeStyle = star.color;
          ctx.globalAlpha = star.opacity * sparkleIntensity;
          ctx.lineWidth = 1.5;

          // Horizontal sparkle line
          ctx.beginPath();
          ctx.moveTo(star.x - star.size * 3, star.y);
          ctx.lineTo(star.x + star.size * 3, star.y);
          ctx.stroke();

          // Vertical sparkle line
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - star.size * 3);
          ctx.lineTo(star.x, star.y + star.size * 3);
          ctx.stroke();

        } else {
          // Draw regular stars
          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.opacity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // Add subtle glow for larger stars
          if (star.size > 1.5) {
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.opacity * 0.3;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield-canvas" />;
}
