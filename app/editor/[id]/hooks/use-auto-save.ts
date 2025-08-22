// app/editor/[id]/hooks/use-auto-save.ts
// Hook for managing auto-save functionality

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TripData, SaveStatus } from '../lib/types';

interface UseAutoSaveProps {
  tripData: TripData;
  onSave: (data: TripData) => Promise<{ success: boolean }>;
  delay?: number;
}

export function useAutoSave({ tripData, onSave, delay = 2000 }: UseAutoSaveProps) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await onSave(tripData);
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // Refresh if there are temp IDs to get real database IDs
      const hasTempIds = 
        tripData.days.some(d => d.id.startsWith('temp-')) ||
        tripData.days.some(d => d.activities?.some(a => a.id.startsWith('temp-')));
      
      if (hasTempIds) {
        router.refresh();
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
    }
  }, [tripData, onSave, router]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, delay);
  }, [handleSave, delay]);

  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return handleSave();
  }, [handleSave]);

  return {
    saveStatus,
    lastSaved,
    debouncedSave,
    saveImmediately,
  };
}