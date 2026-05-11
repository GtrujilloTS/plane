"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy, Link2, Trash2, Plus, CheckCircle, Clock, ToggleLeft, Pencil, X, RotateCcw } from "lucide-react";

type TShareToken = {
  id: string;
  token: string;
  label: string;
  expires_at: string | null;
  is_active: boolean;
  is_expired: boolean;
  share_url: string;
  allow_comments: boolean;
  allow_attachments: boolean;
  allow_approval: boolean;
  show_internal_comments: boolean;
};

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  onClose: () => void;
};

const BASE = (slug: string, projectId: string, issueId: string) =>
  `/api/workspaces/${slug}/projects/${projectId}/issues/${issueId}/share-tokens/`;

// Convierte ISO string a valor válido para datetime-local input (YYYY-MM-DDTHH:mm)
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type EditState = {
  label: string;
  expiresAt: string;
  allowComments: boolean;
  allowApproval: boolean;
  allowAttachments: boolean;
  showInternalComments: boolean;
  reactivate: boolean;
};

function TokenForm({
  title,
  state,
  onChange,
  onCancel,
  onSubmit,
  saving,
  error,
  showReactivate,
}: {
  title: string;
  state: EditState;
  onChange: (patch: Partial<EditState>) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string;
  showReactivate?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-subtle bg-layer-1 p-4">
      <p className="text-xs font-medium text-secondary">{title}</p>

      <input
        type="text"
        placeholder="Etiqueta (ej: Para cliente Acme)"
        value={state.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="w-full rounded-lg border border-subtle bg-surface-1 px-3 py-2 text-sm text-primary outline-none placeholder:text-placeholder focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
      />

      <div>
        <label className="text-xs text-tertiary mb-1 block">Expira el (opcional — dejar vacío = sin expiración)</label>
        <input
          type="datetime-local"
          value={state.expiresAt}
          onChange={(e) => onChange({ expiresAt: e.target.value })}
          className="w-full rounded-lg border border-subtle bg-surface-1 px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
        />
        {state.expiresAt && (
          <button
            onClick={() => onChange({ expiresAt: "" })}
            className="mt-1 text-xs text-accent-primary hover:underline"
          >
            Quitar fecha de expiración
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-tertiary">Permisos del cliente externo</label>
        {[
          { label: "Puede comentar", key: "allowComments" as const },
          { label: "Puede aprobar / rechazar", key: "allowApproval" as const },
          { label: "Puede ver y descargar adjuntos", key: "allowAttachments" as const },
        ].map(({ label, key }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="rounded"
            />
            <span className="text-xs text-secondary">{label}</span>
          </label>
        ))}
        <div className="border-t border-subtle pt-2 mt-1">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.showInternalComments}
              onChange={(e) => onChange({ showInternalComments: e.target.checked })}
              className="rounded mt-0.5"
            />
            <div>
              <span className="text-xs text-secondary">Mostrar comentarios públicos del equipo</span>
              <p className="text-xs text-tertiary">
                Solo los marcados con 🌐 serán visibles. Los privados 🔒 nunca se comparten.
              </p>
            </div>
          </label>
        </div>
        {showReactivate && (
          <div className="border-t border-subtle pt-2 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.reactivate}
                onChange={(e) => onChange({ reactivate: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-secondary">Reactivar este enlace</span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-subtle px-4 py-2 text-xs text-secondary hover:bg-layer-1 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 rounded-lg bg-accent-primary px-4 py-2 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM: EditState = {
  label: "",
  expiresAt: "",
  allowComments: false,
  allowApproval: false,
  allowAttachments: false,
  showInternalComments: false,
  reactivate: false,
};

export function ShareModal({ workspaceSlug, projectId, issueId, onClose }: Props) {
  const [tokens, setTokens] = useState<TShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<EditState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit form (keyed by token id)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const url = BASE(workspaceSlug, projectId, issueId);

  const fetchTokens = () => {
    setLoading(true);
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTokens(Array.isArray(data) ? data : []))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTokens(); }, []); // eslint-disable-line

  const createToken = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: createForm.label,
          expires_at: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
          allow_comments: createForm.allowComments,
          allow_approval: createForm.allowApproval,
          allow_attachments: createForm.allowAttachments,
          show_internal_comments: createForm.showInternalComments,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err?.error || `Error ${res.status} al generar el enlace.`);
        return;
      }
      const token: TShareToken = await res.json();
      setTokens((prev) => [token, ...prev]);
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
    } catch {
      setCreateError("Error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (token: TShareToken) => {
    setEditingId(token.id);
    setEditError("");
    setEditForm({
      label: token.label || "",
      expiresAt: isoToDatetimeLocal(token.expires_at),
      allowComments: token.allow_comments,
      allowApproval: token.allow_approval,
      allowAttachments: token.allow_attachments,
      showInternalComments: token.show_internal_comments,
      reactivate: false,
    });
  };

  const saveEdit = async (tokenId: string, isInactive: boolean) => {
    setSaving(true);
    setEditError("");
    try {
      const body: Record<string, unknown> = {
        label: editForm.label,
        expires_at: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
        allow_comments: editForm.allowComments,
        allow_approval: editForm.allowApproval,
        allow_attachments: editForm.allowAttachments,
        show_internal_comments: editForm.showInternalComments,
      };
      if (isInactive && editForm.reactivate) {
        body.is_active = true;
      }
      const res = await fetch(`${url}${tokenId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err?.error || `Error ${res.status} al guardar.`);
        return;
      }
      const updated: TShareToken = await res.json();
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? updated : t)));
      setEditingId(null);
    } catch {
      setEditError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    await fetch(`${url}${tokenId}/revoke/`, { method: "POST", credentials: "include" });
    setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, is_active: false } : t)));
  };

  const deleteToken = async (tokenId: string) => {
    await fetch(`${url}${tokenId}/`, { method: "DELETE", credentials: "include" });
    setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    if (editingId === tokenId) setEditingId(null);
  };

  const copyUrl = (token: TShareToken) => {
    navigator.clipboard.writeText(token.share_url);
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-subtle bg-surface-1 shadow-overlay-200"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent-primary" />
            <h2 className="text-sm font-semibold text-primary">Compartir issue</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-secondary hover:bg-layer-1 hover:text-primary text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Create form */}
          {showCreateForm ? (
            <TokenForm
              title="Nuevo enlace"
              state={createForm}
              onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
              onCancel={() => { setShowCreateForm(false); setCreateError(""); setCreateForm(EMPTY_FORM); }}
              onSubmit={createToken}
              saving={creating}
              error={createError}
            />
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-subtle py-3 text-xs text-tertiary hover:border-accent-primary hover:text-accent-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Generar nuevo enlace
            </button>
          )}

          {/* Token list */}
          {loading && <p className="text-xs text-tertiary text-center py-4">Cargando...</p>}
          {!loading && tokens.length === 0 && (
            <p className="text-xs text-tertiary text-center py-4">No hay enlaces. Genera uno para comenzar.</p>
          )}

          {tokens.map((token) => {
            const isInactive = !token.is_active || token.is_expired;
            const isEditing = editingId === token.id;

            return (
              <div key={token.id} className={`rounded-xl border p-3 space-y-2 ${isInactive ? "border-subtle opacity-60" : "border-subtle"}`}>
                {isEditing ? (
                  <TokenForm
                    title="Editar enlace"
                    state={editForm}
                    onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
                    onCancel={() => { setEditingId(null); setEditError(""); }}
                    onSubmit={() => saveEdit(token.id, isInactive)}
                    saving={saving}
                    error={editError}
                    showReactivate={isInactive}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary truncate">
                          {token.label || "Sin etiqueta"}
                        </p>
                        <p className="text-xs text-tertiary truncate mt-0.5">{token.share_url}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isInactive ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#16a34a" }}>
                            <CheckCircle className="h-3 w-3" /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-tertiary">
                            <ToggleLeft className="h-3 w-3" />
                            {token.is_expired ? "Expirado" : "Revocado"}
                          </span>
                        )}
                      </div>
                    </div>

                    {token.expires_at && (
                      <p className="flex items-center gap-1 text-xs text-tertiary">
                        <Clock className="h-3 w-3" />
                        Expira: {new Date(token.expires_at).toLocaleString("es-MX")}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => copyUrl(token)}
                        className="flex items-center gap-1 rounded-lg border border-subtle px-2.5 py-1.5 text-xs text-secondary hover:bg-layer-1 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === token.id ? "Copiado" : "Copiar"}
                      </button>

                      <button
                        onClick={() => startEdit(token)}
                        className="flex items-center gap-1 rounded-lg border border-subtle px-2.5 py-1.5 text-xs text-secondary hover:bg-layer-1 transition-colors"
                      >
                        {isInactive ? <RotateCcw className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                        {isInactive ? "Reabrir / Editar" : "Editar"}
                      </button>

                      {!isInactive && (
                        <button
                          onClick={() => revokeToken(token.id)}
                          className="flex items-center gap-1 rounded-lg border border-subtle px-2.5 py-1.5 text-xs text-secondary hover:bg-layer-1 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Revocar
                        </button>
                      )}

                      <button
                        onClick={() => deleteToken(token.id)}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ml-auto transition-colors"
                        style={{ borderColor: "#fecaca", color: "#ef4444" }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
