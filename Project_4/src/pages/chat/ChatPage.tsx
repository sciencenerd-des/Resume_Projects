import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Sparkles,
  FileText,
  AlertCircle,
  Search,
  Scale,
  RefreshCw,
  Upload,
  BookOpen,
  ShieldCheck,
  PenLine
} from 'lucide-react';
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

  // Validate workspaceId is a valid Convex ID
  const isValidConvexId = workspaceId && !workspaceId.includes('-') && workspaceId.length > 0;
  const convexWorkspaceId = isValidConvexId ? workspaceId as Id<"workspaces"> : undefined;

  // Use Convex-based chat hook
  const {
    messages,
    isProcessing,
    currentPhase,
    error,
    progress,
    streamingContent,
    chunksRetrieved,
    submitQuery,
    clearError,
  } = useConvexChat(convexWorkspaceId);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('answer');

  // Check if workspace has documents
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

  const handleRegenerate = useCallback(() => {
    // Get the last user message and resubmit
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      submitQuery(lastUserMessage.content, mode);
    }
  }, [messages, mode, submitQuery]);

  const handleCitationClick = (chunkId: string) => {
    // TODO: Open citation viewer modal
    console.log('Citation clicked:', chunkId);
  };

  // Map progress phase to pipeline phase
  const pipelinePhase: PipelinePhase = isProcessing
    ? (currentPhase as PipelinePhase) || 'retrieval'
    : 'idle';

  if (!hasDocuments) {
    return <EmptyDocumentsState workspaceId={workspaceId!} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">VerityDraft</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
            {readyDocuments} doc{readyDocuments !== 1 ? 's' : ''}
          </span>
        </div>

        <ModeToggle mode={mode} onChange={setMode} />
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <div className="flex items-center justify-between gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
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
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isProcessing ? (
          <WelcomeState mode={mode} />
        ) : (
          <>
            {/* Pipeline Progress - Minimal sticky bar */}
            {isProcessing && pipelinePhase !== 'idle' && (
              <PipelineProgress
                phase={pipelinePhase}
                chunksRetrieved={chunksRetrieved}
              />
            )}

            <MessageList
              messages={messages}
              isStreaming={isProcessing}
              streamingContent={streamingContent}
              onCitationClick={handleCitationClick}
              onRegenerate={handleRegenerate}
            />
          </>
        )}
      </div>

      {/* Input Area */}
      <QueryInput
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        disabled={isProcessing}
        isLoading={isProcessing}
        placeholder={
          mode === 'answer'
            ? 'Ask about your documents...'
            : 'Describe what you want to draft...'
        }
      />
    </div>
  );
}

function WelcomeState({ mode }: { mode: QueryMode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-lg space-y-8">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === 'answer' ? 'What would you like to know?' : 'What would you like to draft?'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'answer'
              ? 'Ask questions and get verified answers from your documents.'
              : 'Create evidence-backed drafts with automatic fact-checking.'}
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <span className="text-foreground font-medium">Document-grounded</span>
            <span className="text-muted-foreground text-xs">Every claim traced to sources</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border">
            <ShieldCheck className="w-5 h-5 text-teal-500" />
            <span className="text-foreground font-medium">Triple-verified</span>
            <span className="text-muted-foreground text-xs">3 LLMs check each response</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border">
            <PenLine className="w-5 h-5 text-blue-500" />
            <span className="text-foreground font-medium">Expert knowledge</span>
            <span className="text-muted-foreground text-xs">Fills gaps with cited expertise</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDocumentsState({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-background">
      <div className="text-center max-w-md space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">No documents yet</h2>
          <p className="text-muted-foreground">
            Upload some documents to start asking questions. VerityDraft uses your documents as the source of truth.
          </p>
        </div>
        <Link
          to={`/workspaces/${workspaceId}/documents`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Upload className="w-4 h-4" />
          Upload Documents
        </Link>
      </div>
    </div>
  );
}

// Minimal pipeline progress indicator
const PIPELINE_STEPS = [
  { phase: 'retrieval', label: 'Searching', icon: Search },
  { phase: 'writer', label: 'Writing', icon: Sparkles },
  { phase: 'skeptic', label: 'Analyzing', icon: AlertCircle },
  { phase: 'judge', label: 'Verifying', icon: Scale },
  { phase: 'revision', label: 'Revising', icon: RefreshCw },
] as const;

function PipelineProgress({
  phase,
  chunksRetrieved,
}: {
  phase: PipelinePhase;
  chunksRetrieved: number;
}) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.phase === phase);
  const currentStep = PIPELINE_STEPS.find((s) => s.phase === phase);

  if (phase === 'idle' || phase === 'complete') return null;

  const progressPercent = Math.max(10, ((currentIndex + 1) / PIPELINE_STEPS.length) * 100);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Thin progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status row */}
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentStep && <currentStep.icon className="w-4 h-4 text-emerald-500 animate-pulse" />}
          <span className="text-sm font-medium text-foreground">{currentStep?.label}...</span>
          {phase === 'retrieval' && chunksRetrieved > 0 && (
            <span className="text-xs text-muted-foreground">
              ({chunksRetrieved} chunk{chunksRetrieved !== 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              key={step.phase}
              className={`
                w-1.5 h-1.5 rounded-full transition-colors duration-300
                ${index < currentIndex
                  ? 'bg-emerald-500'
                  : index === currentIndex
                    ? 'bg-emerald-500/50 animate-pulse'
                    : 'bg-muted-foreground/30'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
