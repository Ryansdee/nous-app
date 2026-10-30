"use client";
// Détail d'un souvenir (ouvert depuis l'activité, une story ou le profil).
// ?c=1 ouvre directement les commentaires.

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMemories } from "@/store/dataStore";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/kit";
import PostCard from "@/components/feed/PostCard";
import CommentsSheet from "@/components/feed/CommentsSheet";
import WordSheet from "@/components/feed/WordSheet";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { memories, loading } = useMemories();
  const memory = memories.find((m) => m.id === id) ?? null;
  const [comments, setComments] = useState<{ focus: boolean } | null>(() => (search.get("c") ? { focus: false } : null));
  const [word, setWord] = useState(false);

  return (
    <Screen transition="push" header={<PageHeader back={{ href: "/home", label: "Fil" }} title="Publication" />}>
      {loading ? (
        <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
          <span className="spinner" />
        </div>
      ) : !memory ? (
        <EmptyState icon="🫥" title="Souvenir introuvable" text="Il a peut-être été supprimé." />
      ) : (
        <>
          <div style={{ paddingTop: 6 }}>
            <PostCard memory={memory} priority onOpenComments={(_, focus) => setComments({ focus: !!focus })} onAddWord={() => setWord(true)} />
          </div>
          <CommentsSheet memory={comments ? memory : null} autoFocus={comments?.focus} onClose={() => setComments(null)} />
          <WordSheet memory={word ? memory : null} onClose={() => setWord(false)} />
        </>
      )}
    </Screen>
  );
}
