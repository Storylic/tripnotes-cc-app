// app/editor/[id]/components/day-editor.tsx
// Day editor component with delete, duplicate, and reorder functionality

'use client';

import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ActivityEditor from './activity-editor';
import type { TripDay, Activity } from '../lib/types';

interface DayEditorProps {
  day: TripDay;
  onUpdate: (updates: Partial<TripDay>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddActivity: () => void;
  onUpdateActivity: (activityId: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (activityId: string) => void;
  onDuplicateActivity: (activityId: string) => void;
  onMoveActivity?: (activityId: string, targetDayId: string, targetIndex: number) => void;
}

export default function DayEditor({
  day,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onDuplicateActivity,
  // onMoveActivity is optional for future implementation
}: DayEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drag and drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`border-b border-[var(--color-pencil-gray)] ${isDragging ? 'z-50' : ''}`}
    >
      {/* Day Header */}
      <div 
        className="p-4 bg-[var(--color-paper)] cursor-pointer hover:bg-[var(--color-paper)]/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-move p-1 hover:bg-gray-100 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
                <path d="M2 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM2 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
              </svg>
            </div>

            {/* Day Number */}
            <span className="w-10 h-10 bg-[var(--color-stamp-red)] text-white rounded flex items-center justify-center font-bold">
              {day.dayNumber}
            </span>

            {/* Day Title */}
            <input
              type="text"
              value={day.title}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate({ title: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-base font-semibold bg-transparent border-none outline-none flex-1"
              placeholder="Day Title"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse */}
            <div className="p-1">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="currentColor"
                className={`transform transition-transform text-gray-400 ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M8 10.5l-4-4h8l-4 4z"/>
              </svg>
            </div>

            {/* Day Actions Menu */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-7 h-7 border border-[var(--color-pencil-gray)] bg-white rounded hover:bg-gray-50 text-xs"
              >
                ⋮
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div 
                    ref={menuRef}
                    className="absolute right-0 mt-1 w-48 bg-white rounded border border-[var(--color-pencil-gray)] shadow-lg z-20"
                  >
                    <button
                      onClick={() => {
                        onDuplicate();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>📋</span> Duplicate Day
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${day.title}"? This will remove all activities in this day.`)) {
                          onDelete();
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2 border-t border-gray-100"
                    >
                      <span>🗑️</span> Delete Day
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day Content */}
      {expanded && (
        <div className="p-6">
          {/* Day Subtitle */}
          <input
            type="text"
            value={day.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            className="w-full text-sm text-gray-600 bg-transparent border-none outline-none mb-4"
            placeholder="Day subtitle or description..."
          />

          {/* Activities */}
          <div className="space-y-4">
            {day.activities?.map((activity, index) => (
              <ActivityEditor
                key={activity.id}
                activity={activity}
                dayId={day.id}
                index={index}
                onUpdate={(updates) => onUpdateActivity(activity.id, updates)}
                onDelete={() => onDeleteActivity(activity.id)}
                onDuplicate={() => onDuplicateActivity(activity.id)}
                // onMove={(targetDayId, targetIndex) => 
                //   onMoveActivity(activity.id, targetDayId, targetIndex)
                // }
              />
            ))}
            
            {(!day.activities || day.activities.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <p className="mb-4">No activities yet</p>
                <button
                  onClick={onAddActivity}
                  className="px-4 py-2 border border-dashed border-[var(--color-pencil-gray)] rounded hover:border-[var(--color-stamp-red)] hover:text-[var(--color-stamp-red)]"
                >
                  Add First Activity
                </button>
              </div>
            )}
          </div>

          {/* Add element buttons */}
          {day.activities && day.activities.length > 0 && (
            <div className="flex gap-2 mt-6 pt-6 border-t border-dashed border-[var(--color-pencil-gray)]">
              <button 
                onClick={onAddActivity}
                className="px-3 py-1.5 text-xs border border-dashed border-[var(--color-pencil-gray)] rounded hover:border-[var(--color-stamp-red)] hover:text-[var(--color-stamp-red)]"
              >
                + Activity
              </button>
              <button className="px-3 py-1.5 text-xs border border-dashed border-[var(--color-pencil-gray)] rounded hover:border-[var(--color-stamp-red)] hover:text-[var(--color-stamp-red)]">
                + Hidden gem
              </button>
              <button className="px-3 py-1.5 text-xs border border-dashed border-[var(--color-pencil-gray)] rounded hover:border-[var(--color-stamp-red)] hover:text-[var(--color-stamp-red)]">
                + Photo spot
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}