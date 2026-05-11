"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareModal } from "./share-modal";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
};

export function IssueShareButton({ workspaceSlug, projectId, issueId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-secondary hover:bg-layer-1 transition-colors"
        title="Compartir issue con usuarios externos"
      >
        <Share2 className="h-3.5 w-3.5" />
        Compartir
      </button>

      {open && (
        <ShareModal
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          issueId={issueId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
