import { useState } from "react";
import { Send } from "lucide-react";

type Props = {
  onSubmit: (payload: { actor_name: string; actor_email: string; comment_html: string }) => Promise<unknown>;
};

export function ExternalCommentForm({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !text.trim()) {
      setError("El nombre y el comentario son requeridos.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ actor_name: name, actor_email: email, comment_html: `<p>${text}</p>` });
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError("Error al enviar el comentario. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-subtle bg-surface-1 p-4">
      <p className="text-xs font-medium text-secondary">Agregar comentario</p>

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
        placeholder="Escribe tu comentario..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-subtle bg-layer-1 px-3 py-2 text-sm text-primary placeholder:text-placeholder outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        {sent && <span className="text-xs text-green-500">Comentario enviado.</span>}
        <button
          type="submit"
          disabled={submitting}
          className="ml-auto flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
