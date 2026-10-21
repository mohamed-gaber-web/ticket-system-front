import { motion, useReducedMotion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  /** Who is speaking — the assistant ('bot') or the person ('user'). */
  role: 'bot' | 'user';
  children: React.ReactNode;
}

/** One line in the chat transcript, with an entrance animation. */
export function ChatBubble({ role, children }: ChatBubbleProps) {
  const reduce = useReducedMotion();
  const isBot = role === 'bot';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn('flex items-end gap-2', isBot ? 'justify-start' : 'justify-end')}
    >
      {isBot && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
          isBot
            ? 'rounded-bl-md bg-surface-container-high text-on-surface'
            : 'rounded-br-md bg-primary-gradient text-primary-foreground'
        )}
      >
        {children}
      </div>
      {!isBot && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
          <User className="h-4 w-4" />
        </span>
      )}
    </motion.div>
  );
}
