/**
 * AI Agent Page
 * SSE 流式输出验证页面
 */

import React, { useState, useRef, useEffect } from 'react';
import './AIAgentPage.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAgentPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamContent]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setCurrentStreamContent('');

    try {
      const response = await fetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'content') {
                  assistantContent += data.content + ' ';
                  setCurrentStreamContent(assistantContent);
                } else if (data.type === 'done') {
                  // 流式输出完成
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: assistantContent.trim() },
                  ]);
                  setCurrentStreamContent('');
                  setIsStreaming(false);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during streaming:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '错误: 无法连接到 AI 服务',
        },
      ]);
      setCurrentStreamContent('');
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-agent-page">
      <div className="ai-agent-header">
        <h1>AI Agent 演示</h1>
        <p>SSE 流式输出验证</p>
      </div>

      <div className="ai-agent-chat-container">
        <div className="ai-agent-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ai-agent-message ai-agent-message-${msg.role}`}>
              <div className="ai-agent-message-role">
                {msg.role === 'user' ? '用户' : 'AI'}
              </div>
              <div className="ai-agent-message-content">{msg.content}</div>
            </div>
          ))}

          {isStreaming && currentStreamContent && (
            <div className="ai-agent-message ai-agent-message-assistant ai-agent-message-streaming">
              <div className="ai-agent-message-role">AI</div>
              <div className="ai-agent-message-content">
                {currentStreamContent}
                <span className="ai-agent-cursor">▋</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="ai-agent-input-container">
          <textarea
            className="ai-agent-input"
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isStreaming}
            rows={3}
          />
          <button
            className="ai-agent-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
          >
            {isStreaming ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgentPage;
