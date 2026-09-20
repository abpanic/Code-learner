"use client";

import { useEffect } from "react";

export function NavigationReset() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "auto" });
  }, []);
  return null;
}
