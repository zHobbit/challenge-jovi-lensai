# LensAI · JOVI V70 — Protótipo Web (Sprint 2)

**FIAP · Challenge JOVI · 2026**
Victor Holanda — **RM571263**

Assistente de câmera com IA para o smartphone JOVI V70. Analisa iluminação,
composição e profundidade em tempo real e aplica os melhores ajustes com 1 toque,
ensinando o usuário através de um *score* de foto.

---

## Como abrir

Abra o arquivo **`index.html`** em qualquer navegador moderno (Chrome, Edge, Firefox).
Basta dar **duplo clique** — não é necessário servidor nem internet: a fonte (Inter)
e o Tailwind CSS estão embutidos na pasta `vendor/`.

> Dica: a experiência é **mobile first**. Para ver como no celular, abra o DevTools
> (F12) e ative o modo dispositivo (Ctrl+Shift+M), ou acesse pelo próprio celular.

---

## Tecnologias (dentro do escopo da Sprint 2)

- **HTML5** — estrutura semântica das telas e seções
- **CSS3** — animações, glassmorphism, visor de câmera, responsividade
- **JavaScript (puro)** — jornada interativa, estado, `localStorage`, scroll animation
- **Tailwind CSS** — utilitários de layout e estilo (embutido em `vendor/tailwind.js`)

Nenhuma biblioteca ou framework fora deste escopo foi utilizado.

---

## Estrutura

```
LensAI-Sprint2/
├─ index.html            → página + todas as telas do protótipo
├─ css/styles.css        → estilos, animações e responsividade
├─ js/app.js             → lógica da jornada interativa
├─ vendor/
│  ├─ tailwind.js        → Tailwind CSS (offline)
│  └─ inter-latin.woff2  → fonte Inter (offline)
└─ README.md
```
