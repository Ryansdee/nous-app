import { PEOPLE } from "@/lib/couple";
import { BRAND } from "@/lib/tokens";

type Props = {
  name: string;
  size?: number;
  /** Anneau dégradé (stories / profil actif) */
  ring?: boolean;
  /** Anneau gris (déjà vu) */
  seen?: boolean;
};

/** Avatar à initiale, couleur propre à chacun (Ryan bleu, Sarah rose). */
export default function Avatar({ name, size = 32, ring, seen }: Props) {
  const person = PEOPLE[name as keyof typeof PEOPLE];
  const bg = person ? `linear-gradient(135deg, ${person.soft}, ${person.color})` : BRAND;
  const inner = (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFF",
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {name ? name[0].toUpperCase() : "?"}
    </span>
  );
  if (!ring && !seen) return inner;
  const pad = size > 40 ? 3 : 2;
  return (
    <span style={{ display: "inline-flex", padding: pad, borderRadius: "50%", background: seen ? "#3A3A3E" : BRAND, flexShrink: 0 }}>
      <span style={{ display: "inline-flex", padding: pad, borderRadius: "50%", background: "#000" }}>{inner}</span>
    </span>
  );
}

/** Deux avatars qui se chevauchent : le profil du couple. */
export function CoupleAvatar({ size = 80 }: { size?: number }) {
  const s = Math.round(size * 0.68);
  return (
    <span aria-hidden="true" style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <span style={{ position: "absolute", left: 0, top: 0, borderRadius: "50%", boxShadow: "0 0 0 3px #000" }}>
        <Avatar name="Ryan" size={s} />
      </span>
      <span style={{ position: "absolute", right: 0, bottom: 0, borderRadius: "50%", boxShadow: "0 0 0 3px #000" }}>
        <Avatar name="Sarah" size={s} />
      </span>
    </span>
  );
}
