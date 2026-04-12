"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface GridAnimationProps {
  cols?: number;
  rows?: number;
  spacing?: number;
  strokeLength?: number;
  strokeWidth?: number;
  lineColor?: string;
  className?: string;
}

export function GridAnimation({
  cols = 50,
  rows = 20,
  spacing = 40,
  strokeLength = 18,
  strokeWidth = 3,
  lineColor = "rgba(0,0,0,0.15)",
  className = "",
}: GridAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const x = i * spacing;
        const y = j * spacing;
        const dx = mx - x;
        const dy = my - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;
        const influence = Math.max(0, 1 - dist / maxDist);

        if (influence > 0.05) {
          const angle = Math.atan2(dy, dx);
          const len = strokeLength * influence;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len);
          ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = strokeWidth * influence;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, 1.5 + influence * 2, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
      }
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [cols, rows, spacing, strokeLength, strokeWidth, lineColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", handleMouse);

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
    />
  );
}
