# Tech-Themed UI Design Specification

## Design Direction

Transform the current plain gray/blue UI into a modern, tech-inspired dark theme suitable for an AI/RAG application. The design should feel like a professional developer tool or AI platform.

## Color Palette

### Backgrounds

- **Primary Background**: `#0a0e1a` (deep navy black)
- **Secondary Background**: `#111827` (slightly lighter dark)
- **Surface/Glass**: `rgba(17, 24, 39, 0.8)` with backdrop blur
- **Sidebar Background**: `#0d1117` (GitHub-dark inspired)

### Accent Colors

- **Primary Accent**: `#00d4ff` (tech cyan - for buttons, highlights)
- **Secondary Accent**: `#6366f1` (indigo - for gradients)
- **Glow Color**: `rgba(0, 212, 255, 0.3)` (cyan glow)
- **User Message**: `linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)`
- **AI Message Surface**: `rgba(30, 41, 59, 0.8)` with border

### Text Colors

- **Primary Text**: `#f1f5f9` (off-white)
- **Secondary Text**: `#94a3b8` (muted gray-blue)
- **Muted Text**: `#64748b` (darker muted)

### Borders

- **Default Border**: `rgba(255, 255, 255, 0.08)`
- **Hover Border**: `rgba(0, 212, 255, 0.3)`
- **Active Border**: `rgba(0, 212, 255, 0.5)`

## Effects

### Glassmorphism

```css
.glass {
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Glow Effects

- Input focus: `box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2), 0 0 20px rgba(0, 212, 255, 0.1)`
- Button hover: subtle cyan glow
- Active session item: left border accent

### Gradients

- Background gradient: `linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)`
- Accent gradient: `linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)`

## Typography

- Font family: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Headings: font-weight 600
- Body: font-weight 400
- Monospace for code/technical elements: `JetBrains Mono, monospace`

## Spacing & Radius

- Border radius (cards/messages): `12px`
- Border radius (buttons): `8px`
- Border radius (inputs): `12px`
- Spacing scale: maintain current but slightly increase padding

## Animations

- Message appear: fade-in + slight translateY
- Loading indicator: pulsing glow instead of simple pulse
- Sidebar item hover: smooth background transition
- Button hover: scale(1.02) + glow

## Component Specifications

### SessionSidebar

- Background: `#0d1117`
- Active item: left border `#00d4ff`, background `rgba(0, 212, 255, 0.08)`
- Hover: background `rgba(255, 255, 255, 0.05)`
- New chat button: gradient background, glow on hover
- Delete button: red on hover

### ChatMessages

- User message: gradient background (cyan to indigo), white text
- AI message: glass surface, subtle border, off-white text
- Avatar: tech-styled (user = cyan circle, AI = indigo gradient)
- Streaming cursor: blinking cyan bar with glow

### ChatInput

- Container: glass effect at bottom
- Textarea: dark background, cyan focus glow
- Send button: gradient, glow on hover
- Placeholder text: muted gray-blue

### SourcePanel

- Background: `rgba(0, 0, 0, 0.3)`
- Border: subtle cyan tint
- Source items: card-like with left accent border
- Expand/collapse: smooth animation

### Welcome Screen

- Centered layout
- Large gradient text for title
- Subtle animated background effect (optional)
- Muted description text
