// app/editor/[id]/hooks/use-granular-editor.ts
// Editor hook that tracks granular changes for optimized saving

import { useState, useCallback, useRef } from 'react';
import type { TripData, TripDay, Activity } from '../lib/types';
import { saveGranularChanges, saveActivityOnly, saveDayMetadata } from '../actions-granular';

interface ChangeTracker {
  metadata: Set<string>;
  days: {
    added: Set<string>;
    updated: Set<string>;
    deleted: Set<string>;
  };
  activities: {
    added: Set<string>;
    updated: Set<string>;
    deleted: Set<string>;
  };
}

export function useGranularEditor(initialData: TripData) {
  const [tripData, setTripData] = useState(initialData);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track what has changed
  const changes = useRef<ChangeTracker>({
    metadata: new Set(),
    days: {
      added: new Set(),
      updated: new Set(),
      deleted: new Set(),
    },
    activities: {
      added: new Set(),
      updated: new Set(),
      deleted: new Set(),
    },
  });

  // Track original data for comparison
  const originalData = useRef(initialData);

  /**
   * Update trip metadata
   */
  const updateMetadata = useCallback((field: string, value: any) => {
    setTripData(prev => ({
      ...prev,
      [field]: value,
    }));
    changes.current.metadata.add(field);
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Update activity with instant save (for typing)
   */
  const updateActivityInstant = useCallback(async (
    dayId: string,
    activityId: string,
    updates: Partial<Activity>
  ) => {
    // Update local state immediately
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day =>
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.map(activity =>
                activity.id === activityId
                  ? { ...activity, ...updates }
                  : activity
              ),
            }
          : day
      ),
    }));
    
    // Save just this activity in background (ultra-fast)
    if (!activityId.startsWith('temp-')) {
      saveActivityOnly(tripData.id, activityId, updates).catch(console.error);
    } else {
      // Track as new activity
      changes.current.activities.added.add(activityId);
      setHasUnsavedChanges(true);
    }
  }, [tripData.id]);

  /**
   * Update day metadata with instant save
   */
  const updateDayInstant = useCallback(async (
    dayId: string,
    updates: { title?: string; subtitle?: string | null }
  ) => {
    // Update local state immediately
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day =>
        day.id === dayId ? { ...day, ...updates } : day
      ),
    }));
    
    // Save just this day metadata in background
    if (!dayId.startsWith('temp-')) {
      saveDayMetadata(tripData.id, dayId, updates).catch(console.error);
    } else {
      changes.current.days.added.add(dayId);
      setHasUnsavedChanges(true);
    }
  }, [tripData.id]);

  /**
   * Add new day
   */
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
    
    changes.current.days.added.add(newDay.id);
    setHasUnsavedChanges(true);
    
    return newDay;
  }, [tripData]);

  /**
   * Delete day
   */
  const deleteDay = useCallback((dayId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days
        .filter(day => day.id !== dayId)
        .map((day, index) => ({ ...day, dayNumber: index + 1 })),
      durationDays: prev.days.length - 1,
    }));
    
    // Track deletion
    if (dayId.startsWith('temp-')) {
      changes.current.days.added.delete(dayId);
    } else {
      changes.current.days.deleted.add(dayId);
    }
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Add activity to day
   */
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
      days: prev.days.map(day =>
        day.id === dayId
          ? {
              ...day,
              activities: [...day.activities, newActivity],
            }
          : day
      ),
    }));
    
    changes.current.activities.added.add(newActivity.id);
    setHasUnsavedChanges(true);
    
    return newActivity;
  }, []);

  /**
   * Delete activity
   */
  const deleteActivity = useCallback((dayId: string, activityId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day =>
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.filter(a => a.id !== activityId),
            }
          : day
      ),
    }));
    
    if (activityId.startsWith('temp-')) {
      changes.current.activities.added.delete(activityId);
    } else {
      changes.current.activities.deleted.add(activityId);
    }
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Save all changes (granular)
   */
  const saveChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return { success: true };
    
    setSaveStatus('saving');
    
    try {
      // Build change object
      const saveData = {
        tripId: tripData.id,
        metadata: undefined as any,
        days: undefined as any,
        activities: undefined as any,
      };
      
      // Collect metadata changes
      if (changes.current.metadata.size > 0) {
        saveData.metadata = {};
        changes.current.metadata.forEach(field => {
          saveData.metadata[field] = (tripData as any)[field];
        });
      }
      
      // Collect day changes
      if (changes.current.days.added.size > 0 ||
          changes.current.days.updated.size > 0 ||
          changes.current.days.deleted.size > 0) {
        saveData.days = {
          added: tripData.days.filter(d => changes.current.days.added.has(d.id)),
          updated: tripData.days.filter(d => changes.current.days.updated.has(d.id)),
          deleted: Array.from(changes.current.days.deleted),
        };
      }
      
      // Collect activity changes
      const allActivities: Activity[] = [];
      tripData.days.forEach(day => {
        day.activities.forEach(activity => {
          allActivities.push(activity);
        });
      });
      
      if (changes.current.activities.added.size > 0 ||
          changes.current.activities.updated.size > 0 ||
          changes.current.activities.deleted.size > 0) {
        saveData.activities = {
          added: allActivities.filter(a => changes.current.activities.added.has(a.id)),
          updated: allActivities.filter(a => changes.current.activities.updated.has(a.id)),
          deleted: Array.from(changes.current.activities.deleted),
        };
      }
      
      // Save only what changed
      await saveGranularChanges(saveData);
      
      // Clear change tracking
      changes.current = {
        metadata: new Set(),
        days: {
          added: new Set(),
          updated: new Set(),
          deleted: new Set(),
        },
        activities: {
          added: new Set(),
          updated: new Set(),
          deleted: new Set(),
        },
      };
      
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      console.log('[Editor] Granular save completed');
      return { success: true };
    } catch (error) {
      console.error('[Editor] Save failed:', error);
      setSaveStatus('error');
      return { success: false };
    }
  }, [tripData, hasUnsavedChanges]);

  /**
   * Get change summary
   */
  const getChangeSummary = useCallback(() => {
    const summary = {
      metadata: changes.current.metadata.size,
      daysAdded: changes.current.days.added.size,
      daysUpdated: changes.current.days.updated.size,
      daysDeleted: changes.current.days.deleted.size,
      activitiesAdded: changes.current.activities.added.size,
      activitiesUpdated: changes.current.activities.updated.size,
      activitiesDeleted: changes.current.activities.deleted.size,
    };
    
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    
    return { ...summary, total };
  }, []);

  return {
    tripData,
    saveStatus,
    hasUnsavedChanges,
    
    // Granular update functions
    updateMetadata,
    updateActivityInstant, // Saves immediately
    updateDayInstant,      // Saves immediately
    
    // Batch operations
    addDay,
    deleteDay,
    addActivity,
    deleteActivity,
    
    // Save function
    saveChanges,
    getChangeSummary,
  };
}