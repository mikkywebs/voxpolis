export interface MemberBadge {
  id: string;
  name: string;
  shortLabel: string;
  icon: string;
  tierLevel: number;
  minDays: number;
  maxDays: number;
  quote: string;
  description: string;
  nextMilestoneDays?: number;
  nextBadgeName?: string;
}

export const MEMBER_BADGES: MemberBadge[] = [
  {
    id: 'newbie',
    name: 'Newbie Citizen',
    shortLabel: 'Newbie',
    icon: '🌱',
    tierLevel: 1,
    minDays: 0,
    maxDays: 29,
    quote: 'Every great democracy is built on the voices of citizens who dare to care. Welcome to the public square!',
    description: 'Welcome to Voxpolis! You are taking your first steps in independent civic observation.',
    nextMilestoneDays: 30,
    nextBadgeName: 'Standard Civic Member',
  },
  {
    id: 'standard',
    name: 'Standard Civic Member',
    shortLabel: 'Civic Member',
    icon: '🏛️',
    tierLevel: 2,
    minDays: 30,
    maxDays: 89,
    quote: 'One month of active civic vigilance. An informed citizen is a nation\'s greatest safeguard.',
    description: '1 month milestone reached. Consistent participation in governance oversight and public discourse.',
    nextMilestoneDays: 90,
    nextBadgeName: 'Policy Contributor',
  },
  {
    id: 'contributor',
    name: 'Policy Contributor',
    shortLabel: 'Contributor',
    icon: '⭐',
    tierLevel: 3,
    minDays: 90,
    maxDays: 179,
    quote: 'Three months of steadfast engagement. Thoughtful analysis elevates public debate across borders.',
    description: 'Quarter-year milestone. A trusted regular contributor to civic sentiment and policy polling.',
    nextMilestoneDays: 180,
    nextBadgeName: 'Senior Advocate',
  },
  {
    id: 'senior_advocate',
    name: 'Senior Civic Advocate',
    shortLabel: 'Senior Advocate',
    icon: '🏅',
    tierLevel: 4,
    minDays: 180,
    maxDays: 364,
    quote: 'Half a year of public interest vigilance. True accountability begins with citizens who never look away.',
    description: '6 months milestone. Distinguished civic monitor recognized for balanced perspectives.',
    nextMilestoneDays: 365,
    nextBadgeName: 'Distinguished Statesman',
  },
  {
    id: 'statesman',
    name: 'Distinguished Statesman',
    shortLabel: 'Statesman',
    icon: '👑',
    tierLevel: 5,
    minDays: 365,
    maxDays: 99999,
    quote: 'One full year of dedicated democratic observation. A vital pillar of the global civic forum.',
    description: '1 year milestone. Veteran member of Voxpolis with premier democratic standing.',
  },
];

export function getMemberBadge(memberSinceIso?: string | null): {
  badge: MemberBadge;
  daysActive: number;
  progressPercent: number;
} {
  let daysActive = 1;
  if (memberSinceIso) {
    try {
      const start = new Date(memberSinceIso).getTime();
      const now = Date.now();
      const diffDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
      daysActive = diffDays;
    } catch {
      daysActive = 1;
    }
  }

  const currentBadge =
    MEMBER_BADGES.find((b) => daysActive >= b.minDays && daysActive <= b.maxDays) ||
    MEMBER_BADGES[0];

  let progressPercent = 100;
  if (currentBadge.nextMilestoneDays) {
    const range = currentBadge.nextMilestoneDays - currentBadge.minDays;
    const currentInRange = daysActive - currentBadge.minDays;
    progressPercent = Math.min(100, Math.max(10, Math.round((currentInRange / range) * 100)));
  }

  return { badge: currentBadge, daysActive, progressPercent };
}
