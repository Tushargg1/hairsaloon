---
name: Heritage Gold & Walnut
colors:
  surface: '#191206'
  surface-dim: '#191206'
  surface-bright: '#413829'
  surface-container-lowest: '#130d03'
  surface-container-low: '#221b0d'
  surface-container: '#261f11'
  surface-container-high: '#31291b'
  surface-container-highest: '#3c3425'
  on-surface: '#efe1cb'
  on-surface-variant: '#d8c2bd'
  inverse-surface: '#efe1cb'
  inverse-on-surface: '#382f21'
  outline: '#a08c88'
  outline-variant: '#534340'
  surface-tint: '#ffb4a2'
  primary: '#ffb4a2'
  on-primary: '#522216'
  primary-container: '#4a1c10'
  on-primary-container: '#c5806e'
  inverse-primary: '#8a4e3f'
  secondary: '#f3bb90'
  on-secondary: '#4a2808'
  secondary-container: '#643e1c'
  on-secondary-container: '#e0aa80'
  tertiary: '#ffb4aa'
  on-tertiary: '#5d1712'
  tertiary-container: '#55110d'
  on-tertiary-container: '#d9756a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#370e04'
  on-primary-fixed-variant: '#6d382a'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#f3bb90'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#643e1c'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#400203'
  on-tertiary-fixed-variant: '#7b2d26'
  background: '#191206'
  on-background: '#efe1cb'
  surface-variant: '#3c3425'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system establishes a **Vintage-Luxury** aesthetic that balances the tactile warmth of a classic 1920s barbershop with the sleek performance of modern SaaS. It targets high-end grooming establishments and their discerning clientele, evoking feelings of craftsmanship, heritage, and exclusive comfort.

The visual direction is a curated blend of **Glassmorphism** and **Tactile Luxury**. It utilizes semi-transparent walnut surfaces and "frosted wood" effects to create depth, while metallic brass accents provide a structural, premium feel. The interface should feel as substantial as a leather-bound chair and as precise as a straight razor.

**Design Principles:**
- **Atmospheric Depth:** Use layered transparency to mimic the dim, warm lighting of a classic salon.
- **Metallic Precision:** Use brass and bronze for interactive elements to signify value and durability.
- **Classic Legibility:** High-contrast serif headlines for a sense of "The Daily News" editorial authority, paired with ultra-functional sans-serif body text.

## Colors

The palette is rooted in organic, masculine materials: wood, leather, and brass.

- **The Foundation:** The interface defaults to a dark mode utilizing a semi-transparent Dark Walnut. This acts as the "canvas," allowing background blurs to pull through the rich tones of the imagery.
- **The Accents:** Warm Brass and Burgundy Leather are used exclusively for primary actions and highlights.
- **Typography:** Antique Cream is the primary text color to avoid the harshness of pure white, maintaining a soft, aged paper feel.
- **Glow Effects:** Interactive elements utilize an "Amber Glow" (outer glow/drop shadow) to mimic the warmth of incandescent filament bulbs.

## Typography

This system uses a traditional pairing that reflects editorial luxury.

- **Headlines:** Playfair Display provides a sophisticated, high-contrast serif look. Use "Display" sizes for landing sections and "Headline" sizes for page titles.
- **Body & UI:** Inter ensures maximum legibility for scheduling, pricing, and data-heavy SaaS dashboards. 
- **Labels:** Use `label-md` for buttons and navigation items. The slight letter spacing and uppercase styling mimic vintage signage.
- **Hierarchy:** Maintain clear distinction between the "expressive" serif and "functional" sans-serif. Serif is for storytelling and titles; Sans-serif is for the "work" of the application.

## Layout & Spacing

The layout philosophy follows a **Fixed-Width Grid** for desktop to maintain a "contained" and curated feel, transitioning to a fluid layout for mobile.

- **Grid:** A 12-column grid is used for desktop (1280px max-width). Components should feel generously spaced to evoke a sense of unhurried luxury.
- **Rhythm:** Use the 8px base unit. Larger gaps (lg, xl) should be used between sections to allow the "Walnut" glass surfaces to breathe.
- **Margins:** 24px gutters on desktop; 16px margins on mobile to maximize screen real estate for booking flows.
- **Reflow:** On mobile, side-by-side card layouts should stack vertically, and the navigation should transform into a bottom-anchored bar for ease of thumb-reach during booking.

## Elevation & Depth

Hierarchy is established through transparency and light rather than just shadows.

- **Base Layer:** A dark, textured background (or mahogany-colored gradient).
- **Surface Layer:** Use `rgba(35, 15, 8, 0.85)` with a `backdrop-filter: blur(12px)`. This creates the glass-morphism effect.
- **Outlines:** Instead of heavy shadows, use 1px borders in Muted Bronze (#8B6942) with 30-50% opacity to define component edges.
- **Amber Glow:** High-priority elements (like active booking buttons) receive an outer glow using `rgba(255, 191, 0, 0.15)` with a 20px blur to simulate the warmth of a lamp.
- **Z-Index:** Modals and dropdowns should use a slightly lighter walnut tint with a stronger 24px blur to sit clearly above the page content.

## Shapes

The design uses **Rounded** (Level 2) geometry to soften the professional interface, making it feel approachable yet structured.

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Large cards and sections use 1rem (rounded-lg) to 1.5rem (rounded-xl) for a more organic, upholstered feel.
- **Pill Shapes:** Reserved exclusively for status indicators (e.g., "Confirmed" or "Available") and specialized tags to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons use a linear gradient from #B8860B to #C8956C. Text should be Deep Espresso (#2C1810) for maximum contrast. On hover, the "Amber Glow" should intensify.
- **Inputs:** Dark Walnut background with a 1px Muted Bronze border. When focused, the border shifts to Warm Brass and a subtle inner glow is applied.
- **Cards:** Utilize the semi-transparent walnut surface. Header areas of cards should have a thin bronze separator line (0.5px).
- **Chips/Status:** Use the Success Olive (#A89048) or Error Crimson (#9B3B3B) with low opacity backgrounds (15%) and solid color text for a "stamped" or "inked" appearance.
- **Lists:** Use Inter for list items. Each row should be separated by a low-opacity bronze divider. Use the "Chevron Right" icon in Warm Brass to indicate drill-down actions.
- **Specialized Component - "The Barber’s Slot":** For booking times, use a grid of brass-bordered boxes that fill with a solid brass color and dark text when selected.