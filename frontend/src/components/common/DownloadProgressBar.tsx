/**
 * VELOCE V2 // DETERMINATE MULTI-STAGE SSE DOWNLOAD PROGRESS BAR
 * Module: frontend/src/components/common/DownloadProgressBar.tsx
 * Standard: VELOCE-V2-ENGINEERING-SPEC-v2.0
 */

import React from 'react';
import { X, ArrowDownCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export interface DownloadProgressState {
  stage: number;               // 1..4
  stageName: string;           // e.g. "20-Car Spatial Telemetry Resampling"
  progressPct: number;         // 0..100
  bytesDownloaded: number;     // e.g. 4200000
  totalBytesExpected: number;  // e.g. 9130000
  speedMBps: number;           // e.g. 3.4
  etaSec: number;              // e.g. 1.2
  status: 'IDLE' | 'DOWNLOADING' | 'COMPLETE' | 'ERROR' | 'CANCELLED';
  errorMessage?: string;
}

interface DownloadProgressBarProps {
  state: DownloadProgressState;
  onCancel?: () => void;
  className?: string;
}

export const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({
  state,
  onCancel,
  className = '',
}) => {
  if (state.status === 'IDLE') return null;

  const downloadedMB = (state.bytesDownloaded / (1024 * 1024)).toFixed(2);
  const totalMB = (state.totalBytesExpected / (1024 * 1024)).toFixed(2);
  const progressClamped = Math.min(100, Math.max(0, state.progressPct));

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-96 p-4 rounded-xl bg-[#0B0C0E]/90 backdrop-blur-xl border border-white/10 shadow-2xl text-white font-mono transition-all duration-300 ${className}`}
      role="region"
      aria-label="Session Download Progress"
    >
      {/* Header with Title and Cancel button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {state.status === 'DOWNLOADING' && (
            <ArrowDownCircle className="w-4 h-4 text-[#00E5FF] animate-pulse" />
          )}
          {state.status === 'COMPLETE' && (
            <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
          )}
          {(state.status === 'ERROR' || state.status === 'CANCELLED') && (
            <AlertCircle className="w-4 h-4 text-[#FF3B00]" />
          )}
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            {state.status === 'DOWNLOADING' && `Stage ${state.stage}/4: ${state.stageName}`}
            {state.status === 'COMPLETE' && 'Telemetry Ready // Cached'}
            {state.status === 'ERROR' && 'Download Interrupted'}
            {state.status === 'CANCELLED' && 'Download Cancelled'}
          </span>
        </div>

        {state.status === 'DOWNLOADING' && onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Cancel Download"
            aria-label="Cancel download"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2.5">
        <div
          className={`h-full transition-all duration-150 ease-out ${
            state.status === 'COMPLETE'
              ? 'bg-[#00FF66]'
              : state.status === 'ERROR'
              ? 'bg-[#FF3B00]'
              : 'bg-gradient-to-r from-[#00E5FF] to-[#FF3B00]'
          }`}
          style={{ width: `${progressClamped}%` }}
        />
      </div>

      {/* Numerical Metrics Grid */}
      <div className="flex items-center justify-between text-[11px] text-[#A3A8B2]">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold">{progressClamped.toFixed(0)}%</span>
          <span>({downloadedMB} / {totalMB} MB)</span>
        </div>

        {state.status === 'DOWNLOADING' && (
          <div className="flex items-center gap-2">
            <span className="text-[#00E5FF]">{state.speedMBps.toFixed(1)} MB/s</span>
            <span>ETA: {state.etaSec.toFixed(1)}s</span>
          </div>
        )}

        {state.status === 'COMPLETE' && (
          <span className="text-[#00FF66]">100% In-Memory</span>
        )}
      </div>

      {state.errorMessage && (
        <p className="mt-2 text-[10px] text-[#FF3B00] truncate">
          {state.errorMessage}
        </p>
      )}
    </div>
  );
};
