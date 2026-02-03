"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { threeDColors, spacing, borderRadius, zIndex } from "@/styles/theme";

interface PerformanceStats {
  fps: number;
  avgFps: number;
  minFps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memory: number;
}

export function PerformanceMonitor({ enabled = true }: { enabled?: boolean }) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsArray = useRef<number[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memory: 0,
  });

  useFrame(() => {
    if (!enabled) return;

    frameCount.current++;

    // Update stats every 60 frames (once per second at 60fps)
    if (frameCount.current % 60 === 0) {
      const now = performance.now();
      const fps = 60000 / (now - lastTime.current);
      fpsArray.current.push(fps);

      // Keep last 100 samples for rolling average
      if (fpsArray.current.length > 100) {
        fpsArray.current.shift();
      }

      const avgFps =
        fpsArray.current.reduce((a, b) => a + b) / fpsArray.current.length;
      const minFps = Math.min(...fpsArray.current);

      // Get renderer info
      const info = gl.info;

      // Get memory usage (if available)
      let memory = 0;
      if ((performance as any).memory) {
        memory = (performance as any).memory.usedJSHeapSize / 1048576; // MB
      }

      setStats({
        fps: Math.round(fps),
        avgFps: Math.round(avgFps * 10) / 10,
        minFps: Math.round(minFps * 10) / 10,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        memory: Math.round(memory),
      });

      lastTime.current = now;
      frameCount.current = 0;
    }
  });

  useEffect(() => {
    // Log to console every update
    if (enabled) {
      console.log("[Performance]", stats);
    }
  }, [stats, enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 10,
        backgroundColor: threeDColors.performanceBg,
        color: threeDColors.performanceText,
        fontFamily: "monospace",
        fontSize: "11px",
        padding: spacing.xs,
        borderRadius: borderRadius.sm,
        zIndex: zIndex.performanceMonitor,
        minWidth: "200px",
        pointerEvents: "none",
      }}
    >
      <div style={{ marginBottom: spacing.xs, color: threeDColors.performanceWhite, fontWeight: "bold" }}>
        Performance Stats
      </div>
      <div>FPS: {stats.fps}</div>
      <div>Avg FPS: {stats.avgFps}</div>
      <div>Min FPS: {stats.minFps}</div>
      <div style={{ borderTop: `1px solid ${threeDColors.performanceBorder}`, marginTop: spacing.xs, paddingTop: spacing.xs }}>
        Draw Calls: {stats.drawCalls}
      </div>
      <div>Triangles: {stats.triangles.toLocaleString()}</div>
      <div style={{ borderTop: `1px solid ${threeDColors.performanceBorder}`, marginTop: spacing.xs, paddingTop: spacing.xs }}>
        Geometries: {stats.geometries}
      </div>
      <div>Textures: {stats.textures}</div>
      {stats.memory > 0 && (
        <div style={{ borderTop: `1px solid ${threeDColors.performanceBorder}`, marginTop: spacing.xs, paddingTop: spacing.xs }}>
          Memory: {stats.memory}MB
        </div>
      )}
    </div>
  );
}

/**
 * Utility to measure async operations
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

/**
 * Utility to measure sync operations
 */
export function measureSync<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}
