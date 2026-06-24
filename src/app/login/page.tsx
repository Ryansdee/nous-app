"use client";
import { useRef, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const USERS = [
  { name: "Ryan", email: "ryan@nous.app", initial: "R", color: "#0A84FF", bg: "rgba(10,132,255,0.08)" },
  { name: "Sarah", email: "sarah@nous.app", initial: "S", color: "#FF2D55", bg: "rgba(255,45,85,0.08)" },
];

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleLogin() {
    if (selected === null || !password || loading) return;
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, USERS[selected].email, password);
      router.push("/home");
    } catch {
      setError("Mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  function selectUser(i: number) {
    setSelected(i);
    setPassword("");
    setError("");
    // Amène directement le focus sur le mot de passe après sélection
    requestAnimationFrame(() => passwordRef.current?.focus());
  }

  const formVisible = selected !== null;

  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0B0B0C",
        color: "#FFFFFF",
        fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
        padding: "env(safe-area-inset-top) 24px env(safe-area-inset-bottom)",
      }}
    >
      {/* ZONE TOP — Logo & Titres épurés (Prend 45% de la hauteur) */}
      <div style={{
        flex: "0 0 45%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 800,
          color: "#FFFFFF",
          letterSpacing: "-1.5px",
          marginBottom: 8,
          lineHeight: 1,
        }}>
          Nous
        </h1>
        <p style={{
          fontSize: 14,
          color: "#8E8E93",
          fontWeight: 500,
          letterSpacing: "-0.1px",
        }}>
          Journal partagé · Ryan & Sarah
        </p>
      </div>

      {/* ZONE BOTTOM — Sélecteur & Formulaire (Prend 55% de la hauteur) */}
      <div style={{
        flex: "0 0 55%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
      }}>

        {/* h2 sémantique (le style reste celui d'un label) + couleur remontée
            de #636366 (3.2:1 ✗) à #8E8E93 (5.8:1 ✓), 12px → 13px */}
        <h2
          id="profile-label"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8E8E93",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Sélectionnez votre profil
        </h2>

        {/* User Selection Grid */}
        <div
          role="group"
          aria-labelledby="profile-label"
          style={{ display: "flex", gap: 12, marginBottom: 24 }}
        >
          {USERS.map((u, i) => (
            <button
              key={u.name}
              type="button"
              onClick={() => selectUser(i)}
              aria-pressed={selected === i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "24px 0",
                borderRadius: 14,
                border: selected === i ? `2px solid ${u.color}` : "1px solid #2C2C2E",
                background: selected === i ? u.bg : "#1C1C1E",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                // outline: "none" SUPPRIMÉ → le :focus-visible global reprend la main
              }}
            >
              <div aria-hidden="true" style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "#FFFFFF",
                background: u.color,
              }}>
                {u.initial}
              </div>
              <span style={{
                fontSize: 15,
                color: selected === i ? "#FFFFFF" : "#AEAEB2",
                fontWeight: selected === i ? 600 : 500
              }}>
                {u.name}
              </span>
            </button>
          ))}
        </div>

        {/* Formulaire — vrai <form> : Enter natif + détection par les
            gestionnaires de mots de passe iOS/Android.
            visibility:hidden (et non pointerEvents:none) → réellement
            retiré du parcours clavier/lecteur d'écran tant que rien
            n'est sélectionné. */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
          aria-hidden={!formVisible}
          style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? "translateY(0)" : "translateY(8px)",
            visibility: formVisible ? "visible" : "hidden",
            transition: "opacity 0.25s ease-out, transform 0.25s ease-out, visibility 0.25s",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Champ username caché : permet au gestionnaire de mots de passe
              d'associer le bon compte (ryan@ ou sarah@) */}
          <input
            type="email"
            autoComplete="username"
            value={selected !== null ? USERS[selected].email : ""}
            readOnly
            tabIndex={-1}
            className="sr-only"
            aria-hidden="true"
          />

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#1C1C1E",
            border: "1px solid #2C2C2E",
            borderRadius: 12,
            padding: "14px 16px",
          }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {/* Label réel (caché visuellement) — le placeholder n'est pas un label */}
            <label htmlFor="login-password" className="sr-only">
              Mot de passe
            </label>
            <input
              id="login-password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              placeholder="Saisir le mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none", // OK ici : le focus est porté visuellement par le conteneur
                color: "#FFFFFF",
                fontSize: 16, // 15 → 16 : supprime le zoom automatique iOS au focus
                fontWeight: 500,
              }}
            />
          </div>

          {/* role="alert" → annoncé immédiatement par les lecteurs d'écran */}
          {error && (
            <p role="alert" style={{ color: "#FF453A", fontSize: 13, textAlign: "center", fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: "#FFFFFF",
              color: "#000000",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !password ? "default" : "pointer",
              opacity: loading || !password ? 0.4 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {loading ? "Validation en cours..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}