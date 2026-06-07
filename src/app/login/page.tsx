"use client";
import { useState } from "react";
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

  async function handleLogin() {
    if (selected === null || !password) return;
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

  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0B0B0C",
        color: "#FFFFFF",
        fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
        padding: "0 24px",
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

        <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#636366",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          textAlign: "center",
          marginBottom: 16,
        }}>
          Sélectionnez votre profil
        </p>

        {/* User Selection Grid */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {USERS.map((u, i) => (
            <button
              key={u.name}
              onClick={() => { setSelected(i); setPassword(""); setError(""); }}
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
                outline: "none",
              }}
            >
              <div style={{
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

        {/* Password Inputs & CTAs */}
        <div style={{
          opacity: selected !== null ? 1 : 0,
          transform: selected !== null ? "translateY(0)" : "translateY(8px)",
          pointerEvents: selected !== null ? "auto" : "none",
          transition: "all 0.25s ease-out",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#1C1C1E",
            border: "1px solid #2C2C2E",
            borderRadius: 12,
            padding: "14px 16px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              placeholder="Saisir le mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#FF453A", fontSize: 13, textAlign: "center", fontWeight: 500 }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
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
              cursor: "pointer",
              opacity: loading || !password ? 0.4 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {loading ? "Validation en cours..." : "Se connecter"}
          </button>
        </div>
      </div>
    </main>
  );
}