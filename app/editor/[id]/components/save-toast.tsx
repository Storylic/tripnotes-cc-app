// app/editor/[id]/components/save-toast.tsx
// Save status toast notification component

'use client';

interface SaveToastProps {
  status: 'saved' | 'saving' | 'error';
  show: boolean;
}

export default function SaveToast({ status, show }: SaveToastProps) {
  if (!show) return null;

  return (
    <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div className={`px-4 py-3 rounded-lg shadow-lg border ${
        status === 'saving' 
          ? 'bg-white border-gray-200' 
          : status === 'saved' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {status === 'saving' && (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <span className="text-green-600 text-lg animate-pulse">✓</span>
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
    </div>
  );
}