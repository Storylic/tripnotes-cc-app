// app/editor/[id]/components/save-toast.tsx
// Save status toast notification component

'use client';

interface SaveToastProps {
  status: 'saved' | 'saving' | 'error';
  show: boolean;
}

import styles from '../editor-styles.module.css';

export default function SaveToast({ status, show }: SaveToastProps) {
  if (!show) return null;

  return (
    <div className={`${styles.saveToast} ${styles[status]} ${
      show ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="flex items-center gap-3">
        {status === 'saving' && (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Saving changes...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <span className="text-green-600 text-lg">✓</span>
            <span className="text-sm text-green-700">All changes saved</span>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-red-600 text-lg">⚠</span>
            <span className="text-sm text-red-700">Save failed - retrying...</span>
          </>
        )}
      </div>
    </div>
  );
}