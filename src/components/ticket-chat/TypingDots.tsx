import { motion, useReducedMotion } from 'framer-motion';

/** Three bouncing dots shown while the assistant is "thinking". */
export function TypingDots() {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-on-surface-variant/70"
          animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}
