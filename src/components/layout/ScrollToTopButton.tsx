'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-20 right-6 z-40 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 animate-bounce flex items-center justify-center border border-blue-400/40"
    >
      <ChevronUp className="w-6 h-6 stroke-[2.5]" />
    </button>
  );
}
