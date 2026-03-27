# Design System Specification: High-End Culinary Editorial

## 1. Overview & Creative North Star: "The Obsidian Omakase"
This design system is not a delivery app; it is a digital concierge for a high-end culinary experience. Our Creative North Star is **"The Obsidian Omakase"**—a philosophy that treats the screen as a lacquered tray where negative space is as important as the food itself.

To move beyond the "template" look, we reject the rigid, boxed-in layouts of standard e-commerce. Instead, we utilize **Intentional Asymmetry**. Large-scale typography should overlap high-definition imagery, and product cards should "float" at varying depths. We use a high-contrast scale where display text is unapologetically bold, creating a sense of editorial authority that mirrors a Michelin-star menu.

---

## 2. Color & Surface Architecture
We move away from flat hex codes toward a functional, layered depth model.

### The Palette
- **Primary & CTA:** `primary` (#FFB59D) transitioning into `primary_container` (#F85F27). This creates a "glowing" salmon/coral effect reminiscent of fresh nigiri.
- **Base Atmosphere:** `surface` (#0F131C) and `background` (#0F131C). A deep, ink-like charcoal that allows food photography to pop.
- **Accents:** `secondary` (#C2C1FF) and `tertiary` (#DDC483) provide sophisticated counterpoints—cool lavender and muted gold to denote "Premium" or "Limited Edition" selections.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** Do not use 1px solid lines to separate content. Boundaries must be defined through:
1.  **Background Color Shifts:** Use `surface_container_low` for sections sitting on the `surface` base.
2.  **Vertical Breathing Room:** Use the `20` (5rem) or `24` (6rem) spacing tokens to define new content blocks.

### The "Glass & Gradient" Rule
Floating navigation bars and cart summaries must use **Glassmorphism**. Apply a `surface_variant` color at 60% opacity with a 20px backdrop-blur. For main Action Buttons, use a linear gradient from `primary` to `primary_container` at a 135-degree angle to add a three-dimensional "soul" to the UI.

---

## 3. Typography: Editorial Authority
Our typography pairing balances the "Human" (Inter) with the "Structural" (Plus Jakarta Sans).

| Role | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | Use for Hero headlines. Bold, tight kerning. |
| **Headline** | `headline-md` | Plus Jakarta Sans | 1.75rem | Category names (e.g., "Signature Rolls"). |
| **Title** | `title-lg` | Inter | 1.375rem | Product titles. Clean, legible, high-end. |
| **Body** | `body-md` | Inter | 0.875rem | Descriptions. Use `on_surface_variant` for softness. |
| **Label** | `label-md` | Inter | 0.75rem | Nutritional info, micro-copy. All caps, +5% tracking. |

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "pop"; we use light and layering to create "presence."

*   **The Layering Principle:** Stack `surface-container` tiers. A product card should be `surface_container_highest` (#31353F) resting on a `surface_container_low` (#171C25) background. This creates a natural, soft lift.
*   **Ambient Shadows:** When a modal or floating cart requires a shadow, use a 40px blur with 6% opacity. The shadow color must be a tinted version of `surface_container_lowest` (#0A0E17), not pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline_variant` token at 15% opacity. It should be felt, not seen.
*   **Depth through Motion:** When a user hovers over a menu item, transition the background from `surface_container` to `surface_bright` while subtly scaling the image by 1.05x.

---

## 5. Components

### Buttons: The Signature Action
- **Primary:** Gradient (`primary` to `primary_container`), `xl` (1.5rem) rounded corners. Text in `on_primary_fixed` (Deep Brown/Black).
- **Secondary:** Glassmorphic. Semi-transparent `surface_variant` with a 10% `outline_variant` ghost border.

### Product Cards: The Minimalist Tray
- **Forbid dividers.** Use `spacing-6` (1.5rem) of internal padding.
- Imagery must be "bleeding" (extending to the top and side edges) or strictly centered with a high-key shadow.
- Price should be set in `headline-sm` to emphasize value without clutter.

### Inputs & Search
- Use `surface_container_high` for the input field background. 
- No bottom border. Use `md` (0.75rem) roundedness.
- Floating labels using `label-md` when the field is active.

### Selection Chips (Dietary Filters)
- For "Vegan" or "Spicy," use `tertiary_container` with `on_tertiary_container` text.
- Shape: `full` (pill-shaped) to contrast against the `xl` roundedness of the main cards.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use high-quality, "wet" food photography with dark backgrounds.
*   **Do** allow elements to overlap. A sushi roll image can "spill" out of its container and onto the background `surface`.
*   **Do** use asymmetrical spacing. A 64px left margin with a 40px right margin can make a layout feel designed, not generated.

### Don’t
*   **Don’t** use pure black (#000000) or pure white (#FFFFFF). Use our `surface` and `on_surface` tokens to maintain the premium charcoal-and-soft-white aesthetic.
*   **Don’t** use standard "Add to Cart" icons. Use refined text labels or a minimalist "+" icon with a `primary` circular background.
*   **Don’t** use 1px dividers to separate list items. Use a 12px gap of `surface_container_low` to create a visual break.

---

## 7. Spacing & Rhythm
Rhythm is achieved through the Spacing Scale. Avoid "in-between" values.
- **Containers:** Use `10` (2.5rem) or `12` (3rem) for inner padding.
- **Section Gaps:** Use `20` (5rem) to ensure the interface feels "airy" and expensive.
- **Micro-adjustments:** Use `2` (0.5rem) for the distance between a label and its input field.