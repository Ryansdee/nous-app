"use client";
// « Ajouter mon mot » à un souvenir (chacun a le sien sous la photo).

import { useState } from "react";
import { addWordToMemory, photosOf, type Memory } from "@/lib/firestore";
import { notify } from "@/lib/social";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { partnerNameOf } from "@/lib/couple";
import { haptic } from "@/lib/device";
import { input, primaryButton } from "@/lib/tokens";
import Sheet from "@/components/ui/Sheet";

export default function WordSheet({ memory, onClose }: { memory: Memory | null; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)!;
  const showToast = useUiStore((s) => s.showToast);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const [prevId, setPrevId] = useState<string | null>(null);
  if ((memory?.id ?? null) !== prevId) {
    setPrevId(memory?.id ?? null);
    setText("");
  }

  async function save() {
    if (!memory || !text.trim()) return;
    setSaving(true);
    try {
      await addWordToMemory(memory.id, user.name, text.trim());
      notify({ uid: user.uid, name: user.name, partnerId: user.partnerId }, "word", { memoryId: memory.id, thumb: photosOf(memory)[0] ?? null, text: text.trim() });
      haptic([10, 30, 10]);
      onClose();
      showToast("Mot ajouté");
    } catch {
      showToast("Impossible d'enregistrer ton mot", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={!!memory}
      onClose={onClose}
      eyebrow={memory?.title}
      title="Mon mot"
      locked={saving}
      footer={
        <button type="button" onClick={save} disabled={saving || !text.trim()} className="tap" style={primaryButton}>
          {saving ? "Enregistrement…" : "Ajouter"}
        </button>
      }
    >
      <label htmlFor="word-input" className="sr-only">Ton mot</label>
      <textarea
        id="word-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Ce que ce moment signifie pour toi… (${partnerNameOf(user.name)} le verra)`}
        rows={4}
        autoFocus
        style={{ ...input, resize: "none", lineHeight: 1.45 }}
      />
    </Sheet>
  );
}
