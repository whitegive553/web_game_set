/**
 * NarrativeBox Component
 * Displays story narrative text with optional typewriter effect
 */

import React, { useState, useEffect } from 'react';
import { Narrative } from '../../types/game';
import './NarrativeBox.css';

interface NarrativeBoxProps {
  narrative: Narrative | null;
  enableTypewriter?: boolean;
  typingSpeed?: number;
}

export const NarrativeBox: React.FC<NarrativeBoxProps> = ({
  narrative,
  enableTypewriter = false,
  typingSpeed = 50
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!narrative) {
      setDisplayedText('');
      return;
    }

    if (!enableTypewriter) {
      setDisplayedText(narrative.text);
      return;
    }

    // Typewriter effect
    setIsTyping(true);
    setDisplayedText('');

    let currentIndex = 0;
    const text = narrative.text;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [narrative, enableTypewriter, typingSpeed]);

  if (!narrative) {
    return (
      <div className="narrative-box">
        <div className="narrative-box__content">
          <div className="narrative-box__empty">等待加载...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="narrative-box">
      {/* Speaker Tag */}
      {narrative.speaker && (
        <div className="narrative-box__speaker">
          <div className="narrative-box__speaker-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className="narrative-box__speaker-name">{narrative.speaker}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="narrative-box__content">
        <div className="narrative-box__text">
          {displayedText}
          {isTyping && <span className="narrative-box__cursor">_</span>}
        </div>
      </div>

      {/* Progress Indicator */}
      {isTyping && (
        <div className="narrative-box__typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
    </div>
  );
};
