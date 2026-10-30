// Écran de lancement : identique au splash iOS → aucun « flash » visible
// entre l'ouverture de l'app et l'affichage du contenu.
export default function Splash() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}
    >
      <svg width="72" height="72" viewBox="0 0 100 100" aria-hidden="true" style={{ animation: "fade-in .6s ease both" }}>
        <defs>
          <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF3769" />
            <stop offset="1" stopColor="#1E8CFF" />
          </linearGradient>
        </defs>
        <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill="url(#splash-g)" />
      </svg>
    </div>
  );
}
