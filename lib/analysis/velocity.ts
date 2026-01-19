/**
 * Velocity calculation utilities for stroke detection
 * 
 * Ported from: Pickleball2/python/classification/heuristics.py
 * Lines: 60-99
 * 
 * IMPORTANT: Do NOT optimize or change thresholds. This is a mechanical port.
 */

import { FrameMetrics } from './types';

/**
 * Velocity calculation result
 */
export interface VelocityResult {
    velY: number;      // negative = moving UP (y increases downward in image coords)
    velX: number;
    velZ: number;      // depth: negative = moving AWAY from camera
    magnitude: number; // 3D magnitude including depth
}

/**
 * Compute 3D velocity from current and previous frame metrics.
 * 
 * ENHANCED from original 2D version to include Z-axis (depth).
 * This uses the full 3D coordinates from MediaPipe landmarks.
 * 
 * @param current - Current frame metrics
 * @param prev - Previous frame metrics (or null if first frame)
 * @param keyY - Key for Y coordinate (e.g., 'right_wrist_y')
 * @param keyX - Optional key for X coordinate (e.g., 'right_wrist_x')
 * @param keyZ - Optional key for Z coordinate (e.g., 'right_wrist_z')
 * @returns Velocity in Y, X, Z, and 3D magnitude
 */
export function computeVelocity(
    current: Record<string, number | boolean | null | undefined>,
    prev: Record<string, number | boolean | null | undefined> | null,
    keyY: string,
    keyX?: string,
    keyZ?: string
): VelocityResult {
    if (!prev) {
        return { velY: 0, velX: 0, velZ: 0, magnitude: 0 };
    }

    const currY = (current[keyY] as number) ?? 0.5;
    const prevY = (prev[keyY] as number) ?? currY;

    const velY = currY - prevY; // negative = moving up

    let velX = 0;
    if (keyX) {
        const currX = (current[keyX] as number) ?? 0.5;
        const prevX = (prev[keyX] as number) ?? currX;
        velX = currX - prevX;
    }

    // NEW: Include Z-axis (depth) for true 3D velocity
    let velZ = 0;
    if (keyZ) {
        const currZ = (current[keyZ] as number) ?? 0;
        const prevZ = (prev[keyZ] as number) ?? currZ;
        velZ = currZ - prevZ; // negative = moving away from camera
    }

    // 3D magnitude: sqrt(vx² + vy² + vz²)
    const magnitude = Math.sqrt(velY * velY + velX * velX + velZ * velZ);

    return { velY, velX, velZ, magnitude };
}

/**
 * Count consecutive frames with upward wrist motion at end of history.
 * 
 * Ported from: count_upward_frames(history, key, min_frames)
 * 
 * @param history - Array of frame metrics (chronological order)
 * @param key - Key to check for upward motion (e.g., 'right_wrist_y')
 * @returns Count of consecutive upward frames at the end
 */
export function countUpwardFrames(
    history: Record<string, number | boolean | null | undefined>[],
    key: string
): number {
    if (history.length < 2) {
        return 0;
    }

    let count = 0;
    for (let i = history.length - 1; i > 0; i--) {
        const currY = (history[i][key] as number) ?? 0.5;
        const prevY = (history[i - 1][key] as number) ?? 0.5;

        if (currY < prevY) {
            // Moving up (Y decreases)
            count++;
        } else {
            break;
        }
    }

    return count;
}
