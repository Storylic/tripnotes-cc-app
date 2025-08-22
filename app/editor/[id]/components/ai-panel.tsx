// app/editor/[id]/components/ai-panel.tsx
// AI suggestions panel component

'use client';

import { useState } from 'react';

interface AIPanelProps {
  tripId?: string;
  onSuggestionClick?: (suggestion: string) => void;
}

export default function AIPanel({ tripId, onSuggestionClick }: AIPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample suggestions - in production these would come from AI
  const suggestions = [
    'Add TeamLab Borderless closing info',
    'Include JR Pass cost comparison',
    'Add vegetarian options',
    'Mention cherry blossom spots for spring',
    'Include luggage storage locations',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      console.log('Apply suggestion:', suggestion);
    }
  };

  const handleGenerateMore = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      console.log('Generated more suggestions for trip:', tripId);
    }, 1500);
  };

  return (
    <div className="bg-white rounded border border-[var(--color-pencil-gray)] shadow-sm overflow-hidden">
      <div 
        className="p-3 bg-[var(--color-paper)] border-b border-[var(--color-pencil-gray)] flex items-center justify-between cursor-pointer hover:bg-[var(--color-paper)]/80 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="w-4 h-4 bg-[var(--color-ai-purple)] text-white rounded text-[10px] flex items-center justify-center">
            ✨
          </span>
          <span>AI Suggestions</span>
        </div>
        <span className={`text-xs transition-transform ${collapsed ? '' : 'rotate-180'}`}>
          ▼
        </span>
      </div>
      
      {!collapsed && (
        <div className="p-4 text-sm space-y-3">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-2 bg-[var(--color-paper)] rounded cursor-pointer hover:bg-purple-50 hover:border-l-2 hover:border-[var(--color-ai-purple)] transition-all"
            >
              {suggestion}
            </div>
          ))}
          
          <button 
            onClick={handleGenerateMore}
            disabled={isGenerating}
            className="w-full py-2 text-xs bg-white border border-[var(--color-ai-purple)] text-[var(--color-ai-purple)] rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-[var(--color-ai-purple)] border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}