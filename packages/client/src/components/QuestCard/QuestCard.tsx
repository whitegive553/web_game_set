/**
 * Quest Card - Flippable card showing quest details
 */

import React, { useState } from 'react';
import { QuestResult } from '@survival-game/shared';
import './QuestCard.css';

interface QuestCardProps {
  questNumber: number;
  teamSize: number;
  result?: QuestResult;
  getPlayerName: (userId: string) => string;
}

export const QuestCard: React.FC<QuestCardProps> = ({ questNumber, teamSize, result, getPlayerName }) => {
  const [flipped, setFlipped] = useState(false);

  const handleClick = () => {
    // Only allow flip if quest is completed
    if (result) {
      setFlipped(!flipped);
    }
  };

  return (
    <div
      className={`quest-card ${result ? 'completed' : 'pending'} ${flipped ? 'flipped' : ''}`}
      onClick={handleClick}
    >
      <div className="quest-card-inner">
        {/* Front of card */}
        <div className="quest-card-front">
          <div className="quest-number">{teamSize}</div>
          {result && (
            <div className={`quest-result ${result.success ? 'success' : 'fail'}`}>
              {result.success ? '✓' : '✗'}
            </div>
          )}
          {result && <div className="flip-hint">点击查看详情</div>}
        </div>

        {/* Back of card */}
        {result && (
          <div className="quest-card-back">
            <div className="card-header">
              <h4>任务 {questNumber}</h4>
              <div className={`result-badge ${result.success ? 'success' : 'fail'}`}>
                {result.success ? '成功' : '失败'}
              </div>
            </div>

            <div className="card-content">
              {/* Final quest team */}
              <div className="section">
                <h5>✅ 最终车队</h5>
                <div className="player-list">
                  {result.team.map(userId => (
                    <span key={userId} className="player-tag">{getPlayerName(userId)}</span>
                  ))}
                </div>
              </div>

              {/* Quest vote results */}
              <div className="section">
                <h5>🗳️ 任务投票</h5>
                <div className="vote-stats">
                  <span className="vote-count success">{result.successVotes} 成功</span>
                  <span className="vote-count fail">{result.failVotes} 失败</span>
                </div>
              </div>

              {/* Team vote history */}
              {result.teamVoteHistory && result.teamVoteHistory.length > 0 && (
                <div className="section">
                  <h5>📋 车队提名历史</h5>
                  {result.teamVoteHistory.map((vote, index) => (
                    <div key={index} className={`vote-round ${vote.passed ? 'passed' : 'rejected'}`}>
                      <div className="vote-round-header">
                        <span className="round-number">第 {index + 1} 次提名</span>
                        <span className={`round-result ${vote.passed ? 'passed' : 'rejected'}`}>
                          {vote.passed ? '✓ 通过' : '✗ 否决'}
                        </span>
                      </div>
                      <div className="vote-details">
                        <div className="nominated-team">
                          <strong>候选车队：</strong>
                          {vote.nominatedTeam.map(userId => (
                            <span key={userId} className="player-tag small">{getPlayerName(userId)}</span>
                          ))}
                        </div>
                        <div className="all-votes">
                          <strong>车队投票（公开）：</strong>
                          <div className="vote-grid">
                            {vote.approvals.map(userId => (
                              <div key={userId} className="vote-item approve">
                                <span className="player-name">{getPlayerName(userId)}</span>
                                <span className="vote-badge">同意</span>
                              </div>
                            ))}
                            {vote.rejections.map(userId => (
                              <div key={userId} className="vote-item reject">
                                <span className="player-name">{getPlayerName(userId)}</span>
                                <span className="vote-badge">反对</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flip-hint">点击返回</div>
          </div>
        )}
      </div>
    </div>
  );
};
