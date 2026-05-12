"use client";

import { useEffect } from "react";

export function BufferPolyfill() {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Buffer) {
      import("buffer").then((buf) => {
        (window as any).Buffer = buf.Buffer;
      });
    }
  }, []);
  return null;
}
