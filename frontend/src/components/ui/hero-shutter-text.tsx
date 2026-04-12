"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface HeroTextProps {
  text?: string;
  className?: string;
}

export default function HeroText({
  text = "VERITAS",
  className = "",
}: HeroTextProps) {
  const [count, setCount] = useState(0);
  const characters = text.split("");

  return (
    <div
      className={`relative flex flex-col items-start justify-center w-full bg-cream transition-colors duration-700 ${className}`}
    >
      <div className="relative z-10 w-full flex flex-col items-start">
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            className="flex flex-nowrap justify-start items-center w-full"
          >
            {characters.map((char, i) => (
              <div key={i} className="relative overflow-hidden group">
                <motion.span
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.04 + 0.3, duration: 0.8 }}
                  className="text-[11vw] sm:text-[9.5vw] md:text-[6.5vw] lg:text-[4.5vw] leading-none font-heading font-black uppercase text-black drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] tracking-tighter"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>

                <motion.span
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "100%", opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.04,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 z-10 bg-cyber-yellow opacity-0"
                />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={() => setCount((c) => c + 1)}
        className="absolute -right-2 -bottom-2 z-20 p-1.5 border-2 border-black bg-cream hover:bg-cyber-yellow transition-colors"
        aria-label="Replay animation"
      >
        <RefreshCw className="w-4 h-4" strokeWidth={3} />
      </button>
    </div>
  );
}
