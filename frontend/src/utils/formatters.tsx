import type { CaseDifficulty } from '../types';

export function DifficultyBadge({ difficulty }: { difficulty: CaseDifficulty }) {
  const classes: Record<CaseDifficulty, string> = {
    beginner: 'badge-beginner',
    intermediate: 'badge-intermediate',
    advanced: 'badge-advanced',
  };
  return <span className={classes[difficulty]}>{difficulty}</span>;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function getPersonalityDescription(personality: string): string {
  const map: Record<string, string> = {
    calm: 'Calm & Cooperative',
    anxious: 'Anxious & Worried',
    talkative: 'Talkative & Detailed',
    quiet: 'Reserved & Brief',
    confused: 'Somewhat Confused',
    frustrated: 'Frustrated',
  };
  return map[personality] || personality;
}
