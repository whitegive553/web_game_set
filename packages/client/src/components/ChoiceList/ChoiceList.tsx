/**
 * ChoiceList Component
 * Displays available choices as interactive buttons
 */

import React from 'react';
import { Choice } from '../../types/game';
import './ChoiceList.css';

interface ChoiceListProps {
  choices: Choice[];
  onChoiceSelect: (choiceId: string) => void;
  disabled?: boolean;
}

export const ChoiceList: React.FC<ChoiceListProps> = ({
  choices,
  onChoiceSelect,
  disabled = false
}) => {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="choice-list">
      <div className="choice-list__prompt">你将如何行动？</div>

      <div className="choice-list__options">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            className={`choice-button ${choice.warning ? 'choice-button--warning' : ''}`}
            onClick={() => onChoiceSelect(choice.id)}
            disabled={disabled || choice.disabled}
          >
            <div className="choice-button__number">{index + 1}</div>

            <div className="choice-button__content">
              <div className="choice-button__text">{choice.text}</div>

              {choice.warning && (
                <div className="choice-button__warning">
                  <svg
                    className="choice-button__warning-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>{choice.warning}</span>
                </div>
              )}
            </div>

            <div className="choice-button__arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="choice-list__hint">
        提示：你可以按数字键 1-{choices.length} 快速选择
      </div>
    </div>
  );
};
