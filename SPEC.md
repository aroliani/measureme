# MEASUREME: App Spec

**App type:** React web app (single page, Tailwind CSS, hash routing between screens). The body model is an SVG mannequin whose shape is computed from the user's measurements. It rotates using CSS 3D transforms and simple left/right drag. This keeps it light while still feeling interactive.

**Brand lockup:** MEASUREME / *Because Weight Isn't a Size.*
**Core idea:** "Don't make the body fit the size. Make the size understandable for the body."
**Formula shown on the site:** YOUR BODY + YOUR CLOTHES = YOUR FIT.

## Visual Identity
- **Background:** warm ivory `#F6F2EC`. Cards in `#FBF9F5`. Soft beige borders `#E6DED2`.
- **Type color:** charcoal `#1E1C1A`. Muted text `#6F6A63`.
- **Accent:** one muted terracotta/clay color `#B5643C`, used sparingly for CTAs, markers and the confidence meter. No pink, neon or gradient overload.
- **Fonts:** a large editorial serif for headings (e.g. "Fraunces" or "Instrument Serif") and a clean grotesk for UI text (e.g. "Inter"). Labels are uppercase with wide letter-spacing, like `STEP 01 / 03`.
- **Layout:** clean 12-column grid, generous whitespace, cards rounded to 14–18px, hairline borders, almost no shadows. Icons are minimal line icons. No photos of women, no cartoons, no AI sparkles, no chatbot bubbles.
- **Motion:**
  - the landing mannequin rotates slowly
  - measurement markers fade in one after another
  - garment cards lift 2px on hover
  - confidence numbers count up from 0 to their value
  - pages fade/slide between screens
  - uploads show a scanning line during extraction

## Navigation
- **Top bar:** MEASUREME wordmark on the left. Links: Dashboard, Body, Wardrobe, Fit Check, Mix & Match, Outfit Generator. Becomes a hamburger menu on mobile.
- **Footer:** brand lockup, a short note on the responsible-design principle, and a `Remix on Berrry` link to `/remix`.

## Screens

### 1. Landing
- **Hero:** the headline "Your body is more than a number." and the subheadline "MEASUREME helps you understand how clothes fit your body — beyond weight and generic size labels."
- **CTAs:** "Build My Body Profile" (primary) and "See How It Works" (secondary, scrolls down).
- **Hero visual:** a slowly rotating faceless mannequin.
- **How it works:** a 4-step strip, BODY MEASUREMENTS → BODY MODEL → GARMENT → FIT, with a thin connecting line and numbered steps.
- **Statement section:** "80 KG IS NOT A SIZE." in huge type, with the supporting text "Two people can weigh the same and still have completely different body measurements."
  - Below it, two mannequin silhouettes of the same weight but different proportions, each with neutral measurement labels.
  - No judgment and no "better/worse" framing.

### 2. Body Profile (onboarding, steps 01–03)
- **Title:** "Let's measure what actually matters." with a `STEP 01 / 03` progress bar.
- **Step 1:** Height, Bust, Waist, Hip, entered in large cm inputs. Weight sits in a small, secondary field with the microcopy "Weight helps provide context, but clothing fit depends on more than one number."
- **Step 2 (optional):** Shoulder Width, Upper Arm, Torso Length, Inseam, each with a short "how to measure" tooltip.
- **Step 3:** name and review.
- **CTA:** "Create My Body".
- **Storage:** the profile is saved to localStorage. A demo profile is pre-filled: bust 120, waist 105, hip 125, upper arm 40, height 165.

### 3. Personalized Body Model
- **Hero mannequin:** a large, neutral-toned mannequin with no face and no features (smooth head shape), drawn with non-sexualized, simplified curves.
- **How the shape is built:** shoulder, bust, waist, hip and arm widths are calculated from the measurements. Height scales the figure vertically.
- **Controls:**
  - Front / Side / Back toggle (the side view uses the depth estimate)
  - Zoom + / −
  - drag to rotate
- **Markers:** leader lines that appear one by one, e.g. BUST 120 cm, WAIST 105 cm, HIP 125 cm, UPPER ARM 40 cm. Weight is never shown here.
- **"Your body profile" card:** "Your body is unique. MEASUREME uses your measurements to understand how garments may interact with your proportions."
- **CTA:** "Add Your First Garment".

### 4. Dashboard
- **Header:** "Good morning, [Name]", with the greeting changing by time of day.
- **Main card:** a mini mannequin with Bust, Waist, Hip and Height.
- **Quick actions:** a 4-tile grid with FIT CHECK, IMPORT GARMENT, MY WARDROBE, CREATE OUTFIT.
- **Recently Checked:** a horizontal list of garments with their confidence.
- **Your Wardrobe:** garment count, broken down by category.

### 5. My Wardrobe
- **Category filters:** ALL / TOPS / BOTTOMS / DRESSES / OUTERWEAR.
- **Card grid:** 3–4 columns on desktop, 2 on mobile. Each card shows the garment image (an SVG flat-lay illustration for mock items, or the uploaded image), name, category, a color swatch and a fit status pill (e.g. "Fit confidence: 89%").
- **Seed data:**
  - White Blouse (89%)
  - Black Wide-Leg Trousers (93%)
  - Beige Blazer (82%)
  - Navy Midi Dress
  - Blue Relaxed Shirt
  - A-Line Skirt
- **CTAs:** "+ Import Garment" (primary) and "Generate Outfit" (secondary).

### 6. Import Garment
- **Title:** "Bring any garment into your wardrobe."
- **Subtext:** "Upload a clothing image. MEASUREME will identify the garment and separate it from the rest of the image."
- **Upload area:** a large drag-and-drop zone with a dashed beige border, accepting a screenshot, product photo or a photo of the user's own clothing.
- **Processing:** the image appears with a scanning-line animation and the text "Identifying garment…", then "Separating from background…".
- **Mock AI result:**
  - category auto-chips for TOP / BOTTOM / OUTERWEAR / DRESS, which the user can change
  - an extraction preview: the image center-cropped with a soft mask/vignette on a neutral backdrop
  - a detected color
  - visual attributes
- **Optional real AI:** the Pollinations vision API can be used to guess category and attributes, falling back to mock results.
- **Honest messaging:** "Visual analysis available" plus "Add garment measurements for higher fit confidence." It never claims exact measurements from the image.

### 7. Garment Details
- **Title:** e.g. "WHITE OVERSIZED BLOUSE", with a Category tag.
- **Visual attribute chips:** Relaxed fit, Long sleeve, Button-up, Hip length.
- **Garment measurements form:** Bust width, Waist width, Shoulder, Sleeve, Length, Hip (for bottoms), entered from the seller's size chart. A size selector (S–4XL) lets the user store several sizes.
- **Live result:** FIT CONFIDENCE 89%, with a "Why?" breakdown: Bust GOOD, Waist RELAXED, Upper Arm SLIGHTLY FITTED, Length SUITABLE.

### 8. Fit Check
- **Layout:** a "YOUR BODY" card + a "GARMENT" picker, then a large "CHECK FIT" button.
- **Result:**
  - verdict, e.g. "LIKELY SUITABLE"
  - a confidence ring/meter that animates from 0 to 89%
  - breakdown rows: BUST Good ease, WAIST Comfortable, UPPER ARM Slightly fitted, LENGTH Suitable
  - Overall: GOOD MATCH
- **Disclaimer:** "Prediction based on your body and garment measurements."
- **Fit logic:** ease = garment − body.
  - below 0 → Tight / may require alteration
  - 0–4 cm → Fitted
  - 4–10 cm → Good ease
  - 10–18 cm → Relaxed
  - above 18 cm → Loose
  - Confidence is a weighted score, reduced when garment measurements are missing.

### 9. View on My Body
- **Visual:** the mannequin wearing a garment overlay. The SVG garment is shaped to the body, and its silhouette widens or narrows according to ease.
- **Controls:** FRONT / SIDE / BACK, ZOOM + / −, ROTATE.
- **"Your Fit" panel:** Bust — Good, Waist — Relaxed, Upper Arm — Slightly fitted, Length — Suitable.
- **"Compare another size":** a split view with two mannequins showing size A and size B side by side, each with its own confidence.

### 10. Mix & Match
- **Slots:** TOP / BOTTOM / OUTER. Each opens a wardrobe drawer to pick from.
- **Preview:** the layered outfit on the mannequin.
- **"CHECK COMPLETE LOOK":** returns four analysis bars, BODY FIT, PROPORTION, LAYERING and OCCASION, plus a result headline such as "Strong fit combination".
- **Scope:** only the clothing combination is evaluated, never the body.

### 11. AI Outfit Generator
- **Title:** "Create a fit for my day."
- **Inputs (chip selectors):**
  - Occasion: Work, Casual, Dinner, Formal, Travel
  - Style: Minimal, Smart Casual, Classic, Street, Feminine, Relaxed
  - Weather: Hot, Mild, Cool, Rainy
- **Generate:** builds modular piece lists (via Pollinations text, with a mock fallback): TOP OPTIONS ×3, BOTTOM OPTIONS ×3, OUTER OPTIONS ×3.
- **Combining:** the user picks one per row to combine, then hits "View on My Body". It never outputs a single fixed outfit.

## Responsible Design (applies everywhere)
- **Never include:** weight-loss or calorie features, body scores, attractiveness ratings, "ideal/perfect body", before/after comparisons, slimming tips, or face recognition.
- **Banned words:** "flattering", "slimming", "hides".
- **Allowed fit vocabulary:** fitted, relaxed, loose, tight, suitable, may require alteration.

## Data
- **Modular mock objects:** `bodyProfile`, `garments[]` (id, name, category, color, image, attributes, sizes{size: measurements}) and `fitResult`.
- **Persistence:** everything is saved to localStorage, with the structure kept easy to swap for real APIs later.
- **Responsive:** works on mobile and desktop.