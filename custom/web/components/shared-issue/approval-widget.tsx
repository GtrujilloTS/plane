import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useApproval } from "./use-public-issue";

type StoredDecision = { decision: "approved" | "rejected"; name: string };

function getStoredDecision(token: string): StoredDecision | null {
  try {
    const raw = localStorage.getItem(`approval_${token}`);
    return raw ? (JSON.parse(raw) as StoredDecision) : null;
  } catch {
    return null;
  }
}

function storeDecision(token: string, value: StoredDecision) {
  try {
    localStorage.setItem(`approval_${token}`, JSON.stringify(value));
  } catch {}
}

export function ApprovalWidget({ token }: { token: string }) {
  const { submit, submitting } = useApproval(token);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Restore previous decision from localStorage on mount
  useEffect(() => {
    const stored = getStoredDecision(token);
    if (stored) {
      setDecision(stored.decision);
      setName(stored.name);
      setDone(true);
    }
  }, [token]);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setError("");
    setDecision(status);
    try {
      await submit({
        approval_status: status,
        actor_name: name,
        actor_email: email,
        comment_html: comment ? `<p>${comment}</p>` : "",
      });
      storeDecision(token, { decision: status, name: name.trim() });
      setDone(true);
    } catch {
      setError("Error al enviar la respuesta. Intenta de nuevo.");
      setDecision(null);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-subtle bg-surface-1 p-5 text-center space-y-2">
        {decision === "approved" ? (
          <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
        ) : (
          <XCircle className="mx-auto h-8 w-8 text-red-500" />
        )}
        <p className="text-sm font-medium text-primary">
          {decision === "approved" ? "Aprobado correctamente." : "Rechazado correctamente."}
        </p>
        <p className="text-xs text-tertiary">Tu respuesta ha sido registrada.</p>
        <button
          onClick={() => {
            localStorage.removeItem(`approval_${token}`);
            setDone(false);
            setDecision(null);
            setName("");
            setEmail("");
            setComment("");
          }}
          className="text-xs text-accent-primary hover:underline"
        >
          Cambiar respuesta
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface-1 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-primary">Se requiere tu aprobación</h2>
        <p className="text-xs text-tertiary mt-0.5">
          Revisa el contenido y registra tu decisión.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Tu nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-subtle bg-layer-1 px-3 py-2 text-sm text-primary placeholder:text-placeholder outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
        />
        <input
          type="email"
          placeholder="Tu email (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-subtle bg-layer-1 px-3 py-2 text-sm text-primary placeholder:text-placeholder outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
        />
      </div>

      <textarea
        placeholder="Comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-subtle bg-layer-1 px-3 py-2 text-sm text-primary placeholder:text-placeholder outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleDecision("approved")}
          disabled={submitting}
          style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
          className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
        >
          <CheckCircle className="h-4 w-4" />
          Aprobar
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={submitting}
          style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
        >
          <XCircle className="h-4 w-4" />
          Rechazar
        </button>
      </div>
    </div>
  );
}
