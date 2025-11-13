// useWebSocket Hook
// Custom hook for Socket.IO WebSocket connection management

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

export const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [triggerFireworks, setTriggerFireworks] = useState(0);
  const { setConnected, updatePool, addWhale, addImpact } = useAppStore();

  useEffect(() => {
    // Connect to WebSocket server
    const ws = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
    });

    ws.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      toast.success('Connected to live data stream');

      // Subscribe to all channels
      ws.emit('subscribe:pools');
      ws.emit('subscribe:whales');
    });

    ws.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      toast.error('Disconnected from live stream');
    });

    // Pool updates
    ws.on('pool:update', (data) => {
      updatePool(data.address, data);
    });

    // Whale detected
    ws.on('whale:detected', (data) => {
      addWhale(data.data);

      // Show toast notification
      if (data.data.amountUSD >= 50000) {
        toast.success(`🐋 Whale Alert: $${data.data.amountUSD.toLocaleString()}`, {
          duration: 5000,
          icon: '🚨',
        });

        // Play sound
        new Audio('/whale-alert.mp3').play().catch(() => {});
      }
    });

    // Whale impact analysis
    ws.on('whale:impact', (data) => {
      addImpact(data.data);

      if (data.data.severity === 'critical' || data.data.severity === 'high') {
        toast.error(`⚠️ High Impact: ${data.data.severity.toUpperCase()}`, {
          duration: 8000,
        });
      }
    });

    // Alert triggered - FIREWORKS!
    ws.on('alert:triggered', (data) => {
      console.log('🎆 Alert triggered:', data);

      // Trigger celestial fireworks
      setTriggerFireworks(prev => prev + 1);

      // Show toast notification
      toast.success(data.data.message || '🚨 Alert Triggered!', {
        duration: 6000,
        icon: '🎆',
        style: {
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(238, 66, 102, 0.95))',
          color: '#fff',
          border: '2px solid #FFD700',
          fontFamily: 'Cinzel, serif',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
        },
      });

      // Play celebration sound
      const audio = new Audio('/alert-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: create a beep using Web Audio API
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.log('Could not play sound');
        }
      });
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [setConnected, updatePool, addWhale, addImpact]);

  return { socket, connected: !!socket?.connected, triggerFireworks };
};
