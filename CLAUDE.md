## Design Context

### Users
Mixed roles use this system: support agents triaging and resolving tickets, managers/admins monitoring SLAs and assigning consultants, and customers submitting tickets. Each role has different priorities — agents need speed and clarity, managers need oversight and analytics, customers need simplicity. Users spend extended time in the interface, so it must reduce fatigue and support sustained focus.

### Brand Personality
**Modern, clean, efficient.** The system should feel like a well-designed, contemporary SaaS tool — streamlined and purposeful. Every element earns its place. The interface communicates competence without being cold, and sophistication without being showy.

**Emotional goals:** Calm & focus, efficiency & speed, trust & professionalism, confidence & control. Users should feel in command of their workflow with minimal cognitive load.

### Aesthetic Direction
**Reference:** Jira / ServiceNow — power-user focused with dense data, configurable views, and workflow-heavy interfaces. The system prioritizes function and information density for experienced users who need to move fast through queues and data.

**Anti-references:**
- **NOT dated & corporate** — no flat gray enterprise look from 2010, no legacy software aesthetics
- **NOT over-designed & flashy** — no gratuitous animations, no gradients everywhere, no style over substance

**Theme:** Light mode (soft lavender #FAF8FF base) and dark mode (deep blue-black #111318) supported via next-themes. Primary: Deep Blue (#003A8F). Accent: Vibrant Orange (#D83A03) for alerts and high-priority actions.

**Typography:** Manrope font family, weights 300-800, with a defined hierarchy from 3.5rem display to 0.75rem technical labels.

**Effects:** Glassmorphism on dialogs, ambient shadows on floating elements, ghost borders. Framer Motion for purposeful transitions only.

### Design Principles

1. **Information density over whitespace** — Power users need data-rich views. Prioritize showing relevant information without requiring extra clicks, but maintain clear visual hierarchy so density doesn't become clutter.

2. **Function first, form follows** — Every visual choice must serve usability. No decorative elements that don't aid comprehension, navigation, or task completion. Animations should communicate state changes, not entertain.

3. **Consistent surfaces, clear hierarchy** — Use the MD3-inspired surface system (surface → surface-container-lowest → highest) to create depth and grouping. Cards, tables, and panels should have predictable visual weight.

4. **Accessible by default** — Meet WCAG 2.1 AA standards. Ensure sufficient contrast ratios, full keyboard navigation, screen reader support, and visible focus indicators throughout.

5. **Role-adaptive clarity** — Design views that serve multiple user roles without compromise. Use progressive disclosure: simple at first glance for customers, power-user features readily available for agents and admins.

### Technical Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4 with custom design tokens in CSS variables
- **Components:** Shadcn/UI (new-york style) + Radix UI primitives
- **Icons:** Lucide React
- **Animation:** Framer Motion + tw-animate-css
- **State:** Redux Toolkit
- **Charts:** Recharts
- **Theme:** next-themes (light/dark)
