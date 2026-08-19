import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, X, Save, MessageSquare } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { getSupervisorNotes, createSupervisorNote } from "@/api/supervisorNotes";
import { useEcho } from "@/hooks/useEcho";

interface NoteRow {
  id: string;
  note: string;
  author_user_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function initials(name: string | null | undefined) {
  if (!name) return "—";
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SupervisorNoteCard() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("supervisor") || hasRole("admin");
  const [note, setNote] = useState<NoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await getSupervisorNotes({ limit: 1, sort: "-created_at" });
      setNote((data?.[0] as NoteRow) || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEcho("supervisor-notes", "SupervisorNoteUpdated", () => load());

  const startEdit = () => {
    setDraft(note?.note ?? "");
    setEditing(true);
  };

  const saveNote = async () => {
    if (!user) return;
    const text = draft.trim();
    if (!text) { toast.error("Write a short note before saving."); return; }
    setSaving(true);

    try {
      await createSupervisorNote({
        note: text,
      });
      setSaving(false);
      toast.success("Supervisor note posted");
      setEditing(false);
      load();
    } catch (error) {
      setSaving(false);
      toast.error(getFriendlyErrorMessage(error, "post the supervisor note"));
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="p-4 bg-primary/5 border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Post Supervisor Note</p>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(false)} disabled={saving}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Share an update, reminder, or priority for today's shift…"
          rows={3}
          maxLength={500}
          autoFocus
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">{draft.length}/500 · Visible to all signed-in users</p>
          <Button size="sm" onClick={saveNote} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> {saving ? "Posting…" : "Post note"}
          </Button>
        </div>
      </Card>
    );
  }

  if (!note) {
    return (
      <Card className="p-4 bg-primary/5 border-primary/20 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">No supervisor note yet.</p>
          {canEdit && (
            <Button variant="link" size="sm" className="px-0 h-auto mt-0.5" onClick={startEdit}>
              Post the first note →
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-primary/5 border-primary/20 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold flex-shrink-0">
        {initials(note.author_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 leading-relaxed">
          <span className="font-semibold">Supervisor Note:</span>{" "}
          {note.note}
        </p>
        <p className="text-xs text-primary mt-1">
          — {note.author_name || "Supervisor"} · {timeAgo(note.created_at)}
        </p>
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs flex-shrink-0" onClick={startEdit}>
          <Pencil className="w-3 h-3" /> Update
        </Button>
      )}
    </Card>
  );
}
