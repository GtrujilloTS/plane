import { CircleDot, User, Clock, Paperclip, Users } from "lucide-react";
import { usePublicIssue, useExternalComments } from "./use-public-issue";
import { ExternalCommentForm } from "./external-comment-form";
import { ApprovalWidget } from "./approval-widget";

const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

function resolveImages(html: string, token: string): string {
  return html.replace(/src="([^"]+)"/g, (match, src) =>
    UUID_RE.test(src) ? `src="/api/shared/issue/${token}/assets/${src}/"` : match
  );
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "#ef4444" },
  high: { label: "Alta", color: "#f97316" },
  medium: { label: "Media", color: "#eab308" },
  low: { label: "Baja", color: "#22c55e" },
  none: { label: "Sin prioridad", color: "#6b7280" },
};

export function PublicIssueView({ token }: { token: string }) {
  const issueState = usePublicIssue(token);

  if (issueState.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="text-sm text-tertiary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (issueState.status === "error") {
    return (
      <div className="flex h-full items-center justify-center px-4 py-24">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <CircleDot className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-primary">
            {issueState.code === 403 || issueState.code === 404
              ? "Enlace inválido o expirado"
              : "No se pudo cargar el issue"}
          </h1>
          <p className="text-sm text-secondary">
            Este enlace puede haber expirado o sido revocado. Contacta a quien te lo compartió.
          </p>
        </div>
      </div>
    );
  }

  const { data: issue } = issueState;
  const priority = PRIORITY_LABELS[issue.priority] ?? PRIORITY_LABELS.none;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs text-tertiary font-medium tracking-wide">
          {issue.project.identifier} · {issue.project.name}
        </p>
        <h1 className="text-2xl font-semibold text-primary">
          {issue.project.identifier}-{issue.sequence_id} · {issue.name}
        </h1>
      </div>

      {/* Mensaje personalizado */}
      {issue.custom_message && (
        <div className="rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm text-secondary">
          {issue.custom_message}
        </div>
      )}

      {/* Propiedades */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 rounded-full border border-subtle px-3 py-1.5 text-xs bg-surface-1">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: issue.state.color }} />
          <span className="text-secondary">{issue.state.name}</span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-subtle px-3 py-1.5 text-xs bg-surface-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: priority.color }} />
          <span className="text-secondary">{priority.label}</span>
        </div>

        {issue.assignees.length > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-subtle px-3 py-1.5 text-xs text-secondary bg-surface-1">
            <User className="h-3 w-3" />
            {issue.assignees.map((a) => a.display_name).join(", ")}
          </div>
        )}

        {issue.label_details?.map((lbl) => (
          <div
            key={lbl.name}
            className="flex items-center gap-1.5 rounded-full border border-subtle px-3 py-1.5 text-xs text-secondary bg-surface-1"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lbl.color }} />
            {lbl.name}
          </div>
        ))}
      </div>

      {/* Descripción */}
      <div className="rounded-lg border border-subtle bg-surface-1 p-5">
        {issue.description_html ? (
          <div
            className="prose prose-sm max-w-none text-primary"
            dangerouslySetInnerHTML={{ __html: resolveImages(issue.description_html, token) }}
          />
        ) : (
          <p className="text-sm text-tertiary italic">Sin descripción.</p>
        )}
      </div>

      {/* Adjuntos */}
      {issue.permissions.allow_attachments && issue.attachments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-secondary">Adjuntos</h2>
          <div className="flex flex-wrap gap-2">
            {issue.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-3 py-2 text-xs text-secondary hover:bg-layer-1 transition-colors"
              >
                <Paperclip className="h-3 w-3 flex-shrink-0" />
                <span className="max-w-[200px] truncate">{att.name}</span>
                {att.size > 0 && (
                  <span className="text-tertiary">({(att.size / 1024).toFixed(0)} KB)</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Aprobación */}
      {issue.permissions.allow_approval && (
        <ApprovalWidget token={token} />
      )}

      {/* Comentarios */}
      {issue.permissions.allow_comments && (
        <ExternalCommentSection token={token} showInternal={issue.permissions.show_internal_comments} />
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-tertiary pt-4 border-t border-subtle">
        <Clock className="h-3 w-3" />
        <span>
          Última actualización:{" "}
          {issue.updated_at
            ? new Date(issue.updated_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>
    </div>
  );
}

function ExternalCommentSection({ token, showInternal }: { token: string; showInternal: boolean }) {
  const { comments, loading, postComment } = useExternalComments(token, true);

  const visible = comments.filter((c) => !c.is_approval_response);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-secondary">
        {showInternal ? "Conversación" : "Comentarios"}
      </h2>

      {loading && <p className="text-xs text-tertiary">Cargando comentarios...</p>}

      {!loading && visible.length === 0 && (
        <p className="text-sm text-tertiary italic">Sé el primero en comentar.</p>
      )}

      <div className="space-y-3">
        {visible.map((c) => {
          const isInternal = c.source === "internal";
          return (
            <div
              key={c.id}
              className={`rounded-lg border p-4 space-y-1 ${
                isInternal
                  ? "border-accent-primary/30 bg-accent-primary/5"
                  : "border-subtle bg-surface-1"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {isInternal && <Users className="h-3 w-3 text-accent-primary flex-shrink-0" />}
                  <span className={`text-xs font-medium ${isInternal ? "text-accent-primary" : "text-primary"}`}>
                    {isInternal ? "Equipo" : c.actor_name}
                    {isInternal && c.actor_name && (
                      <span className="ml-1 font-normal text-tertiary">({c.actor_name})</span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-tertiary flex-shrink-0">
                  {new Date(c.created_at).toLocaleString("es-MX")}
                </span>
              </div>
              <div
                className="text-sm text-secondary prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: c.comment_html }}
              />
            </div>
          );
        })}
      </div>

      <ExternalCommentForm onSubmit={postComment} />
    </div>
  );
}
