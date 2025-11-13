// Supernova Burst Animation
// Dramatic explosion of stars covering the entire screen on alert
// Plays for 4 seconds then screen returns to normal

import { useEffect, useRef, useState } from 'react';

export default function CelestialFireworks({ trigger, onComplete }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    console.log('🎆 Alert triggered! Starting SUPERNOVA animation...');

    // Show the canvas
    setShow(true);

    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ Canvas not found!');
        return;
      }

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      console.log('Canvas ready:', canvas.width, 'x', canvas.height);

      // Supernova colors - bright and visible!
      const supernovaColors = [
        '#FFD700', // Gold
        '#FFA500', // Orange
        '#FF6347', // Tomato red
        '#FF1493', // Deep pink
        '#FF00FF', // Magenta
        '#00FFFF', // Cyan
        '#00FF00', // Lime
        '#FFFF00', // Yellow
        '#FF4500', // Orange red
        '#FF69B4', // Hot pink
        '#7FFF00', // Chartreuse
        '#00BFFF', // Deep sky blue
        '#FFFFFF', // White
      ];

      // Create MASSIVE burst of particles from multiple points
      const particles = [];
      const burstPoints = [
        { x: canvas.width / 2, y: canvas.height / 2 }, // Center
        { x: canvas.width / 4, y: canvas.height / 4 }, // Top left
        { x: (canvas.width * 3) / 4, y: canvas.height / 4 }, // Top right
        { x: canvas.width / 4, y: (canvas.height * 3) / 4 }, // Bottom left
        { x: (canvas.width * 3) / 4, y: (canvas.height * 3) / 4 }, // Bottom right
      ];

      // Create particles from each burst point
      burstPoints.forEach((point, index) => {
        const particlesPerBurst = 200; // 200 particles per burst point
        const delay = index * 100; // Stagger bursts

        for (let i = 0; i < particlesPerBurst; i++) {
          const angle = (Math.PI * 2 * i) / particlesPerBurst;
          const speed = 2 + Math.random() * 8;
          const size = 3 + Math.random() * 6;

          particles.push({
            x: point.x,
            y: point.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            alpha: 1,
            color: supernovaColors[Math.floor(Math.random() * supernovaColors.length)],
            startTime: Date.now() + delay,
            life: 0,
            maxLife: 4000, // 4 seconds duration
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
          });
        }
      });

      particlesRef.current = particles;
      console.log('✅ Created', particles.length, 'particles');

      const startTime = Date.now();
      const ANIMATION_DURATION = 4000; // 4 seconds total

      // Animation loop
      const animate = () => {
        const elapsed = Date.now() - startTime;

        // Stop after 4 seconds
        if (elapsed > ANIMATION_DURATION) {
          console.log('🎆 Animation complete! Hiding canvas...');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setShow(false);
          if (onComplete) onComplete();
          return;
        }

        // Clear canvas each frame - transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const now = Date.now();
        let activeParticles = 0;

        particlesRef.current.forEach((particle) => {
          // Check if particle should start
          if (now < particle.startTime) return;

          // Update particle life
          particle.life = now - particle.startTime;
          if (particle.life > particle.maxLife) return;

          activeParticles++;

          // Update position
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Gravity effect
          particle.vy += 0.05;

          // Fade out over time
          particle.alpha = 1 - particle.life / particle.maxLife;

          // Rotation
          particle.rotation += particle.rotationSpeed;

          // Draw particle
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation);

          // Glow effect
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 4);
          gradient.addColorStop(0, particle.color + Math.floor(particle.alpha * 255).toString(16).padStart(2, '0'));
          gradient.addColorStop(0.5, particle.color + Math.floor(particle.alpha * 100).toString(16).padStart(2, '0'));
          gradient.addColorStop(1, particle.color + '00');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size * 4, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = particle.color + Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle lines (30% chance)
          if (Math.random() > 0.7) {
            ctx.strokeStyle = '#FFFFFF' + Math.floor(particle.alpha * 200).toString(16).padStart(2, '0');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-particle.size * 3, 0);
            ctx.lineTo(particle.size * 3, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -particle.size * 3);
            ctx.lineTo(0, particle.size * 3);
            ctx.stroke();
          }

          ctx.restore();
        });

        animationRef.current = requestAnimationFrame(animate);
      };

      console.log('🚀 Starting animation...');
      animate();

    }, 50); // 50ms delay to ensure canvas is rendered

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log('🛑 Animation cleanup');
      }
    };
  }, [trigger, onComplete]);

  // Always render canvas when show is true
  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
