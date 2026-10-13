<!-- ===================================================== -->
<!-- NEXT.JS / REACT PROJECT ENGINEERING PLAYBOOK -->
<!-- ===================================================== -->

# 🚨 Mandatory Rule

Before writing, modifying, optimizing, refactoring, or generating code:

The agent MUST first understand:

- Current architecture
- Rendering strategy
- Data flow
- State management
- Performance impact
- Existing design decisions

Never assume.

Always verify.

---

# 🚨 Next.js Version Rule

This project may use a newer Next.js version than your training data.

Before implementing framework-specific code:

- Verify current Next.js behavior
- Verify App Router APIs
- Verify deprecations
- Verify latest recommendations

Never rely on outdated patterns.

---

# 🚨 UI Modification Rule

Do not modify, redesign, refactor, restyle, restructure, or optimize any UI component unless:

1. I explicitly request a UI change.
2. A functional bug requires it.
3. The current UI blocks the required feature.

Always preserve:

- Layout
- Styling
- Responsiveness
- Bootstrap/Flexbox structure
- Colors
- Typography
- Existing UX

Assume the current UI is approved.

---

# 🚨 Performance First Rule

Performance is a feature.

Every implementation must consider:

- Bundle size
- Hydration cost
- Main-thread work
- LCP impact
- CLS impact
- SEO impact

Before adding any feature ask:

"What is the performance cost?"

---

# Golden Rule

Never optimize after the project becomes slow.

Prevent performance debt before introducing it.

Every feature should include a performance impact review.

---

# =====================================================
# INVESTIGATION WORKFLOW
# =====================================================

Before fixing performance:

1. Measure.
2. Identify bottleneck.
3. Verify with code.
4. Implement.
5. Measure again.

Never optimize from assumptions.

Never optimize directly from Lighthouse suggestions.

Metrics are symptoms.

Components are causes.

Always identify the source first.

---

# =====================================================
# SERVER VS CLIENT COMPONENTS
# =====================================================

Default:

Use Server Components.

Use Client Components ONLY when required.

Valid reasons:

- useState
- useEffect
- Browser APIs
- Event handlers
- Interactive UI

Every new Client Component must answer:

- Why can this not be a Server Component?
- What hydration cost does it introduce?

Question every "use client".

---

# =====================================================
# DATA FETCHING RULES
# =====================================================

Prefer:

- Server fetching
- Async Server Components
- RSC patterns

Avoid:

- Client fetching when unnecessary
- Duplicate requests
- Waterfalls

Always use:

- Promise.all for independent requests

Audit:

- Sequential requests
- Duplicate requests
- Re-fetches

---

# =====================================================
# REACT QUERY RULES
# =====================================================

Before creating a query:

Ask:

1. Does this data need hydration?
2. Can it remain server-only?
3. Is the query user-specific?
4. Is the query above the fold?

---

## Query Keys

Server and Client query keys MUST match.

Always verify:

- Query key structure
- Auth state variants
- Prefetch keys
- Client hook keys

Avoid:

- Query key mismatches
- Hydration refetches
- Duplicate cache entries

---

## Hydration

Hydration is expensive.

Avoid:

- Duplicate HydrationBoundary trees
- Duplicate dehydrate() calls
- Hydrating unnecessary data

Only hydrate:

- Data used by Client Components

Everything else should remain server-side.

---

# =====================================================
# STATE MANAGEMENT RULES
# =====================================================

Prefer:

- Local state
- Server state
- URL state

Before using Zustand:

Ask:

- Is a global store truly needed?

---

## Zustand

Avoid:

- Full store subscriptions
- Large persisted stores

Prefer:

- Selectors
- Partial subscriptions
- Lazy hydration
- Deferred hydration

Persist only what is necessary.

---

# =====================================================
# PERFORMANCE RULES
# =====================================================

## Heavy Components

Never place heavy components in the critical path.

Examples:

- WebGL
- OGL
- Charts
- Maps
- Video players
- Rich editors
- Complex carousels

Use:

- next/dynamic
- Lazy mounting
- IntersectionObserver
- requestIdleCallback

---

## Dynamic Imports

Heavy libraries must be code-split.

Always evaluate:

- Can this be lazy loaded?
- Is it above the fold?
- Is it immediately needed?

---

## Bundle Size

Before installing any dependency:

Ask:

1. Bundle size?
2. Tree-shaking support?
3. Dynamic import possible?
4. Native alternative exists?

Prefer lightweight solutions.

Enable optimizePackageImports when appropriate.

---

# =====================================================
# IMAGE RULES
# =====================================================

Always use:

- next/image

Always verify:

- sizes
- priority
- fetchPriority
- placeholders

---

## Priority Images

Only the true LCP image should use priority.

Never assign priority to multiple decorative images.

Avoid preload competition.

---

## Image Loading

Avoid:

- Large images above fold
- Missing sizes
- Fill without sizes
- Eager loading below fold

Prefer:

- Lazy loading
- Responsive sizes
- Modern formats

---

# =====================================================
# LCP RULES
# =====================================================

Before optimization:

Identify exact LCP element.

Audit:

- Image source
- Discovery path
- Preload behavior
- Render timing

Never optimize LCP blindly.

---

# =====================================================
# ANIMATION RULES
# =====================================================

Animations are not free.

Before adding animation:

Ask:

- Is it above fold?
- Is it necessary?
- Is CSS sufficient?

---

## Framer Motion

Audit:

- Number of motion components
- whileInView usage
- Nested motion wrappers
- Hydration impact

Avoid:

- Motion wrappers around entire pages
- Excessive stagger trees
- Animating large DOM trees

Prefer CSS when possible.

---

# =====================================================
# RAF RULES
# =====================================================

Every requestAnimationFrame loop must justify itself.

Avoid:

- Multiple continuous loops
- Hidden loops
- Background loops

Required:

- Pause offscreen
- Pause when tab hidden
- Resume only when needed

Audit:

- Sliders
- Marquees
- WebGL
- Custom animations

---

# =====================================================
# RESIZE OBSERVER RULES
# =====================================================

ResizeObserver is expensive.

Before using:

Ask:

Can CSS solve this?

Avoid:

- Large observation trees
- Frequent recalculation

Never combine casually:

- ResizeObserver
- getBoundingClientRect()
- useLayoutEffect()

---

# =====================================================
# USELAYOUTEFFECT RULES
# =====================================================

Default:

useEffect

Only use useLayoutEffect when layout measurement is required.

Audit:

- clientWidth
- clientHeight
- offsetWidth
- offsetHeight
- getBoundingClientRect()

Treat useLayoutEffect as expensive.

---

# =====================================================
# NAVBAR RULES
# =====================================================

Navbar exists on every page.

Every additional dependency in Navbar affects the whole application.

Keep Navbar:

- Lightweight
- Minimally hydrated
- Free of unnecessary logic

Avoid:

- Heavy client providers
- Large modal systems
- Excessive state subscriptions

---

# =====================================================
# SEO RULES
# =====================================================

Never sacrifice SEO for performance.

Preserve:

- Metadata
- Server rendering
- Crawlability
- Semantic HTML

Always evaluate:

- SEO impact
- Accessibility impact

before optimization.

---

# =====================================================
# PERFORMANCE REVIEW CHECKLIST
# =====================================================

Before merging any feature:

- [ ] Production build tested
- [ ] Lighthouse measured
- [ ] Bundle impact reviewed
- [ ] Hydration impact reviewed
- [ ] Query keys verified
- [ ] No duplicate hydration
- [ ] No unnecessary Client Components
- [ ] No unnecessary priority images
- [ ] Dynamic imports reviewed
- [ ] Framer Motion reviewed
- [ ] ResizeObserver reviewed
- [ ] RAF loops reviewed
- [ ] SEO preserved
- [ ] Accessibility preserved

---

# =====================================================
# KNOWN HIGH-COST PATTERNS
# =====================================================

Avoid repeating these mistakes:

- Duplicate React Query hydration
- Multiple HydrationBoundary layers for the same data
- Query key mismatches
- Excessive Framer Motion wrappers
- Large provider trees in root layout
- Unnecessary Client Components
- Unnecessary priority images
- Heavy Navbar hydration
- WebGL in the critical path
- Oversized dehydrated payloads
- Always-running RAF loops
- ResizeObserver overuse
- useLayoutEffect + DOM measurement combinations
- Hydrating data not used by Client Components

---
# =====================================================
# Feature Implementation Protocol
# =====================================================

Before implementing any new feature:

1. Explain architecture choice.
2. Explain rendering strategy.
3. Explain data fetching strategy.
4. Explain state management strategy.
5. Explain performance impact.
6. Explain SEO impact.

Then implement.

For every new feature answer:

- Why Server Component is not sufficient?
- Why Client Component is required?
- Will this add hydration cost?
- Will this affect bundle size?
- Will this affect LCP?
- Will this affect Main Thread Work?
# =====================================================
# REQUIRED RESPONSE FORMAT
# =====================================================

When implementing any feature:

Always explain:

1. What will change
2. Why it is needed
3. Performance impact
4. SEO impact
5. Risk level
6. Alternative approaches

Never make major architectural changes without explanation.

Always prefer the smallest safe change.

