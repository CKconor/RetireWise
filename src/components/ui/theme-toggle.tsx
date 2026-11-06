'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';

const THEME_OPTIONS = {
  light: { label: 'Light', Icon: Sun, next: 'dark' },
  dark: { label: 'Dark', Icon: Moon, next: 'system' },
  system: { label: 'System', Icon: Monitor, next: 'light' },
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { label, Icon, next } = THEME_OPTIONS[theme];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      title={`Theme: ${label}`}
      aria-label={`Theme: ${label}. Switch theme`}
    >
      <Icon />
    </Button>
  );
}
