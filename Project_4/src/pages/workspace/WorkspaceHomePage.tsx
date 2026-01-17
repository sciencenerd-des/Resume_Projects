import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  FileText,
  MessageSquare,
  Upload,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '../../components/ui/Spinner';

// Validate Convex ID format (no dashes = valid Convex ID)
function isValidConvexId(id: string | undefined): boolean {
  return !!id && !id.includes('-') && id.length > 0;
}

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  // Only query if we have a valid Convex ID (not a legacy UUID)
  const validWorkspaceId = isValidConvexId(workspaceId);

  const documents = useQuery(
    api.documents.list,
    validWorkspaceId ? { workspaceId: workspaceId as Id<"workspaces"> } : "skip"
  );

  const sessions = useQuery(
    api.sessions.list,
    validWorkspaceId ? { workspaceId: workspaceId as Id<"workspaces"> } : "skip"
  );

  const isLoading = documents === undefined || sessions === undefined;

  // Handle invalid workspace ID (legacy UUID from Supabase)
  if (!validWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Invalid Workspace</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This workspace ID is not valid. Please select a workspace from the list.
        </p>
        <Button onClick={() => navigate('/workspaces')}>Go to Workspaces</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const docsList = documents ?? [];
  const sessionsList = sessions ?? [];

  const readyDocs = docsList.filter((d) => d.status === 'ready').length;
  const processingDocs = docsList.filter((d) => d.status === 'processing').length;
  const recentSessions = sessionsList.slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {currentWorkspace?.name || 'Workspace'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Evidence-verified answers from your documents
          </p>
        </div>
        <Button
          onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}
          icon={<MessageSquare className="w-4 h-4" />}
        >
          Start New Chat
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Documents"
          value={docsList.length}
          detail={`${readyDocs} ready${processingDocs > 0 ? `, ${processingDocs} processing` : ''}`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Chat Sessions"
          value={sessionsList.length}
          detail="Total conversations"
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="Verification Rate"
          value="--"
          detail="Evidence coverage"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <QuickActionCard
          icon={<Upload className="w-6 h-6" />}
          title="Upload Documents"
          description="Add PDFs and DOCX files to build your knowledge base"
          action="Upload"
          onClick={() => navigate(`/workspaces/${workspaceId}/documents`)}
        />
        <QuickActionCard
          icon={<MessageSquare className="w-6 h-6" />}
          title="Ask Questions"
          description="Get verified answers with evidence from your documents"
          action="Start Chat"
          onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}
        />
      </div>

      {/* Recent Sessions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent Sessions</h2>
          {sessionsList.length > 0 && (
            <Link
              to={`/workspaces/${workspaceId}/sessions`}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No sessions yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Start a chat to see your conversation history here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentSessions.map((session) => (
              <SessionRow key={session._id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Document Overview */}
      {docsList.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            <Link
              to={`/workspaces/${workspaceId}/documents`}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            >
              Manage
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-6">
              <DocumentStatusBadge
                icon={<CheckCircle className="w-4 h-4" />}
                label="Ready"
                count={readyDocs}
                color="text-green-600 bg-green-50"
              />
              <DocumentStatusBadge
                icon={<Clock className="w-4 h-4" />}
                label="Processing"
                count={processingDocs}
                color="text-amber-600 bg-amber-50"
              />
              <DocumentStatusBadge
                icon={<XCircle className="w-4 h-4" />}
                label="Error"
                count={docsList.filter((d) => d.status === 'error').length}
                color="text-red-600 bg-red-50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  detail: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all"
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        {action}
        <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

// Type for Convex session from the API
type ConvexSession = {
  _id: Id<"sessions">;
  _creationTime: number;
  query: string;
  mode: "answer" | "draft";
  status: "pending" | "processing" | "completed" | "error";
};

function SessionRow({ session }: { session: ConvexSession }) {
  const navigate = useNavigate();

  const statusIcon = {
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    processing: <TrendingUp className="w-4 h-4 text-blue-500" />,
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  return (
    <button
      onClick={() => navigate(`/sessions/${session._id}`)}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {statusIcon[session.status]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{session.query}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {session.mode === 'answer' ? 'Answer Mode' : 'Draft Mode'} &bull;{' '}
          {new Date(session._creationTime).toLocaleDateString()}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function DocumentStatusBadge({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${color}`}>
      {icon}
      <span className="text-sm font-medium">
        {count} {label}
      </span>
    </div>
  );
}
