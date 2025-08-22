// app/editor/[id]/editor-client-fixed.tsx
// Fixed client-side editor with proper deletion tracking

'use client';

import { useState, useCallback, useEffect } from 'react';
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

// Types
import type { TripData } from './lib/types';

interface EditorClientProps {
  initialData: TripData;
}

export default function EditorClient({ initialData }: EditorClientProps) {
  const router = useRouter();
  const [focusMode, setFocusMode] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use existing hooks for state management
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

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [tripData]);

  // Custom save handler that shows toast
  const handleSaveWithToast = async (data: TripData) => {
    setShowSaveToast(true);
    try {
      const result = await saveTrip(data);
      setHasUnsavedChanges(false);
      setTimeout(() => setShowSaveToast(false), 2000);
      
      // Force router refresh after successful save
      router.refresh();
      
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
      // Save immediately before publishing
      await saveImmediately();
      await publishTrip(tripData.id);
      router.push(`/trips/${tripData.id}`);
    }
  };

  // Enhanced update functions that properly trigger auto-save
  const updateTripWithSave = useCallback((updates: Partial<TripData>) => {
    updateTrip(updates);
    debouncedSave();
  }, [updateTrip, debouncedSave]);

  const updateDayWithSave = useCallback((dayId: string, updates: Parameters<typeof updateDay>[1]) => {
    updateDay(dayId, updates);
    debouncedSave();
  }, [updateDay, debouncedSave]);

  const addDayWithSave = useCallback(() => {
    addDay();
    debouncedSave();
  }, [addDay, debouncedSave]);

  const deleteDayWithSave = useCallback((dayId: string) => {
    deleteDay(dayId);
    // Force immediate save for deletions
    saveImmediately();
  }, [deleteDay, saveImmediately]);

  const duplicateDayWithSave = useCallback((dayId: string) => {
    duplicateDay(dayId);
    debouncedSave();
  }, [duplicateDay, debouncedSave]);

  const addActivityWithSave = useCallback((dayId: string) => {
    addActivity(dayId);
    debouncedSave();
  }, [addActivity, debouncedSave]);

  const updateActivityWithSave = useCallback((dayId: string, activityId: string, updates: Parameters<typeof updateActivity>[2]) => {
    updateActivity(dayId, activityId, updates);
    debouncedSave();
  }, [updateActivity, debouncedSave]);

  // IMPORTANT: Use immediate save for deletions
  const deleteActivityWithSave = useCallback((dayId: string, activityId: string) => {
    console.log('Deleting activity:', activityId, 'from day:', dayId);
    deleteActivity(dayId, activityId);
    // Force immediate save for deletions instead of debounced
    saveImmediately();
  }, [deleteActivity, saveImmediately]);

  const duplicateActivityWithSave = useCallback((dayId: string, activityId: string) => {
    duplicateActivity(dayId, activityId);
    debouncedSave();
  }, [duplicateActivity, debouncedSave]);

  // Manual save that forces immediate save
  const handleManualSave = useCallback(async () => {
    console.log('Manual save triggered');
    await saveImmediately();
  }, [saveImmediately]);

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
              {saveStatus === 'saving' ? (
                <>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Unsaved changes</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>All changes saved</span>
                </>
              )}
              <span className="text-gray-500 ml-2">
                {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 text-sm border border-[var(--color-pencil-gray)] rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              onClick={() => {
                // Save before preview
                saveImmediately().then(() => {
                  router.push(`/preview/${tripData.id}`);
                });
              }}
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
          </div>
        </div>

        {/* AI Panel */}
        {!focusMode && (
          <div className="w-80 p-6 space-y-4">
            <AIPanel 
              tripId={tripData.id}
              onSuggestionClick={(suggestion) => {
                console.log('Apply AI suggestion:', suggestion);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}