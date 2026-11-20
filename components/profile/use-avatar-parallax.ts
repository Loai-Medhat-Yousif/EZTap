"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribeReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The mouse-following / tilt parallax for the avatar, plus the fade-in
 * fallback on touch devices (where there is no pointer to follow) and a
 * full no-op under prefers-reduced-motion. Shared by the profile and
 * store public pages so the two stay visually identical.
 */
export function useAvatarParallax<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const isTouchDevice =
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouchDevice) {
      const avatar = ref.current;
      if (avatar) {
        avatar.classList.add("avatar-fade-in");
      }
      return;
    }

    let rafId: number;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const animate = () => {
      targetX += (mouseX - targetX) * 0.1;
      targetY += (mouseY - targetY) * 0.1;

      const maxOffset = 14;
      const x = targetX * maxOffset;
      const y = targetY * maxOffset;
      const tilt = targetX * 2;

      if (ref.current) {
        ref.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  return ref;
}
