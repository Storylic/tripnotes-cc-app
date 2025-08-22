// app/editor/[id]/components/activity-editor.tsx
// Activity editor component with delete, duplicate, and move functionality

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity } from '../lib/types';

interface ActivityEditorProps {
  activity: Activity;
  dayId: string;
  index: number;
  onUpdate: (updates: Partial<Activity>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  // onMove: (targetDayId: string, targetIndex: number) => void; // Uncomment when implementing drag between days
}

export default function ActivityEditor({
  activity,
  dayId,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  // onMove, // Uncomment when implementing drag between days
}: ActivityEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [activity.description]);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-[var(--color-paper)] rounded border border-[var(--color-pencil-gray)] ${
        isDragging ? 'z-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-move p-1 hover:bg-gray-100 rounded mt-1"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
            <path d="M2 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM2 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
          </svg>
        </div>

        <div className="flex-1">
          {/* Time Block Selector */}
          <select
            value={activity.timeBlock}
            onChange={(e) => onUpdate({ timeBlock: e.target.value })}
            className="text-xs font-semibold tracking-wider text-[var(--color-stamp-red)] bg-transparent border-none outline-none mb-2 cursor-pointer"
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
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent border-none outline-none resize-none min-h-[60px]"
            placeholder="Describe this activity..."
          />
          
          {/* Gems */}
          {activity.gems?.map((gem) => (
            <div 
              key={gem.id} 
              className="mt-4 pl-4 border-l-3 border-[var(--color-stamp-red)] bg-gradient-to-r from-[var(--color-highlighter)]/20 to-transparent p-3 rounded"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs text-[var(--color-stamp-red)] font-semibold mb-1">
                    {gem.gemType === 'hidden_gem' ? 'HIDDEN GEM' : 
                     gem.gemType === 'tip' ? 'PRO TIP' : 'WARNING'}
                  </div>
                  <div className="font-semibold text-[var(--color-stamp-red)]">{gem.title}</div>
                  <div className="text-sm mt-1">{gem.description}</div>
                </div>
                <button 
                  onClick={() => console.log('Delete gem:', gem.id)}
                  className="ml-2 text-gray-400 hover:text-red-600"
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
                <button
                  onClick={() => {
                    console.log('Add gem to activity');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>💎</span> Add Hidden Gem
                </button>
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