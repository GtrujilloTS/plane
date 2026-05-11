import { useState, useEffect } from "react";

export type TPublicIssuePermissions = {
  allow_comments: boolean;
  allow_attachments: boolean;
  allow_approval: boolean;
  show_internal_comments: boolean;
};

export type TPublicIssueAttachment = {
  id: string;
  name: string;
  size: number;
  url: string;
};

export type TPublicIssue = {
  id: string;
  sequence_id: number;
  name: string;
  description_html: string;
  priority: string;
  state: { name: string; color: string; group: string };
  assignees: { display_name: string }[];
  label_details: { name: string; color: string }[];
  attachments: TPublicIssueAttachment[];
  project: { name: string; identifier: string };
  created_at: string | null;
  updated_at: string | null;
  permissions: TPublicIssuePermissions;
  custom_message: string;
};

export type TPublicIssueState =
  | { status: "loading" }
  | { status: "error"; code: number }
  | { status: "success"; data: TPublicIssue };

export function usePublicIssue(token: string): TPublicIssueState {
  const [state, setState] = useState<TPublicIssueState>({ status: "loading" });

  useEffect(() => {
    if (!token) return;

    setState({ status: "loading" });

    fetch(`/api/shared/issue/${token}/`)
      .then(async (res) => {
        if (!res.ok) {
          setState({ status: "error", code: res.status });
          return;
        }
        const data: TPublicIssue = await res.json();
        setState({ status: "success", data });
      })
      .catch(() => setState({ status: "error", code: 0 }));
  }, [token]);

  return state;
}

export type TExternalComment = {
  id: string;
  actor_name: string;
  comment_html: string;
  is_approval_response: boolean;
  approval_status: string | null;
  created_at: string;
  source: "external" | "internal";
};

export function useExternalComments(token: string, enabled: boolean) {
  const [comments, setComments] = useState<TExternalComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = () => {
    if (!enabled) return;
    setLoading(true);
    fetch(`/api/shared/issue/${token}/comments/`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComments(); }, [token, enabled]); // eslint-disable-line

  const postComment = async (payload: { actor_name: string; actor_email: string; comment_html: string }) => {
    const res = await fetch(`/api/shared/issue/${token}/comments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al enviar comentario");
    const comment: TExternalComment = await res.json();
    setComments((prev) => [...prev, comment]);
    return comment;
  };

  return { comments, loading, postComment, refetch: fetchComments };
}

export function useApproval(token: string) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async (payload: {
    approval_status: "approved" | "rejected";
    actor_name: string;
    actor_email?: string;
    comment_html?: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shared/issue/${token}/approve/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al enviar aprobación");
      return await res.json();
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}
