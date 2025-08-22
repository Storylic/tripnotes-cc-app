// app/editor/[id]/editor-client.tsx
// Client-side editor using modular components and hooks

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { formatDistanceToNow } from 'date-fns';

// Components
import DayEditor from './components/day-editor';
import SaveToast from './components/save-toast';
import AIPanel from './components/ai-panel';

// Hooks
import { useAutoSave } from './hooks/use-auto-save';
import { useEditorState } from './hooks/use-editor-state';

// Actions
import { saveTrip, publishTrip } from './actions';

// Types - Import from the shared types file
import type { TripData } from './lib/types';

interface EditorClientProps {
  initialData: TripData;
}

export default function EditorClient({ initialData }: EditorClientProps) {
  const router = useRouter();
  const [focusMode, setFocusMode] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Use existing hooks for state management and CRUD operations
  const {
    tripData,
    updateTrip,
    addDay,
    updateDay,
    deleteDay,
    duplicateDay,
    reorderDays,
    addActivity,
    updateActivity,
    deleteActivity,
    duplicateActivity,
    moveActivity,
  } = useEditorState(initialData);

  // Custom save handler that shows toast
  const handleSaveWithToast = async (data: TripData) => {
    setShowSaveToast(true);
    try {
      const result = await saveTrip(data);
      setTimeout(() => setShowSaveToast(false), 2000);
      return result;
    } catch (error) {
      setTimeout(() => setShowSaveToast(false), 4000);
      throw error;
    }
  };

  // Use auto-save hook with toast integration
  const {
    saveStatus,
    lastSaved,
    debouncedSave,
    saveImmediately,
  } = useAutoSave({
    tripData,
    onSave: handleSaveWithToast,
    delay: 2000,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering days
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tripData.days.findIndex(d => d.id === active.id);
      const newIndex = tripData.days.findIndex(d => d.id === over.id);
      
      reorderDays(oldIndex, newIndex);
      debouncedSave();
    }
  };

  // Handle publish action
  const handlePublish = async () => {
    if (window.confirm('Publish this trip? It will be visible to all users.')) {
      updateTrip({ status: 'published' });
      await saveImmediately();
      await publishTrip(tripData.id);
      router.push(`/trips/${tripData.id}`);
    }
  };

  // Trigger auto-save on any update
  const updateTripWithSave = (updates: Partial<TripData>) => {
    updateTrip(updates);
    debouncedSave();
  };

  const updateDayWithSave = (dayId: string, updates: Parameters<typeof updateDay>[1]) => {
    updateDay(dayId, updates);
    debouncedSave();
  };

  const addDayWithSave = () => {
    addDay();
    debouncedSave();
  };

  const deleteDayWithSave = (dayId: string) => {
    deleteDay(dayId);
    debouncedSave();
  };

  const duplicateDayWithSave = (dayId: string) => {
    duplicateDay(dayId);
    debouncedSave();
  };

  const addActivityWithSave = (dayId: string) => {
    addActivity(dayId);
    debouncedSave();
  };

  const updateActivityWithSave = (dayId: string, activityId: string, updates: Parameters<typeof updateActivity>[2]) => {
    updateActivity(dayId, activityId, updates);
    debouncedSave();
  };

  const deleteActivityWithSave = (dayId: string, activityId: string) => {
    deleteActivity(dayId, activityId);
    debouncedSave();
  };

  const duplicateActivityWithSave = (dayId: string, activityId: string) => {
    duplicateActivity(dayId, activityId);
    debouncedSave();
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Header Bar */}
      <div className="bg-white border-b border-[var(--color-pencil-gray)] px-6 py-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="font-serif text-lg text-[var(--color-stamp-red)]">
              TripNotes CC
            </a>
            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-paper)] rounded-full text-xs">
              <span className="text-gray-500">
                Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => saveImmediately()}
              className="px-4 py-2 text-sm border border-[var(--color-pencil-gray)] rounded hover:bg-gray-50"
            >
              Save Draft
            </button>
            <button 
              onClick={() => router.push(`/preview/${tripData.id}`)}
              className="px-4 py-2 text-sm border border-[var(--color-pencil-gray)] rounded hover:bg-gray-50"
            >
              Preview
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className="px-4 py-2 text-sm border border-[var(--color-ai-purple)] text-[var(--color-ai-purple)] rounded hover:bg-purple-50"
            >
              {focusMode ? '👁 Show AI' : '✨ AI Assist'}
            </button>
            <button 
              onClick={handlePublish}
              className="px-4 py-2 text-sm bg-[var(--color-ink)] text-white rounded hover:opacity-90"
            >
              Publish Trip
            </button>
          </div>
        </div>
      </div>

      {/* Save Status Toast */}
      <SaveToast status={saveStatus} show={showSaveToast} />

      {/* Main Content */}
      <div className="flex max-w-[1400px] mx-auto">
        {/* Editor Panel */}
        <div className={`flex-1 ${focusMode ? 'w-full' : ''}`}>
          <div className="bg-white m-6 rounded border border-[var(--color-pencil-gray)] shadow-sm">
            {/* Trip Header */}
            <div className="p-6 border-b border-[var(--color-pencil-gray)]">
              <input
                type="text"
                value={tripData.title}
                onChange={(e) => updateTripWithSave({ title: e.target.value })}
                className="w-full text-3xl font-serif text-[var(--color-ink)] bg-transparent border-none outline-none focus:bg-[var(--color-highlighter)]/10 px-2 -mx-2"
                placeholder="Trip Title"
              />
              <input
                type="text"
                value={tripData.subtitle}
                onChange={(e) => updateTripWithSave({ subtitle: e.target.value })}
                className="w-full text-base text-gray-600 bg-transparent border-none outline-none mt-2 focus:bg-[var(--color-highlighter)]/10 px-2 -mx-2"
                placeholder="Duration • Season • Budget"
              />
              <textarea
                value={tripData.description || ''}
                onChange={(e) => updateTripWithSave({ description: e.target.value })}
                className="w-full text-base text-gray-700 bg-transparent border-none outline-none mt-4 focus:bg-[var(--color-highlighter)]/10 px-2 -mx-2 resize-none min-h-[80px]"
                placeholder="Describe your trip - what makes it special, who it's for, what travelers will experience..."
              />
            </div>

            {/* Trip Essentials */}
            <div className="p-6 bg-[var(--color-paper)] border-b border-[var(--color-pencil-gray)]">
              <h3 className="text-sm font-semibold text-[var(--color-stamp-red)] tracking-wider mb-4">
                TRIP ESSENTIALS
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Destination</label>
                  <input
                    type="text"
                    value={tripData.destination}
                    onChange={(e) => updateTripWithSave({ destination: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[var(--color-pencil-gray)] rounded focus:border-[var(--color-stamp-red)] outline-none"
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Duration</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tripData.durationDays}
                      onChange={(e) => updateTripWithSave({ durationDays: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 px-2 py-1 text-sm border border-[var(--color-pencil-gray)] rounded focus:border-[var(--color-stamp-red)] outline-none"
                      min={1}
                      max={30}
                    />
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Price</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">$</span>
                    <input
                      type="number"
                      value={(tripData.priceCents / 100).toFixed(0)}
                      onChange={(e) =>
                        updateTripWithSave({ priceCents: (parseInt(e.target.value, 10) || 0) * 100 })
                      }
                      className="w-20 px-2 py-1 text-sm border border-[var(--color-pencil-gray)] rounded focus:border-[var(--color-stamp-red)] outline-none"
                      min={5}
                      max={200}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select
                    value={tripData.status}
                    onChange={(e) => updateTripWithSave({ status: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[var(--color-pencil-gray)] rounded focus:border-[var(--color-stamp-red)] outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Days with Drag and Drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tripData.days.map(d => d.id)} strategy={verticalListSortingStrategy}>
                {tripData.days.map((day) => (
                  <DayEditor
                    key={day.id}
                    day={day}
                    onUpdate={(updates) => updateDayWithSave(day.id, updates)}
                    onDelete={() => deleteDayWithSave(day.id)}
                    onDuplicate={() => duplicateDayWithSave(day.id)}
                    onAddActivity={() => addActivityWithSave(day.id)}
                    onUpdateActivity={(activityId, updates) => updateActivityWithSave(day.id, activityId, updates)}
                    onDeleteActivity={(activityId) => deleteActivityWithSave(day.id, activityId)}
                    onDuplicateActivity={(activityId) => duplicateActivityWithSave(day.id, activityId)}
                    onMoveActivity={moveActivity}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add Day Button */}
            <div className="p-6 border-t border-dashed border-[var(--color-pencil-gray)] flex justify-center">
              <button
                onClick={addDayWithSave}
                className="px-6 py-3 border border-dashed border-[var(--color-pencil-gray)] rounded hover:border-[var(--color-stamp-red)] hover:bg-red-50/50 text-gray-600 hover:text-[var(--color-stamp-red)] transition-colors"
              >
                + Add Day
              </button>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-[var(--color-paper)] border-t border-[var(--color-pencil-gray)] flex gap-6 text-xs text-gray-600">
              <div>
                Days:{' '}
                <span className="font-mono font-semibold text-[var(--color-ink)]">
                  {tripData.days.length}
                </span>
              </div>
              <div>
                Price:{' '}
                <span className="font-mono font-semibold text-[var(--color-ink)]">
                  ${(tripData.priceCents / 100).toFixed(0)}
                </span>
              </div>
              <div>
                Status:{' '}
                <span className="font-semibold text-[var(--color-ink)]">{tripData.status}</span>
              </div>
              <div className="ml-auto">
                Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>

        {/* AI Panel */}
        {!focusMode && (
          <div className="w-80 p-6 space-y-4">
            <AIPanel 
              tripId={tripData.id}
              onSuggestionClick={(suggestion) => {
                console.log('Apply AI suggestion:', suggestion);
                // In the future, this could automatically update the trip content
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}