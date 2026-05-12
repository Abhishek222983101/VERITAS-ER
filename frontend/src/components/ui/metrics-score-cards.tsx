"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface MetricCardData {
  key: string;
  title: string;
  description: string;
  initialScore: number;
  icon: React.ReactNode;
  color: string;
}

interface MetricsScoreCardsProps {
  data: MetricCardData[];
}

export function MetricsScoreCards({ data }: MetricsScoreCardsProps) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(data.map((d) => [d.key, d.initialScore]))
  );

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "#A7F3D0";
    if (score >= 60) return "#FFD700";
    return "#FF6B6B";
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      {data.map((card) => {
        const score = scores[card.key] ?? card.initialScore;
        return (
          <div
            key={card.key}
            className="bg-white border-brutal shadow-brutal p-6 md:p-8 flex flex-col gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            onClick={() =>
              setScores((prev) => ({
                ...prev,
                [card.key]: Math.floor(Math.random() * 100),
              }))
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {card.icon}
                <h3 className="font-heading text-xl font-black uppercase tracking-tight">
                  {card.title}
                </h3>
              </div>
              <div
                className="w-4 h-4 border-2 border-black"
                style={{
                  backgroundColor: card.color,
                  boxShadow: `0 0 12px ${card.color}50`,
                }}
              />
            </div>

            <p className="font-mono text-sm text-neutral-700 leading-relaxed">
              {card.description}
            </p>

            <div className="mt-auto pt-4 border-t-4 border-black">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-black/50">
                  Score
                </span>
                <span
                  className="font-heading text-3xl font-black tabular-nums"
                  style={{ color: getConfidenceColor(score) }}
                >
                  {score}
                </span>
              </div>
              <div className="w-full h-3 bg-black/10 border-2 border-black">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${score}%`,
                    backgroundColor: getConfidenceColor(score),
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
