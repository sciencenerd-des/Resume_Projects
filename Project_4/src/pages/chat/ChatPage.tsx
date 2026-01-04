import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Shield, FileText, AlertCircle, Search, Sparkles, Scale, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { api } from '../../services/api';
import { MessageList } from '../../components/chat/MessageList';
import { QueryInput } from '../../components/chat/QueryInput';
import { ModeToggle, QueryMode } from '../../components/chat/ModeToggle';
import { Spinner } from '../../components/ui/Spinner';
import type { Message, Citation, LedgerEntry, EvidenceLedger } from '../../types';

// Pipeline phases for progress tracking
type PipelinePhase = 'idle' | 'retrieval' | 'writer' | 'skeptic' | 'judge' | 'revision' | 'complete';

export default function ChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const { isConnected, on, off, send } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('answer');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<EvidenceLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [chunksRetrieved, setChunksRetrieved] = useState<number>(0);

  // Check if workspace has documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => api.getDocuments(workspaceId!),
    enabled: !!workspaceId,
  });

  const hasDocuments = documents.length > 0;
  const readyDocuments = documents.filter((d: any) => d.status === 'ready').length;

  // WebSocket event handlers
  useEffect(() => {
    const handleSessionCreated = (payload: any) => {
      setCurrentSessionId(payload.session_id);
      setIsStreaming(true);
      setStreamingContent('');
      setPipelinePhase('retrieval');
      setChunksRetrieved(0);
    };

    const handleRetrievalStarted = () => {
      setPipelinePhase('retrieval');
    };

    const handleRetrievalComplete = (payload: any) => {
      setChunksRetrieved(payload.chunksRetrieved || 0);
    };

    const handleGenerationStarted = (payload: any) => {
      setPipelinePhase(payload.phase || 'writer');
    };

    const handleRevisionStarted = (payload: any) => {
      setPipelinePhase('revision');
    };

    const handleContentChunk = (payload: any) => {
      setStreamingContent((prev) => prev + payload.delta);
    };

    const handleClaimVerified = (payload: any) => {
      // Update ledger with new claim
      setLedger((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: [...prev.entries, payload.claim],
        };
      });
    };

    const handleLedgerUpdated = (payload: unknown) => {
      setLedger(payload as EvidenceLedger);
    };

    const handleGenerationComplete = (payload: any) => {
      setPipelinePhase('complete');

      // Use the response from payload if streamingContent is empty
      // (this happens when no chunks are found and no LLM is called)
      const responseContent = streamingContent || payload.response || 'No response generated.';

      // Add the complete message to the list
      const assistantMessage: Message = {
        id: payload.sessionId || payload.session_id,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
      setIsStreaming(false);

      // Reset phase after a short delay
      setTimeout(() => setPipelinePhase('idle'), 500);
    };

    const handleError = (payload: any) => {
      setError(payload.message);
      setIsStreaming(false);
      setPipelinePhase('idle');
    };

    on('session_created', handleSessionCreated);
    on('retrieval_started', handleRetrievalStarted);
    on('retrieval_complete', handleRetrievalComplete);
    on('generation_started', handleGenerationStarted);
    on('revision_started', handleRevisionStarted);
    on('content_chunk', handleContentChunk);
    on('claim_verified', handleClaimVerified);
    on('ledger_updated', handleLedgerUpdated);
    on('generation_complete', handleGenerationComplete);
    on('error', handleError);

    return () => {
      off('session_created', handleSessionCreated);
      off('retrieval_started', handleRetrievalStarted);
      off('retrieval_complete', handleRetrievalComplete);
      off('generation_started', handleGenerationStarted);
      off('revision_started', handleRevisionStarted);
      off('content_chunk', handleContentChunk);
      off('claim_verified', handleClaimVerified);
      off('ledger_updated', handleLedgerUpdated);
      off('generation_complete', handleGenerationComplete);
      off('error', handleError);
    };
  }, [on, off, streamingContent]);

  const handleSubmit = useCallback(() => {
    if (!query.trim() || !workspaceId || isStreaming) return;

    if (!isConnected) {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    setError(null);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send query via WebSocket
    send({
      type: 'query',
      payload: {
        workspace_id: workspaceId,
        query: query.trim(),
        mode,
      },
    });

    setQuery('');
  }, [query, workspaceId, mode, isStreaming, isConnected, send]);

  const handleCitationClick = (chunkId: string) => {
    // TODO: Open chunk viewer modal
    console.log('Citation clicked:', chunkId);
  };

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

          {!isConnected && (
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Reconnecting...
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pipeline Progress Indicator */}
      {isStreaming && pipelinePhase !== 'idle' && (
        <PipelineProgress phase={pipelinePhase} chunksRetrieved={chunksRetrieved} />
      )}

      {/* Messages Area */}
      {messages.length === 0 && !isStreaming ? (
        <WelcomeState mode={mode} />
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onCitationClick={handleCitationClick}
          className="flex-1"
        />
      )}

      {/* Input Area */}
      <QueryInput
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        disabled={isStreaming || !isConnected}
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

function PipelineProgress({ phase, chunksRetrieved }: { phase: PipelinePhase; chunksRetrieved: number }) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.phase === phase);
  const currentStep = PIPELINE_STEPS.find((s) => s.phase === phase);

  if (phase === 'idle' || phase === 'complete') return null;

  return (
    <div className="mx-6 my-4">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(10, ((currentIndex + 1) / PIPELINE_STEPS.length) * 100)}%`,
            }}
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
