"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Sphere, Grid } from "@react-three/drei";
import { RotateCcw, Pause, Play } from "lucide-react";
import * as THREE from "three";

// MediaPipe Pose landmark indices
const POSE_LANDMARKS = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32,
};

// MediaPipe Pose connections (bones)
const POSE_CONNECTIONS: [number, number][] = [
    // Face
    [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_EYE_INNER],
    [POSE_LANDMARKS.LEFT_EYE_INNER, POSE_LANDMARKS.LEFT_EYE],
    [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.LEFT_EYE_OUTER],
    [POSE_LANDMARKS.LEFT_EYE_OUTER, POSE_LANDMARKS.LEFT_EAR],
    [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE_INNER],
    [POSE_LANDMARKS.RIGHT_EYE_INNER, POSE_LANDMARKS.RIGHT_EYE],
    [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EYE_OUTER],
    [POSE_LANDMARKS.RIGHT_EYE_OUTER, POSE_LANDMARKS.RIGHT_EAR],
    [POSE_LANDMARKS.MOUTH_LEFT, POSE_LANDMARKS.MOUTH_RIGHT],
    // Torso
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
    // Left arm
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
    [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
    [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
    [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_THUMB],
    [POSE_LANDMARKS.LEFT_PINKY, POSE_LANDMARKS.LEFT_INDEX],
    // Right arm
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
    [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
    [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
    [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
    [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_THUMB],
    [POSE_LANDMARKS.RIGHT_PINKY, POSE_LANDMARKS.RIGHT_INDEX],
    // Left leg
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
    [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
    [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
    [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
    // Right leg
    [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
    [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
    [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
    [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
];

// Landmark interface matching the types
interface Landmark {
    name: string;
    x: number;
    y: number;
    z: number;
    visibility: number;
}

interface Skeleton3DViewerProps {
    landmarks: Landmark[] | null;
    width?: number;
    height?: number;
    autoRotate?: boolean;
    rotationSpeed?: number;
    backgroundColor?: string;
    boneColor?: string;
    jointColor?: string;
}

// Convert MediaPipe coordinates to Three.js world space
function convertToWorldCoords(landmarks: Landmark[]): THREE.Vector3[] {
    return landmarks.map((lm) => {
        // MediaPipe uses 0-1 normalized coordinates
        // Convert to centered coordinates: -1 to +1
        const x = (lm.x - 0.5) * 2;
        // Flip Y axis (MediaPipe Y is down, Three.js Y is up)
        const y = -(lm.y - 0.5) * 2;
        // Z is depth from camera
        const z = (lm.z || 0) * 2;
        return new THREE.Vector3(x, y, z);
    });
}

// Inner component for skeleton rendering inside Canvas
function Skeleton3D({
    landmarks,
    boneColor,
    jointColor,
}: {
    landmarks: Landmark[];
    boneColor: string;
    jointColor: string;
}) {
    const worldCoords = useMemo(() => convertToWorldCoords(landmarks), [landmarks]);

    // Create bone lines
    const boneLines = useMemo(() => {
        const lines: { points: THREE.Vector3[]; visible: boolean }[] = [];

        for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
            if (startIdx < landmarks.length && endIdx < landmarks.length) {
                const startVis = landmarks[startIdx].visibility;
                const endVis = landmarks[endIdx].visibility;

                if (startVis > 0.3 && endVis > 0.3) {
                    lines.push({
                        points: [worldCoords[startIdx], worldCoords[endIdx]],
                        visible: true,
                    });
                }
            }
        }

        return lines;
    }, [landmarks, worldCoords]);

    // Create joint positions
    const joints = useMemo(() => {
        return landmarks
            .map((lm, idx) => ({
                position: worldCoords[idx],
                visibility: lm.visibility,
                size: 0.03,
            }))
            .filter((joint) => joint.visibility > 0.3);
    }, [landmarks, worldCoords]);

    return (
        <group>
            {/* Render bones as lines */}
            {boneLines.map((line, idx) => (
                <Line
                    key={`bone-${idx}`}
                    points={line.points}
                    color={boneColor}
                    lineWidth={3}
                />
            ))}

            {/* Render joints as spheres */}
            {joints.map((joint, idx) => (
                <Sphere
                    key={`joint-${idx}`}
                    args={[joint.size, 8, 8]}
                    position={joint.position}
                >
                    <meshStandardMaterial color={jointColor} />
                </Sphere>
            ))}
        </group>
    );
}

// Auto-rotate camera component
function AutoRotate({ enabled, speed }: { enabled: boolean; speed: number }) {
    const controlsRef = useRef<any>(null);

    useFrame(() => {
        if (controlsRef.current && enabled) {
            controlsRef.current.autoRotate = true;
            controlsRef.current.autoRotateSpeed = speed;
            controlsRef.current.update();
        } else if (controlsRef.current) {
            controlsRef.current.autoRotate = false;
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={enabled}
            autoRotateSpeed={speed}
        />
    );
}

export default function Skeleton3DViewer({
    landmarks,
    width = 400,
    height = 400,
    autoRotate = true,
    rotationSpeed = 2,
    backgroundColor = "#0a0a0a",
    boneColor = "#22c55e",
    jointColor = "#ef4444",
}: Skeleton3DViewerProps) {
    const [isRotating, setIsRotating] = useState(autoRotate);
    const controlsRef = useRef<any>(null);

    // Reset camera position
    const handleReset = useCallback(() => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    }, []);

    // Toggle rotation
    const toggleRotation = useCallback(() => {
        setIsRotating((prev) => !prev);
    }, []);

    if (!landmarks || landmarks.length === 0) {
        return (
            <div
                className="flex items-center justify-center bg-neutral-900 rounded-xl"
                style={{ width, height }}
            >
                <div className="text-center text-neutral-500">
                    <div className="text-4xl mb-2">🦴</div>
                    <p className="text-sm">No skeleton data</p>
                    <p className="text-xs text-neutral-600">Play video to see 3D view</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative" style={{ width, height }}>
            <Canvas
                camera={{ position: [0, 0, 3], fov: 50 }}
                style={{ background: backgroundColor, borderRadius: "0.75rem" }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <pointLight position={[-10, -10, -10]} intensity={0.4} />

                {/* Skeleton */}
                <Skeleton3D
                    landmarks={landmarks}
                    boneColor={boneColor}
                    jointColor={jointColor}
                />

                {/* Grid floor for reference */}
                <Grid
                    args={[4, 4]}
                    position={[0, -1.2, 0]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    cellColor="#333"
                    sectionSize={1}
                    sectionThickness={1}
                    sectionColor="#555"
                    fadeDistance={10}
                    infiniteGrid={false}
                />

                {/* Orbit controls */}
                <OrbitControls
                    ref={controlsRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={isRotating}
                    autoRotateSpeed={rotationSpeed}
                />
            </Canvas>

            {/* Controls overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleRotation}
                        className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition"
                        title={isRotating ? "Pause rotation" : "Resume rotation"}
                    >
                        {isRotating ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition"
                        title="Reset view"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-3 py-1.5 bg-black/70 rounded-lg text-white text-xs font-mono">
                    3D View
                </div>
            </div>
        </div>
    );
}
