import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      style={{
        width: 52,
        height: 28,
        borderRadius: 999,
        border: '1px solid var(--border-color)',
        background: isDark ? 'var(--navy)' : '#e2e5eb',
        position: 'relative',
        cursor: 'pointer',
        padding: 2,
        transition: 'background 0.2s ease',
      }}
    >
      <span
        style={{
          display: 'block',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: isDark ? 'translateX(24px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  );
}