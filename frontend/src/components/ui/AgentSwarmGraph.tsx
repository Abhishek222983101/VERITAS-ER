"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, QuadraticBezierLine, Stars } from "@react-three/drei";
import * as THREE from "three";

// Colors matching the neo-brutalist theme
const COLORS = {
  YES: "#A7F3D0", // lime-green
  NO: "#FF6B6B", // hot-coral
  UNSURE: "#FFD700", // cyber-yellow
  TRUTH: "#9945FF", // solana-purple
};

interface AgentNodeProps {
  position: [number, number, number];
  name: string;
  vote: "YES" | "NO" | "UNSURE";
  reputation: number;
}

function TruthNode() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[1, 0.4, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.TRUTH}
          emissive={COLORS.TRUTH}
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>
      <Html center position={[0, -2, 0]}>
        <div className="bg-black text-white px-3 py-1 font-mono text-xs font-bold whitespace-nowrap border-2 border-white uppercase tracking-widest">
          Market State
        </div>
      </Html>
    </group>
  );
}

function AgentNode({ position, name, vote, reputation }: AgentNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = COLORS[vote];

  // Make the line curve towards the camera slightly
  const mid = new THREE.Vector3(
    position[0] / 2,
    (position[1] + 2) / 2,
    position[2] / 2
  );

  return (
    <group>
      {/* Connection to center */}
      <QuadraticBezierLine
        start={[0, 0, 0]}
        end={position}
        mid={mid}
        color={color}
        lineWidth={2}
        dashed={true}
      />
      
      <mesh position={position} ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      {/* HTML Label */}
      <Html position={[position[0], position[1] + 1.5, position[2]]} center zIndexRange={[100, 0]}>
        <div className={`
          flex flex-col items-center justify-center p-2 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]
          ${vote === 'YES' ? 'bg-lime-green text-black' : vote === 'NO' ? 'bg-hot-coral text-black' : 'bg-cyber-yellow text-black'}
        `}>
          <span className="font-heading font-black text-sm whitespace-nowrap uppercase tracking-tighter leading-none mb-1">
            {name}
          </span>
          <span className="font-mono text-[10px] font-bold opacity-80 leading-none">
            REP: {reputation} | VOTE: {vote}
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function AgentSwarmGraph({
  agents = []
}: {
  agents?: { name: string; vote: "YES" | "NO" | "UNSURE"; reputation: number }[]
}) {
  // Generate circular positions for agents
  const agentNodes = useMemo(() => {
    if (agents.length === 0) return [];
    
    const radius = 5;
    return agents.map((agent, i) => {
      const angle = (i / agents.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Add slight vertical variation
      const y = Math.sin(angle * 2) * 1.5;
      
      return {
        ...agent,
        position: [x, y, z] as [number, number, number]
      };
    });
  }, [agents]);

  return (
    <div className="w-full h-full bg-[#111] border-2 border-black relative overflow-hidden bg-grid-pattern-dark">
      <Canvas camera={{ position: [0, 4, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Background stars */}
        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 4}
        />
        
        <TruthNode />
        
        {agentNodes.map((node, i) => (
          <AgentNode
            key={i}
            position={node.position}
            name={node.name}
            vote={node.vote}
            reputation={node.reputation}
          />
        ))}
      </Canvas>
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <h3 className="font-heading text-xl font-black text-white tracking-tighter uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          Live Oracle Swarm
        </h3>
        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-lime-green border border-black" />
            <span className="font-mono text-xs font-bold text-white uppercase">YES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-hot-coral border border-black" />
            <span className="font-mono text-xs font-bold text-white uppercase">NO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-solana-purple border border-black" />
            <span className="font-mono text-xs font-bold text-white uppercase">MARKET</span>
          </div>
        </div>
      </div>
    </div>
  );
}
