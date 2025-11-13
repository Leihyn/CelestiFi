// Lazy-loaded ImpactAnalysis Component
// This is a wrapper to enable code splitting for the impact modal

import { lazy, Suspense } from 'react';

const ImpactAnalysisModal = lazy(() => import('./ImpactAnalysis'));

export default function ImpactAnalysisLazy({ whale, onClose }) {
  return (
    <Suspense
      fallback={
        <div className="modal-overlay" onClick={onClose}>
          <div className="impact-modal loading">
            <div className="loading-spinner">Loading impact analysis...</div>
          </div>
        </div>
      }
    >
      <ImpactAnalysisModal whale={whale} onClose={onClose} />
    </Suspense>
  );
}
