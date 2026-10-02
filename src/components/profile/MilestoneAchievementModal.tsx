'use client';

import { useState, useEffect } from 'react';
import { getMemberBadge, MemberBadge } from '@/lib/badges';
import { Award, Sparkles, X, ArrowRight } from 'lucide-react';

interface MilestoneAchievementModalProps {
  memberSince?: string | null;
  userName?: string;
}

export default function MilestoneAchievementModal({ memberSince, userName = 'Citizen' }: MilestoneAchievementModalProps) {
  const [activeMilestone, setActiveMilestone] = useState<MemberBadge | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!memberSince) return;

    try {
      const { badge, daysActive } = getMemberBadge(memberSince);
      const ackRaw = localStorage.getItem('voxpolis_acknowledged_milestones') || '[]';
      const acknowledged: string[] = JSON.parse(ackRaw);

      // Check milestones in order of achievement
      const milestonesToCheck = [
        { id: 'statesman_1yr', badgeId: 'statesman', minDays: 365 },
        { id: 'senior_6mo', badgeId: 'senior_advocate', minDays: 180 },
        { id: 'contributor_3mo', badgeId: 'contributor', minDays: 90 },
        { id: 'standard_1mo', badgeId: 'standard', minDays: 30 },
      ];

      for (const m of milestonesToCheck) {
        if (daysActive >= m.minDays && !acknowledged.includes(m.id)) {
          setActiveMilestone(badge);
          setIsOpen(true);
          break;
        }
      }
    } catch {}
  }, [memberSince]);

  const handleDismiss = () => {
    if (activeMilestone) {
      try {
        const ackRaw = localStorage.getItem('voxpolis_acknowledged_milestones') || '[]';
        const acknowledged: string[] = JSON.parse(ackRaw);
        if (!acknowledged.includes(activeMilestone.id)) {
          acknowledged.push(activeMilestone.id);
          localStorage.setItem('voxpolis_acknowledged_milestones', JSON.stringify(acknowledged));
        }
      } catch {}
    }
    setIsOpen(false);
  };

  if (!isOpen || !activeMilestone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30">
          {activeMilestone.icon}
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Civic Milestone Unlocked</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            Congratulations, {userName}!
          </h2>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            You graduated to {activeMilestone.name} ({activeMilestone.icon})
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 space-y-2">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed">
            "{activeMilestone.quote}"
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {activeMilestone.description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Claim Badge & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
