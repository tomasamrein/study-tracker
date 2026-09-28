import confetti from "canvas-confetti";

const MONO = ["#ffffff", "#e5e5e5", "#a3a3a3", "#525252", "#171717"];

/** Celebración grande (meta diaria cumplida). */
export function celebrate() {
  const end = Date.now() + 900;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: MONO,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: MONO,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 38,
    origin: { y: 0.6 },
    colors: MONO,
  });
}

/** Estallido chico (logro desbloqueado). */
export function burst() {
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: { y: 0.7 },
    colors: MONO,
  });
}
