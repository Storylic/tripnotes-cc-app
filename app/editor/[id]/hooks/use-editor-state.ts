// app/editor/[id]/hooks/use-editor-state.ts
// Hook for managing editor state with all CRUD operations

import { useState, useCallback } from 'react';
import type { TripData, TripDay, Activity } from '../lib/types';

export function useEditorState(initialData: TripData) {
  const [tripData, setTripData] = useState(initialData);

  // Trip operations
  const updateTrip = useCallback((updates: Partial<TripData>) => {
    setTripData(prev => ({ ...prev, ...updates }));
  }, []);

  // Day operations
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
  }, [tripData.id, tripData.days.length]);

  const updateDay = useCallback((dayId: string, updates: Partial<TripDay>) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId ? { ...day, ...updates } : day
      ),
    }));
  }, []);

  const deleteDay = useCallback((dayId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days
        .filter(day => day.id !== dayId)
        .map((day, index) => ({ ...day, dayNumber: index + 1 })),
      durationDays: prev.days.length - 1,
    }));
  }, []);

  const duplicateDay = useCallback((dayId: string) => {
    const dayToDuplicate = tripData.days.find(d => d.id === dayId);
    if (!dayToDuplicate) return;

    const newDay: TripDay = {
      ...dayToDuplicate,
      id: `temp-${Date.now()}`,
      title: `${dayToDuplicate.title} (Copy)`,
      activities: dayToDuplicate.activities.map(activity => ({
        ...activity,
        id: `temp-${Date.now()}-${Math.random()}`,
        dayId: `temp-${Date.now()}`,
      })),
    };

    const dayIndex = tripData.days.findIndex(d => d.id === dayId);
    const newDays = [...tripData.days];
    newDays.splice(dayIndex + 1, 0, newDay);

    setTripData(prev => ({
      ...prev,
      days: newDays.map((day, index) => ({ ...day, dayNumber: index + 1 })),
      durationDays: newDays.length,
    }));
  }, [tripData.days]);

  const reorderDays = useCallback((startIndex: number, endIndex: number) => {
    const newDays = Array.from(tripData.days);
    const [removed] = newDays.splice(startIndex, 1);
    newDays.splice(endIndex, 0, removed);

    setTripData(prev => ({
      ...prev,
      days: newDays.map((day, index) => ({ ...day, dayNumber: index + 1 })),
    }));
  }, [tripData.days]);

  // Activity operations
  const addActivity = useCallback((dayId: string) => {
    const day = tripData.days.find(d => d.id === dayId);
    if (!day) return;

    const newActivity: Activity = {
      id: `temp-${Date.now()}`,
      dayId,
      timeBlock: 'morning',
      description: '',
      orderIndex: (day.activities?.length || 0) + 1,
      gems: [],
    };

    setTripData(prev => ({
      ...prev,
      days: prev.days.map(d => 
        d.id === dayId 
          ? { ...d, activities: [...(d.activities || []), newActivity] }
          : d
      ),
    }));
  }, [tripData.days]);

  const updateActivity = useCallback((dayId: string, activityId: string, updates: Partial<Activity>) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.map(activity =>
                activity.id === activityId ? { ...activity, ...updates } : activity
              ),
            }
          : day
      ),
    }));
  }, []);

  const deleteActivity = useCallback((dayId: string, activityId: string) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId
          ? {
              ...day,
              activities: day.activities
                .filter(a => a.id !== activityId)
                .map((a, index) => ({ ...a, orderIndex: index + 1 })),
            }
          : day
      ),
    }));
  }, []);

  const duplicateActivity = useCallback((dayId: string, activityId: string) => {
    const day = tripData.days.find(d => d.id === dayId);
    const activityToDuplicate = day?.activities.find(a => a.id === activityId);
    if (!activityToDuplicate) return;

    const newActivity: Activity = {
      ...activityToDuplicate,
      id: `temp-${Date.now()}`,
      description: `${activityToDuplicate.description} (Copy)`,
      gems: activityToDuplicate.gems.map(gem => ({
        ...gem,
        id: `temp-${Date.now()}-${Math.random()}`,
      })),
    };

    setTripData(prev => ({
      ...prev,
      days: prev.days.map(d => 
        d.id === dayId
          ? {
              ...d,
              activities: [
                ...d.activities.slice(0, activityToDuplicate.orderIndex),
                newActivity,
                ...d.activities.slice(activityToDuplicate.orderIndex),
              ].map((a, index) => ({ ...a, orderIndex: index + 1 })),
            }
          : d
      ),
    }));
  }, [tripData.days]);

  const moveActivity = useCallback((activityId: string, targetDayId: string, targetIndex: number) => {
    // Find the activity and its current day
    let activityToMove: Activity | undefined;
    let sourceDayId: string | undefined;

    for (const day of tripData.days) {
      const activity = day.activities?.find(a => a.id === activityId);
      if (activity) {
        activityToMove = activity;
        sourceDayId = day.id;
        break;
      }
    }

    if (!activityToMove || !sourceDayId) return;

    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id === sourceDayId) {
          // Remove from source day
          return {
            ...day,
            activities: day.activities
              .filter(a => a.id !== activityId)
              .map((a, index) => ({ ...a, orderIndex: index + 1 })),
          };
        } else if (day.id === targetDayId) {
          // Add to target day
          const newActivities = [...(day.activities || [])];
          newActivities.splice(targetIndex, 0, {
            ...activityToMove!,
            dayId: targetDayId,
          });
          return {
            ...day,
            activities: newActivities.map((a, index) => ({ 
              ...a, 
              orderIndex: index + 1,
              dayId: targetDayId,
            })),
          };
        }
        return day;
      }),
    }));
  }, [tripData.days]);

  const reorderActivities = useCallback((dayId: string, startIndex: number, endIndex: number) => {
    setTripData(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id === dayId) {
          const newActivities = Array.from(day.activities);
          const [removed] = newActivities.splice(startIndex, 1);
          newActivities.splice(endIndex, 0, removed);
          return {
            ...day,
            activities: newActivities.map((a, index) => ({ 
              ...a, 
              orderIndex: index + 1 
            })),
          };
        }
        return day;
      }),
    }));
  }, []);

  return {
    tripData,
    // Trip operations
    updateTrip,
    // Day operations
    addDay,
    updateDay,
    deleteDay,
    duplicateDay,
    reorderDays,
    // Activity operations
    addActivity,
    updateActivity,
    deleteActivity,
    duplicateActivity,
    moveActivity,
    reorderActivities,
  };
}