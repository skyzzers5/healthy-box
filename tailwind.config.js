/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Couleur de marque : titres, boutons, accents
        framboise: {
          DEFAULT: "#C2184B",
          dark: "#9E1240",   // survol des boutons
          soft: "#F7DDE4",   // pastilles, fonds très clairs
        },
        // Remplace les anciennes bandes vert foncé
        peche: {
          DEFAULT: "#FFC6A5",
          soft: "#FFE4D4",
        },
        // Fonds
        creme: "#FDFBF7",
        sable: "#F5F1EA",
        // Pastels des pictogrammes
        menthe: "#DDE8D8",
        rose: "#F9E3E7",
        // Texte
        ardoise: "#3C4238",
        encre: "#22261F",
      },
      fontFamily: {
        // DM Sans pour les titres ET le texte courant
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        // Accents manuscrits, comme sur les stories
        script: ["var(--font-caveat)", "cursive"],
        // Logo « Healthy Box ». Oilvare Base est une police payante :
        // déposer OilvareBase-Regular.woff2 dans public/fonts/ et
        // décommenter le @font-face dans globals.css pour l'activer.
        logo: ["var(--font-logo)", "var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
