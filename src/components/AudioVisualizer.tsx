import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: 'teal' | 'blue' | 'gradient';
}

export default function AudioVisualizer({ isActive, color = 'teal' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = 100);

    // Track resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = 100;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // We draw 3-4 translucent sine waves with different speeds and phases
      const wavesCount = isActive ? 4 : 1;
      const baseAmplitude = isActive ? 25 : 2;

      for (let i = 0; i < wavesCount; i++) {
        ctx.beginPath();
        
        // Define gradients or colors
        if (color === 'teal') {
          ctx.strokeStyle = `rgba(13, 148, 136, ${0.8 - i * 0.18})`;
        } else if (color === 'blue') {
          ctx.strokeStyle = `rgba(2, 132, 199, ${0.8 - i * 0.18})`;
        } else {
          // Gradient
          const grad = ctx.createLinearGradient(0, 0, width, 0);
          grad.addColorStop(0, `rgba(13, 148, 136, ${0.7 - i * 0.15})`);
          grad.addColorStop(1, `rgba(2, 132, 199, ${0.7 - i * 0.15})`);
          ctx.strokeStyle = grad;
        }

        ctx.lineWidth = i === 0 ? 3 : 1.5;

        const amplitude = baseAmplitude * (1 - i * 0.22);
        const frequency = 0.008 + i * 0.005;
        const waveSpeed = 0.08 + i * 0.02;

        for (let x = 0; x < width; x++) {
          // Compute Y coordinate
          // Dampen at the edges to make it look like a packet
          const factor = Math.sin((x / width) * Math.PI);
          const y =
            height / 2 +
            Math.sin(x * frequency + phase + i * Math.PI * 0.4) *
              amplitude *
              factor;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      phase += isActive ? 0.06 : 0.01;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isActive, color]);

  return (
    <div className="w-full h-24 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center relative shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {!isActive && (
        <span className="absolute text-xs font-medium text-slate-400 tracking-wider pointer-events-none uppercase">
          Microphone Standby
        </span>
      )}
    </div>
  );
}
