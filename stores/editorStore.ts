// stores/editorStore.ts
// Zustand store for trip editor state management

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Trip, TripDay, Activity, Gem } from '@/lib/types';

interface EditorState {
  trip: Trip | null;
  days: TripDay[];
  activities: Record<string, Activity[]>;
  gems: Record<string, Gem[]>;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Actions
  setTrip: (trip: Trip) => void;
  setDays: (days: TripDay[]) => void;
  addDay: () => void;
  updateDay: (dayId: string, updates: Partial<TripDay>) => void;
  deleteDay: (dayId: string) => void;
  reorderDays: (startIndex: number, endIndex: number) => void;
  addActivity: (dayId: string, activity: Activity) => void;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
  deleteActivity: (activityId: string) => void;
  setSaving: (isSaving: boolean) => void;
  markClean: () => void;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      trip: null,
      days: [],
      activities: {},
      gems: {},
      isDirty: false,
      isSaving: false,
      lastSaved: null,

      setTrip: (trip) => set({ trip, isDirty: true }),
      
      setDays: (days) => set({ days, isDirty: true }),
      
      addDay: () => set((state) => ({
        days: [...state.days, {
          id: `temp-${Date.now()}`,
          tripId: state.trip?.id || '',
          dayNumber: state.days.length + 1,
          title: `Day ${state.days.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        isDirty: true,
      })),
      
      updateDay: (dayId, updates) => set((state) => ({
        days: state.days.map(day => 
          day.id === dayId ? { ...day, ...updates, updatedAt: new Date() } : day
        ),
        isDirty: true,
      })),
      
      deleteDay: (dayId) => set((state) => ({
        days: state.days.filter(day => day.id !== dayId),
        isDirty: true,
      })),
      
      reorderDays: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.days);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        return {
          days: result.map((day, index) => ({
            ...day,
            dayNumber: index + 1,
          })),
          isDirty: true,
        };
      }),
      
      addActivity: (dayId, activity) => set((state) => ({
        activities: {
          ...state.activities,
          [dayId]: [...(state.activities[dayId] || []), activity],
        },
        isDirty: true,
      })),
      
      updateActivity: (activityId, updates) => set((state) => ({
        activities: Object.fromEntries(
          Object.entries(state.activities).map(([dayId, activities]) => [
            dayId,
            activities.map(activity =>
              activity.id === activityId 
                ? { ...activity, ...updates, updatedAt: new Date() } 
                : activity
            ),
          ])
        ),
        isDirty: true,
      })),
      
      deleteActivity: (activityId) => set((state) => ({
        activities: Object.fromEntries(
          Object.entries(state.activities).map(([dayId, activities]) => [
            dayId,
            activities.filter(activity => activity.id !== activityId),
          ])
        ),
        isDirty: true,
      })),
      
      setSaving: (isSaving) => set({ isSaving }),
      
      markClean: () => set({ isDirty: false, lastSaved: new Date() }),
    }),
    {
      name: 'editor-store',
    }
  )
);
