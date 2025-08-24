// app/editor/[id]/editor-client-simple.tsx
// Simplified editor with manual save only

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Components
import DayEditor from './components/day-editor';
import SaveToast from './components/save-toast';

// Actions
import { saveTrip, publishTrip } from './actions-simple';

// Types
import type { TripData, TripDay, Activity } from './types-simple';

interface EditorClientProps {
  initialData: TripData;
}

export default function SimplifiedEditorClient({ initialData }: EditorClientProps) {
  const router = useRouter();
  const [tripData, setTripData] = useState<TripData>(initialData);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSaveToast, setShowSaveToast] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Simple trip update
  const updateTrip = useCallback((updates: Partial<TripData>) => {
    setTripData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Add day
  const addDay = useCallback(() => {
    const newDay: TripDay = {
      id: `temp-${Date.now()}`,
      tripId: tripData.id,
      dayNumber: tripData.days.length + 1,
      title: `Day ${tripData.days.length + 1}`,
      subtitle: null,
      activities: [],
    };
    
    setTripData(prev => ({
      ...prev,
      days: [...prev.days, newDay],
      durationDays: prev.days.length + 1,
    }));
    setHasChanges(true);
  }, [tripData.id, tripData.days.length]);

  // Update day
  const updateDay = useCallback((dayId: string, updates: Partial<TripDay>) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId ? { ...day, ...updates } : day
      ),
    }));
    setHasChanges(true);
  }, []);

  // Delete day
  const deleteDay = useCallback((dayId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days
        .filter(d => d.id !== dayId)
        .map((d, index) => ({ ...d, dayNumber: index + 1 })),
      durationDays: Math.max(1, prev.days.length - 1),
    }));
    setHasChanges(true);
  }, []);

  // Add activity
  const addActivity = useCallback((dayId: string) => {
    const newActivity: Activity = {
      id: `temp-${Date.now()}`,
      dayId,
      timeBlock: 'morning',
      description: '',
      orderIndex: 0,
      gems: [],
    };
    
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            activities: [...(day.activities || []), newActivity],
          };
        }
        return day;
      }),
    }));
    setHasChanges(true);
  }, []);

  // Update activity
  const updateActivity = useCallback((dayId: string, activityId: string, updates: Partial<Activity>) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            activities: day.activities.map(activity =>
              activity.id === activityId ? { ...activity, ...updates } : activity
            ),
          };
        }
        return day;
      }),
    }));
    setHasChanges(true);
  }, []);

  // Delete activity
  const deleteActivity = useCallback((dayId: string, activityId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            activities: day.activities
              .filter(a => a.id !== activityId)
              .map((a, index) => ({ ...a, orderIndex: index })),
          };
        }
        return day;
      }),
    }));
    setHasChanges(true);
  }, []);

  // Handle drag end for reordering days
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tripData.days.findIndex(d => d.id === active.id);
      const newIndex = tripData.days.findIndex(d => d.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDays = [...tripData.days];
        const [removed] = newDays.splice(oldIndex, 1);
        newDays.splice(newIndex, 0, removed);
        
        setTripData(prev => ({
          ...prev,
          days: newDays.map((day, index) => ({ ...day, dayNumber: index + 1 })),
        }));
        setHasChanges(true);
      }
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!hasChanges) return;
    
    setSaveStatus('saving');
    setShowSaveToast(true);
    
    try {
      const result = await saveTrip(tripData);
      
      if (result.success) {
        setSaveStatus('saved');
        setHasChanges(false);
        
        // Update temp IDs if any were returned
        if (result.newIds) {
          setTripData(prev => {
            // Update IDs in the trip data
            let updated = { ...prev };
            
            // Update day IDs
            updated.days = updated.days.map(day => {
              const newDayId = result.newIds![day.id];
              if (newDayId) {
                return {
                  ...day,
                  id: newDayId,
                  activities: day.activities.map(activity => {
                    const newActivityId = result.newIds![activity.id];
                    return newActivityId ? { ...activity, id: newActivityId } : activity;
                  }),
                };
              }
              return day;
            });
            
            return updated;
          });
        }
        
        setTimeout(() => setShowSaveToast(false), 2000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setShowSaveToast(false), 4000);
    }
  };

  // Publish handler
  const handlePublish = async () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Save and publish?')) {
        return;
      }
      await handleSave();
    }
    
    if (confirm('Publish this trip? It will be visible to all users.')) {
      await publishTrip(tripData.id);
      router.push(`/trips/${tripData.id}`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, tripData]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Header Bar */}
      <div className="bg-white border-b border-[var(--color-pencil-gray)] px-6 py-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="font-serif text-lg text-[var(--color-stamp-red)]">
              TripNotes
            </a>
            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-paper)] rounded-full text-xs">
              {hasChanges ? (
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
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
              className={`px-4 py-2 text-sm border rounded transition-colors ${
                hasChanges 
                  ? 'border-[var(--color-stamp-red)] text-[var(--color-stamp-red)] hover:bg-red-50' 
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => router.push(`/preview/${tripData.id}`)}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Preview
            </button>
            <button 
              onClick={handlePublish}
              className="px-4 py-2 text-sm bg-[var(--color-ink)] text-white rounded hover:opacity-90"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Save Toast */}
      {showSaveToast && <SaveToast status={saveStatus === 'saving' ? 'saving' : saveStatus === 'saved' ? 'saved' : 'error'} show={true} />}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded border border-[var(--color-pencil-gray)] shadow-sm">
          {/* Trip Header */}
          <div className="p-6 border-b border-[var(--color-pencil-gray)]">
            <input
              type="text"
              value={tripData.title}
              onChange={(e) => updateTrip({ title: e.target.value })}
              className="w-full text-3xl font-serif text-[var(--color-ink)] bg-transparent border-none outline-none"
              placeholder="Trip Title"
            />
            <input
              type="text"
              value={tripData.subtitle}
              onChange={(e) => updateTrip({ subtitle: e.target.value })}
              className="w-full text-base text-gray-600 bg-transparent border-none outline-none mt-2"
              placeholder="Duration • Season • Budget"
            />
            <textarea
              value={tripData.description || ''}
              onChange={(e) => updateTrip({ description: e.target.value })}
              className="w-full text-base text-gray-700 bg-transparent border-none outline-none mt-4 resize-none min-h-[80px]"
              placeholder="Describe your trip..."
            />
          </div>

          {/* Trip Metadata */}
          <div className="p-6 bg-[var(--color-paper)] border-b border-[var(--color-pencil-gray)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Destination</label>
                <input
                  type="text"
                  value={tripData.destination}
                  onChange={(e) => updateTrip({ destination: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Duration</label>
                <input
                  type="number"
                  value={tripData.durationDays}
                  onChange={(e) => updateTrip({ durationDays: parseInt(e.target.value) || 1 })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={tripData.priceCents / 100}
                  onChange={(e) => updateTrip({ priceCents: (parseInt(e.target.value) || 0) * 100 })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min={5}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select
                  value={tripData.status}
                  onChange={(e) => updateTrip({ status: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          </div>

          {/* Days */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tripData.days.map(d => d.id)} strategy={verticalListSortingStrategy}>
              {tripData.days.map((day) => (
                <DayEditor
                  key={day.id}
                  day={day}
                  onUpdate={(updates) => updateDay(day.id, updates)}
                  onDelete={() => deleteDay(day.id)}
                  onDuplicate={() => console.log('Duplicate day')}
                  onAddActivity={() => addActivity(day.id)}
                  onUpdateActivity={(activityId, updates) => updateActivity(day.id, activityId, updates)}
                  onDeleteActivity={(activityId) => deleteActivity(day.id, activityId)}
                  onDuplicateActivity={() => console.log('Duplicate activity')}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Day Button */}
          <div className="p-6 border-t border-dashed border-gray-300 text-center">
            <button
              onClick={addDay}
              className="px-6 py-3 border border-dashed border-gray-400 rounded hover:border-[var(--color-stamp-red)] hover:text-[var(--color-stamp-red)]"
            >
              + Add Day
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}