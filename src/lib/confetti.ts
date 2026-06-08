import confetti from "canvas-confetti";

const BLUE = ["#3b82f6", "#38bdf8", "#6366f1", "#22d3ee", "#a855f7", "#ffffff"];

/** Celebración grande (meta diaria cumplida). */
export function celebrate() {
  const end = Date.now() + 900;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: BLUE,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: BLUE,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 38,
    origin: { y: 0.6 },
    colors: BLUE,
  });
}

/** Estallido chico (logro desbloqueado). */
export function burst() {
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: { y: 0.7 },
    colors: BLUE,
  });
}
