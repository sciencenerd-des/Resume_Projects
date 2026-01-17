import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { MessageSquare, Shield, FileText, AlertCircle, Search, Sparkles, Scale, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useConvexChat } from '../../hooks/useConvexChat';
import { MessageList } from '../../components/chat/MessageList';
import { QueryInput } from '../../components/chat/QueryInput';
import { ModeToggle, QueryMode } from '../../components/chat/ModeToggle';
import { Spinner } from '../../components/ui/Spinner';

// Pipeline phases for progress tracking
type PipelinePhase = 'idle' | 'retrieval' | 'writer' | 'skeptic' | 'judge' | 'revision' | 'complete';

export default function ChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();

  // Validate workspaceId is a valid Convex ID (no dashes = valid)
  const isValidConvexId = workspaceId && !workspaceId.includes('-') && workspaceId.length > 0;
  const convexWorkspaceId = isValidConvexId ? workspaceId as Id<"workspaces"> : undefined;

  // Use Convex-based chat hook (replaces WebSocket)
  const {
    messages,
    isProcessing,
    currentPhase,
    ledger,
    error,
    progress,
    streamingContent,
    chunksRetrieved,
    submitQuery,
    clearError,
  } = useConvexChat(convexWorkspaceId);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('answer');

  // Check if workspace has documents (using Convex real-time query)
  const documents = useQuery(
    api.documents.list,
    isValidConvexId ? { workspaceId: workspaceId as Id<"workspaces"> } : "skip"
  );

  const hasDocuments = (documents ?? []).length > 0;
  const readyDocuments = (documents ?? []).filter((d) => d.status === 'ready').length;

  const handleSubmit = useCallback(() => {
    if (!query.trim() || isProcessing) return;
    submitQuery(query.trim(), mode);
    setQuery('');
  }, [query, mode, isProcessing, submitQuery]);

  const handleCitationClick = (chunkId: string) => {
    // TODO: Open chunk viewer modal
    console.log('Citation clicked:', chunkId);
  };

  // Map progress phase to pipeline phase for UI
  const pipelinePhase: PipelinePhase = isProcessing
    ? (currentPhase as PipelinePhase) || 'retrieval'
    : 'idle';

  if (!hasDocuments) {
    return <EmptyDocumentsState workspaceId={workspaceId!} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Chat</h1>
            <p className="text-xs text-muted-foreground">
              {readyDocuments} document{readyDocuments !== 1 ? 's' : ''} indexed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
          <button
            onClick={clearError}
            className="text-destructive/70 hover:text-destructive text-xs font-medium px-2 py-1 rounded hover:bg-destructive/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Area with Sticky Progress */}
      {messages.length === 0 && !isProcessing ? (
        <WelcomeState mode={mode} />
      ) : (
        <div className="flex-1 overflow-y-auto relative">
          {/* Pipeline Progress Indicator - Sticky at top of scroll area */}
          {isProcessing && pipelinePhase !== 'idle' && (
            <PipelineProgress
              phase={pipelinePhase}
              chunksRetrieved={chunksRetrieved}
              isCompact={!!streamingContent}
            />
          )}
          <MessageList
            messages={messages}
            isStreaming={isProcessing}
            streamingContent={streamingContent}
            onCitationClick={handleCitationClick}
            className=""
          />
        </div>
      )}

      {/* Input Area */}
      <QueryInput
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        disabled={isProcessing}
        placeholder={
          mode === 'answer'
            ? 'Ask a question about your documents...'
            : 'Describe what you want to draft...'
        }
      />
    </div>
  );
}

function WelcomeState({ mode }: { mode: QueryMode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {mode === 'answer' ? 'Ask Evidence-Backed Questions' : 'Create Verified Drafts'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {mode === 'answer'
            ? 'Get accurate answers with citations from your documents. Every claim is verified against your source materials.'
            : 'Generate comprehensive drafts with automatic fact-checking. Each statement is traced back to evidence.'}
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sourced from your docs
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Evidence verified
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDocumentsState({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No Documents Yet</h2>
        <p className="text-muted-foreground mb-6">
          Upload some documents first to start asking questions. VerityDraft uses your documents as
          the source of truth for all answers.
        </p>
        <a
          href={`/workspaces/${workspaceId}/documents`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Upload Documents
        </a>
      </div>
    </div>
  );
}

// Pipeline progress indicator
const PIPELINE_STEPS = [
  { phase: 'retrieval', label: 'Searching documents', icon: Search },
  { phase: 'writer', label: 'Generating response', icon: Sparkles },
  { phase: 'skeptic', label: 'Analyzing claims', icon: AlertCircle },
  { phase: 'judge', label: 'Verifying evidence', icon: Scale },
  { phase: 'revision', label: 'Revising response', icon: RefreshCw },
] as const;

function PipelineProgress({
  phase,
  chunksRetrieved,
  isCompact = false,
}: {
  phase: PipelinePhase;
  chunksRetrieved: number;
  isCompact?: boolean;
}) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.phase === phase);
  const currentStep = PIPELINE_STEPS.find((s) => s.phase === phase);

  if (phase === 'idle' || phase === 'complete') return null;

  const progressPercent = Math.max(10, ((currentIndex + 1) / PIPELINE_STEPS.length) * 100);

  // Compact mode - minimal single-line sticky bar
  if (isCompact) {
    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Thin progress bar */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Compact info row */}
        <div className="px-4 py-1.5 flex items-center gap-2">
          {currentStep && <currentStep.icon className="w-3.5 h-3.5 text-primary animate-pulse" />}
          <span className="text-xs font-medium text-foreground">{currentStep?.label}</span>
          <div className="flex-1 flex items-center gap-0.5 mx-2">
            {PIPELINE_STEPS.map((step, index) => (
              <div
                key={step.phase}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  index < currentIndex
                    ? 'bg-primary'
                    : index === currentIndex
                      ? 'bg-primary/50 animate-pulse'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <Spinner className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    );
  }

  // Full mode - detailed progress card
  return (
    <div className="sticky top-0 z-20 px-6 py-4 bg-background/95 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="px-4 py-3">
          {/* Current step */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {currentStep && <currentStep.icon className="w-4 h-4 text-primary animate-pulse" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {currentStep?.label || 'Processing...'}
              </p>
              {phase === 'retrieval' && chunksRetrieved > 0 && (
                <p className="text-xs text-muted-foreground">
                  Found {chunksRetrieved} relevant chunk{chunksRetrieved !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Spinner className="w-5 h-5 text-primary" />
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
            {PIPELINE_STEPS.map((step, index) => {
              const isActive = index === currentIndex;
              const isComplete = index < currentIndex;

              return (
                <div key={step.phase} className="flex items-center flex-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      isComplete
                        ? 'bg-primary'
                        : isActive
                          ? 'bg-primary/50 animate-pulse'
                          : 'bg-muted'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Step labels */}
          <div className="flex justify-between mt-1.5">
            {PIPELINE_STEPS.map((step, index) => {
              const isActive = index === currentIndex;
              const isComplete = index < currentIndex;

              return (
                <span
                  key={step.phase}
                  className={`text-[10px] ${
                    isActive ? 'text-primary font-medium' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'
                  }`}
                >
                  {step.label.split(' ')[0]}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
