// app/editor/[id]/components/activity-editor-clean.tsx
// Clean activity editor with essential UX improvements

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity, Gem } from '../lib/types';

interface ActivityEditorProps {
  activity: Activity;
  dayId: string;
  index: number;
  onUpdate: (updates: Partial<Activity>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddGem?: (type: 'hidden_gem' | 'tip' | 'warning') => void;
}

// Smart placeholder text based on time and context
const getSmartPlaceholder = (timeBlock: string, index: number): string => {
  const placeholders: Record<string, string[]> = {
    morning: [
      "Start the day with breakfast at...",
      "Early morning visit to...",
      "Sunrise at..."
    ],
    afternoon: [
      "Explore...",
      "Lunch at...",
      "Afternoon visit to..."
    ],
    evening: [
      "Sunset at...",
      "Dinner at...",
      "Evening walk through..."
    ],
    night: [
      "Experience nightlife at...",
      "Late night food at...",
      "Night market at..."
    ],
    'all-day': [
      "Full day trip to...",
      "Day excursion to...",
      "All-day adventure at..."
    ]
  };
  
  const options = placeholders[timeBlock] || placeholders.morning;
  return options[index % options.length];
};

export default function CleanActivityEditor({
  activity,
  dayId,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddGem,
}: ActivityEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag and drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: activity.id,
    data: {
      type: 'activity',
      activity,
      dayId,
      index,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Clean auto-resize without animation jank
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [activity.description]);

  // Handle textarea changes with auto-resize
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    
    onUpdate({ description: value });
    
    // Detect quick action triggers
    if (lastChar === '@' && onAddGem) {
      setShowQuickActions(true);
    } else if (lastChar === '/') {
      setShowQuickActions(true);
    } else {
      setShowQuickActions(false);
    }
    
    // Immediate resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [onUpdate, onAddGem]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case 'd':
            e.preventDefault();
            onDuplicate();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDuplicate]);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        p-4 bg-white rounded
        border border-[var(--color-pencil-gray)]
        ${isDragging ? 'z-50 shadow-lg' : 'hover:shadow-sm'}
        transition-shadow duration-200
      `}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-move p-1 hover:bg-gray-100 rounded mt-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
            <path d="M2 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM2 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
          </svg>
        </div>

        <div className="flex-1">
          {/* Time Block Selector - Fixed width to prevent cutoff */}
          <select
            value={activity.timeBlock}
            onChange={(e) => onUpdate({ timeBlock: e.target.value })}
            className="text-xs font-semibold tracking-wider text-[var(--color-stamp-red)] bg-transparent border-none outline-none mb-2 cursor-pointer w-auto min-w-[100px]"
          >
            <option value="morning">MORNING</option>
            <option value="afternoon">AFTERNOON</option>
            <option value="evening">EVENING</option>
            <option value="night">NIGHT</option>
            <option value="all-day">ALL DAY</option>
          </select>

          {/* Activity Description */}
          <textarea
            ref={textareaRef}
            value={activity.description}
            onChange={handleTextareaChange}
            className="w-full bg-transparent border-none outline-none resize-none min-h-[60px] overflow-hidden"
            placeholder={getSmartPlaceholder(activity.timeBlock, index)}
            style={{ lineHeight: '1.6' }}
          />
          
          {/* Quick Actions Palette */}
          {showQuickActions && onAddGem && (
            <div className="mt-2 bg-white border border-[var(--color-pencil-gray)] rounded shadow-md p-1">
              <button 
                onClick={() => {
                  onAddGem('hidden_gem');
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
              >
                💎 Add Hidden Gem
              </button>
              <button 
                onClick={() => {
                  onAddGem('tip');
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
              >
                💡 Add Pro Tip
              </button>
              <button 
                onClick={() => {
                  onAddGem('warning');
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
              >
                ⚠️ Add Warning
              </button>
            </div>
          )}
          
          {/* Gems Display - Cleaner version */}
          {activity.gems?.map((gem: Gem) => (
            <div 
              key={gem.id} 
              className="mt-4 pl-4 border-l-[3px] p-3 bg-gray-50 rounded-r"
              style={{
                borderColor: gem.gemType === 'hidden_gem' ? '#E8967A' : 
                            gem.gemType === 'tip' ? '#4A90E2' : '#F5A623',
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg mt-[-2px]">
                  {gem.gemType === 'hidden_gem' ? '💎' : 
                   gem.gemType === 'tip' ? '💡' : '⚠️'}
                </span>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 font-semibold mb-1 uppercase tracking-wider">
                    {gem.gemType.replace('_', ' ')}
                  </div>
                  <div className="font-semibold text-gray-900 mb-1">
                    {gem.title}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {gem.description}
                  </div>
                  {gem.insiderInfo && (
                    <div className="text-xs text-gray-500 mt-2 italic">
                      💡 {gem.insiderInfo}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => console.log('Delete gem:', gem.id)}
                  className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Delete gem"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Actions Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Activity options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
              <path d="M8 6.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 14.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
            </svg>
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded border border-[var(--color-pencil-gray)] shadow-lg z-20">
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>📋</span> Duplicate Activity
                </button>
                {onAddGem && (
                  <>
                    <button
                      onClick={() => {
                        onAddGem('hidden_gem');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>💎</span> Add Hidden Gem
                    </button>
                    <button
                      onClick={() => {
                        onAddGem('tip');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>💡</span> Add Pro Tip
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    console.log('Add location');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>📍</span> Add Location
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this activity?')) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2 border-t border-gray-100"
                >
                  <span>🗑️</span> Delete Activity
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}