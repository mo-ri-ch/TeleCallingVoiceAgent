"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeChunk } from "@/lib/types";
import { useKnowledgeStore } from "@/store/knowledge-store";

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter((tag) => tag.length > 0)
    )
  );
}

interface KnowledgeChunkDialogProps {
  companyId: string;
  chunk?: KnowledgeChunk;
  trigger: ReactNode;
}

export function KnowledgeChunkDialog({
  companyId,
  chunk,
  trigger,
}: KnowledgeChunkDialogProps) {
  const addChunk = useKnowledgeStore((state) => state.addChunk);
  const editChunk = useKnowledgeStore((state) => state.editChunk);

  const isEditing = chunk !== undefined;

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(chunk?.text ?? "");
  const [sourceTitle, setSourceTitle] = useState(chunk?.sourceTitle ?? "");
  const [tagsInput, setTagsInput] = useState(chunk?.tags.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setText(chunk?.text ?? "");
      setSourceTitle(chunk?.sourceTitle ?? "");
      setTagsInput(chunk?.tags.join(", ") ?? "");
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Chunk text is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const tags = parseTags(tagsInput);
      const title = sourceTitle.trim() || "Manual Entry";

      if (isEditing) {
        await editChunk(companyId, chunk.id, { text: text.trim(), sourceTitle: title, tags });
      } else {
        await addChunk(companyId, { text: text.trim(), sourceTitle: title, tags });
      }
      handleOpenChange(false);
    } catch {
      setError("Could not save the chunk. Check that the backend is running.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Knowledge Chunk" : "Add Custom Chunk"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this entry. Search results reflect the change immediately."
                : "Add a manual FAQ or fact. It becomes searchable alongside crawled content."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chunk-title">Title</Label>
              <Input
                id="chunk-title"
                placeholder="e.g., Festive Offer FAQ"
                value={sourceTitle}
                onChange={(event) => setSourceTitle(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chunk-text">Content</Label>
              <Textarea
                id="chunk-text"
                rows={5}
                placeholder="e.g., We are currently offering a 10% discount on the MERN Stack course for early enrollments."
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chunk-tags">Tags</Label>
              <Input
                id="chunk-tags"
                placeholder="fees, placement, duration"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Used to group and filter chunks.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
