import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  ArrowLeft,
  Download,
  Share2,
  Clock,
  FileText,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '../../components/ui/Spinner';
import { VerdictBadge } from '../../components/evidence/VerdictBadge';
import { LedgerTable } from '../../components/evidence/LedgerTable';
import { MessageList } from '../../components/chat/MessageList';
import type { Message, EvidenceLedger, LedgerEntry } from '../../types';

export default function SessionViewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'ledger'>('chat');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  // Validate sessionId is a valid Convex ID
  const isValidConvexId = sessionId && !sessionId.includes('-') && sessionId.length > 0;
  const convexSessionId = isValidConvexId ? sessionId as Id<"sessions"> : undefined;

  // Use Convex real-time query for session with ledger
  const sessionWithLedger = useQuery(
    api.sessions.getWithLedger,
    convexSessionId ? { sessionId: convexSessionId } : "skip"
  );

  const isLoading = sessionWithLedger === undefined && isValidConvexId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sessionWithLedger) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-medium text-foreground">Session not found</h2>
        <p className="text-muted-foreground mt-1">This session may have been deleted.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  // Build messages from session data
  const messages: Message[] = [
    {
      id: `user-${sessionWithLedger._id}`,
      role: 'user',
      content: sessionWithLedger.query,
      timestamp: new Date(sessionWithLedger._creationTime),
    },
  ];

  if (sessionWithLedger.response) {
    messages.push({
      id: sessionWithLedger._id,
      role: 'assistant',
      content: sessionWithLedger.response,
      timestamp: new Date(sessionWithLedger.completedAt ?? sessionWithLedger._creationTime),
      isVerified: true,
    });
  }

  // Build ledger from session data
  const ledger: EvidenceLedger | null = sessionWithLedger.ledger && sessionWithLedger.ledger.length > 0 ? {
    session_id: sessionWithLedger._id,
    summary: {
      total_claims: sessionWithLedger.ledger.length,
      supported: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'supported').length,
      weak: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'weak').length,
      contradicted: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'contradicted').length,
      not_found: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'not_found').length,
      expert_verified: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'expert_verified').length,
      conflict_flagged: sessionWithLedger.ledger.filter((e: any) => e?.verdict === 'conflict_flagged').length,
    },
    entries: sessionWithLedger.ledger.map((entry: any, index: number) => ({
      id: `claim-${index}`,
      claim_text: entry?.claimText ?? '',
      claim_type: entry?.claimType ?? 'fact',
      source_tag: entry?.sourceTag,
      importance: entry?.importance ?? 'material',
      verdict: entry?.verdict ?? 'not_found',
      confidence: entry?.confidenceScore ?? 0,
      evidence_snippet: entry?.evidenceSnippet,
      expert_assessment: entry?.expertAssessment,
      chunk_ids: [],
    })),
    risk_flags: [],
  } : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-semibold text-foreground line-clamp-1">{sessionWithLedger.query}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(sessionWithLedger._creationTime).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                {sessionWithLedger.mode === 'answer' ? (
                  <MessageSquare className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                {sessionWithLedger.mode === 'answer' ? 'Answer' : 'Draft'} Mode
              </span>
              <SessionStatusBadge status={sessionWithLedger.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Share2 className="w-4 h-4" />}>
            Share
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-2 bg-card border-b border-border">
        <TabButton
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Conversation"
        />
        <TabButton
          active={activeTab === 'ledger'}
          onClick={() => setActiveTab('ledger')}
          icon={<CheckCircle className="w-4 h-4" />}
          label="Evidence Ledger"
          badge={ledger?.entries?.length}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background">
        {activeTab === 'chat' ? (
          <div className="h-full overflow-y-auto">
            <MessageList
              messages={messages}
              className="p-6"
            />
          </div>
        ) : (
          <div className="h-full flex">
            {/* Ledger Panel */}
            <div className="flex-1 overflow-y-auto p-6">
              {ledger ? (
                <EvidenceLedgerContent
                  ledger={ledger}
                  onEntryClick={setSelectedEntry}
                  selectedEntryId={selectedEntry?.id}
                />
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No evidence ledger available</p>
                </div>
              )}
            </div>

            {/* Entry Detail Panel */}
            {selectedEntry && (
              <div className="w-96 border-l border-border bg-card overflow-y-auto">
                <EntryDetailPanel
                  entry={selectedEntry}
                  onClose={() => setSelectedEntry(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const config = {
    completed: { icon: CheckCircle, label: 'Completed', color: 'text-green-600 bg-green-50' },
    processing: { icon: Clock, label: 'In Progress', color: 'text-blue-600 bg-blue-50' },
    pending: { icon: Clock, label: 'Pending', color: 'text-amber-600 bg-amber-50' },
    error: { icon: XCircle, label: 'Error', color: 'text-red-600 bg-red-50' },
  };

  const { icon: Icon, label, color } = config[status as keyof typeof config] || config.error;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted'
        }
      `}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
          active ? 'bg-primary/20' : 'bg-muted'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EvidenceLedgerContent({
  ledger,
  onEntryClick,
  selectedEntryId,
}: {
  ledger: EvidenceLedger;
  onEntryClick: (entry: LedgerEntry) => void;
  selectedEntryId?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Supported"
          value={ledger.summary.supported}
          color="text-verdict-supported bg-verdict-supported/10"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Weak"
          value={ledger.summary.weak}
          color="text-verdict-weak bg-verdict-weak/10"
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5" />}
          label="Contradicted"
          value={ledger.summary.contradicted}
          color="text-verdict-contradicted bg-verdict-contradicted/10"
        />
        <SummaryCard
          icon={<HelpCircle className="w-5 h-5" />}
          label="Not Found"
          value={ledger.summary.not_found}
          color="text-verdict-missing bg-verdict-missing/10"
        />
      </div>

      {/* Risk Flags */}
      {ledger.risk_flags.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Flags ({ledger.risk_flags.length})
          </h3>
          <ul className="space-y-1">
            {ledger.risk_flags.map((flag) => (
              <li key={flag.id} className="text-sm text-destructive/80">
                {flag.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Claims Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground">
            Claims ({ledger.summary.total_claims})
          </h3>
        </div>
        <LedgerTable
          entries={ledger.entries}
          onRowClick={onEntryClick}
          highlightedId={selectedEntryId}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${color}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
      </div>
    </div>
  );
}

function EntryDetailPanel({
  entry,
  onClose,
}: {
  entry: LedgerEntry;
  onClose: () => void;
}) {
  // Parse source tag for display
  const getSourceDisplay = (sourceTag?: string) => {
    if (!sourceTag) return { label: 'Unknown', color: 'text-muted-foreground' };
    if (sourceTag.startsWith('cite:')) return { label: `Document ${sourceTag.replace('cite:', '')}`, color: 'text-emerald-600' };
    if (sourceTag === 'llm:writer') return { label: 'Writer LLM', color: 'text-blue-500' };
    if (sourceTag === 'llm:skeptic') return { label: 'Skeptic LLM', color: 'text-purple-500' };
    if (sourceTag === 'llm:judge') return { label: 'Judge LLM', color: 'text-indigo-500' };
    return { label: sourceTag, color: 'text-muted-foreground' };
  };

  const sourceDisplay = getSourceDisplay(entry.source_tag);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Claim Detail</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <XCircle className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Claim
          </label>
          <p className="text-sm text-foreground mt-1">{entry.claim_text}</p>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source
            </label>
            <p className={`text-sm font-medium mt-1 ${sourceDisplay.color}`}>
              {sourceDisplay.label}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Verdict
            </label>
            <div className="mt-1">
              <VerdictBadge verdict={entry.verdict} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Confidence
            </label>
            <p className="text-sm font-medium text-foreground mt-1">
              {Math.round(entry.confidence * 100)}%
            </p>
          </div>
        </div>

        {entry.evidence_snippet && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Evidence
            </label>
            <blockquote className="mt-1 p-3 bg-muted rounded-lg text-sm text-foreground border-l-2 border-primary">
              {entry.evidence_snippet}
            </blockquote>
          </div>
        )}

        {entry.expert_assessment && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Expert Assessment
            </label>
            <blockquote className="mt-1 p-3 bg-indigo-500/10 rounded-lg text-sm text-foreground border-l-2 border-indigo-500">
              {entry.expert_assessment}
            </blockquote>
          </div>
        )}

        {entry.chunk_ids.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source Chunks
            </label>
            <div className="mt-1 space-y-1">
              {entry.chunk_ids.map((chunkId) => (
                <button
                  key={chunkId}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View chunk
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
