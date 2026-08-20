
---

# `design.md`

```md
# Louga Développement Solidaire — Design System

## 1. Design Source of Truth

The primary visual reference is:

`Louga Développement Solidaire.dc.html`

The implementation must reproduce the visual language and information hierarchy of this reference while using a modern React component architecture.

The goal is:

> Same visual identity and architecture, significantly better technical implementation.

Do not redesign the organization into a completely different visual identity.

Do not introduce unnecessary gradients, glassmorphism, excessive animations, or generic SaaS aesthetics.

This is an NGO/community organization website.

The visual language should communicate:

- solidarity
- trust
- community
- action
- optimism
- professionalism
- human impact
- local engagement

---

# 2. Brand Personality

The website should feel:

- human
- warm
- trustworthy
- modern
- optimistic
- community-oriented
- professional
- accessible

Avoid making it feel:

- corporate
- financial
- overly governmental
- overly luxurious
- excessively technological
- cold
- generic

---

# 3. Primary Color Palette

## Navy

```text
#172642

Primary brand dark color.

Use for:

headings
navigation
dark sections
footer
text
overlays
Green
#87CE18

Use for:

positive indicators
impact statistics
secondary accents
environmental messaging
icons
hover states
Blue
#00A4DE

Use for:

links
informational accents
section labels
healthcare/education accents
icons
interactive states
Orange
#EE7900

Primary action color.

Use for:

donation CTA
primary CTA
important actions
highlighted actions
support section

Orange should communicate:

action / support / participation

Warm background
#FBF9F5

Use for:

alternating sections
donation/support section
warm editorial backgrounds
Secondary warm background
#F5F2EC

Use for:

subtle section backgrounds
cards
supporting surfaces
White
#FFFFFF

Use for:

cards
navigation
clean content sections
contrast surfaces
4. Color Usage Rules

Do not use all brand colors equally.

Recommended hierarchy:

Navy
████████████████


White
████████████


Warm background
████████


Blue
████


Green
███


Orange
███

Navy is the structural color.

Orange is the action color.

Blue is the information color.

Green is the impact/community/environment color.

5. Typography

Primary typography:

Montserrat

Use Montserrat for:

navigation
headings
body
buttons
statistics
labels

Editorial typography:

Lora

Use Lora selectively for:

quotes
emotional statements
campaign messaging
large editorial statements

Example:

"Ensemble, pour le développement de Louga."

The quote should feel editorial and human.

Do not use Lora for the entire website.

6. Typography Hierarchy
Hero heading

Large.

Responsive:

clamp(38px, 5vw, 64px)

Weight:

800

Line-height:

1.05 – 1.15
Section heading

Approximately:

clamp(27px, 3.6vw, 42px)

Weight:

800
Card heading

Approximately:

18px – 21px

Weight:

700 – 800
Body

Approximately:

15px – 17px

Line height:

1.55 – 1.7
Small label

Approximately:

12px – 14px

Use:

uppercase
letter spacing
medium/bold weight

Example:

NOS ACTIONS
7. Layout Philosophy

The website uses a spacious editorial layout.

Do not compress content.

Preferred:

Section
↓
large vertical spacing
↓
content
↓
large vertical spacing

Desktop sections should generally have generous vertical padding.

Approximate:

90px – 130px

depending on section importance.

8. Container

Maximum desktop content width:

1280px

Use responsive horizontal padding.

Example:

6vw

or an equivalent Tailwind implementation.

The website should never allow text to touch the viewport edges.

9. Grid System

Use responsive CSS Grid.

Typical:

desktop:
4 columns


tablet:
2 columns


mobile:
1 column

For missions:

5 cards

should adapt naturally.

Do not force five columns on medium screens.

10. Header

The reference design uses a sticky white header.

Characteristics:

white background
logo left
navigation centered/right
donation CTA
subtle shadow when scrolling
clean spacing

Header should remain visually lightweight.

Initial state:

shadow: none or extremely subtle

Scrolled state:

soft shadow
11. Top Contact Bar

Dark navy background.

Contains:

email
phone
social links

Typography:

small
white
slightly transparent secondary text

Accent icons:

green
blue
orange depending on context

Keep it compact.

12. Navigation

Desktop:

Logo
            Navigation
                         Donation CTA

Navigation items should be:

medium weight
dark navy
clean
no excessive borders

Hover:

blue #00A4DE

Donation button:

orange #EE7900
13. Mobile Navigation

At approximately:

860px

switch to mobile navigation.

Use:

hamburger

Navigation opens vertically.

Mobile menu:

white background
clean separators
large tap targets
donation CTA at bottom

Do not use tiny navigation links.

14. Hero Section

The hero is one of the most important sections.

Structure:

Left
---------
Eyebrow
Heading
Description
CTA
Secondary CTA


Right
---------
Main image
Decorative gradient/accent
Floating information card

The reference uses a large image with a decorative multicolor accent behind it.

Preserve this idea.

Do not overdo the decoration.

15. Hero Image

Hero image:

portrait-oriented where appropriate
rounded corners
large radius
object-fit cover
soft shadow

Approximate radius:

24px – 32px

Use real organization imagery whenever available.

Avoid generic stock photography where possible.

16. Hero Floating Card

Use a small floating card over/near the hero image.

Example:

100% bénévole
Sénégal & diaspora

Characteristics:

white
rounded
soft shadow
small icon circle
subtle floating animation

Animation must be subtle.

17. Hero Statistics

The hero stats are displayed in a white card below the hero.

Characteristics:

white
rounded
large soft shadow
responsive grid
centered values

Number:

32px – 40px

Weight:

800

Label:

12px – 14px

Stats must come from the CMS.

18. Section Headings

Use the following hierarchy:

EYEBROW
Heading
Description

Example:

NOS ACTIONS


Agir concrètement pour notre communauté


Une action locale...

Eyebrow:

uppercase
letter spacing
blue/green/orange depending on section
19. Mission Cards

Mission cards should feel human and visual.

Structure:

Image
Icon
Title
Description

Image:

approximately 4:3
object-fit cover

Card:

background: white
border-radius: 18px – 24px
overflow: hidden

Shadow:

very subtle by default.

Hover:

card rises slightly
shadow becomes stronger

Avoid excessive transforms.

20. Mission Icons

Icons should appear inside circular or rounded containers.

Possible colors:

Blue
Green
Orange
Navy

Use icons that communicate the mission clearly.

Examples:

Education:

GraduationCap

Healthcare:

HeartPulse

Environment:

TreePine

Employment:

Briefcase

Solidarity:

HandHeart
21. Gallery

Gallery should be image-first.

Grid:

desktop: 4 columns where appropriate
tablet: 2 columns
mobile: 1–2 columns

Cards:

rounded
overflow hidden
aspect ratio approximately 4:3
image cover

Overlay:

dark gradient

Caption:

white

at the bottom.

22. Gallery Interaction

Clicking an image opens a lightbox.

Lightbox:

dark overlay
large image
title/caption
close button
previous
next

Support:

Escape
ArrowLeft
ArrowRight

on desktop.

On mobile:

swipe support if practical
large controls
no tiny buttons
23. News Section

News cards should feel editorial rather than like generic blog cards.

Structure:

Image
Category
Date
Title
Excerpt

Image:

aspect-ratio: 16 / 10

Card:

white
rounded
clean
subtle border/shadow

Category should use a brand accent.

24. News Detail

Article page:

Category
Title
Date
Hero image


Article content


Related articles

Use a readable content width.

Recommended:

max-width: 760px

Do not stretch paragraphs across the entire screen.

25. Partners

Partner logos should appear cleanly.

Use:

white cards

or a clean grid.

Logos should:

preserve aspect ratio
not be distorted
have sufficient whitespace
support grayscale if appropriate, but do not force grayscale if it harms branding

Partner section should feel trustworthy rather than commercial.

26. Impact Section

The impact section should create a strong visual transition.

Reference direction:

Navy background
White heading
Green/blue/orange statistics

Use large statistics.

Example:

620
Kits scolaires distribués

Numbers:

36px – 42px

Use subtle count-up animation when the section enters the viewport.

Do not animate every element excessively.

27. Impact Animation

Use intersection observer.

Animation:

0 → final value

Duration:

~1000ms – 1500ms

Use easing.

Respect:

prefers-reduced-motion

If reduced motion is enabled:

Do not animate the counter.

28. Full-width CTA

Use a strong full-width photographic section.

Reference direction:

background image
dark overlay
centered logo
editorial quote
CTA

Example:

"Ensemble, pour le développement de Louga."


[ Rejoindre le mouvement ]

Use Lora for the quote.

The CTA should feel emotional but not manipulative.

29. Donation / Support Section

The support section should have a warm background.

Example:

#FBF9F5

Heading:

Comment nous soutenir ?

Provide clear support methods.

Examples:

Faire un don
Devenir bénévole
Donner du matériel
Soutenir une action
Partager nos actions

Donation information must be CMS-driven.

Do not hardcode phone numbers.

30. Donation CTA

Primary donation button:

#EE7900

Shape:

pill

Example:

border-radius: 9999px

Padding should provide a large clickable area.

31. Footer

Footer should return to the dark navy visual identity.

Include:

logo
organization description
navigation
contact information
social media
donation/support CTA
copyright

Do not overcrowd the footer.

32. Cards

General card rules:

border-radius: 18px – 24px

Shadow:

subtle.

Example philosophy:

shadow:
soft and large
low opacity

Avoid:

hard black shadows

Cards should feel lightweight.

33. Borders

Prefer subtle borders:

rgba(23,38,66,0.08)

Use borders mainly when they improve structure.

Do not put borders around everything.

34. Buttons

Buttons should be rounded.

Primary:

orange

Secondary:

white
navy text
subtle navy border

Possible third style:

blue

Buttons should have:

clear hover
focus state
active state
disabled state
35. Button Hover

Primary:

Orange → Navy

Secondary:

White → subtle navy border/background change

Blue links:

Blue → Navy

Keep transitions around:

200ms – 250ms
36. Animation Philosophy

Animations should be subtle.

Allowed:

fade
translate
scale slightly
count-up
floating card
hover elevation
lightbox transition

Avoid:

excessive parallax
spinning elements
bouncing UI
constant movement
distracting animations

The organization should feel professional and trustworthy.

37. Motion Accessibility

Always respect:

prefers-reduced-motion

Users who request reduced motion should receive a mostly static experience.

38. Image Guidelines

Images are extremely important for this website.

Prefer real photographs of:

volunteers
children
community activities
healthcare initiatives
tree planting
school activities
food distribution
donations
training
local communities

Images should communicate real impact.

Avoid repetitive generic stock imagery.

39. Image Treatment

Use:

object-fit: cover

for cards.

Maintain consistent aspect ratios.

Do not distort images.

Use appropriate alt.

Example:

alt="Distribution de kits scolaires à Louga"

rather than:

alt="image1"
40. Empty States

If content is missing, the design must remain intentional.

Example:

No news:

Aucune actualité disponible pour le moment.

No gallery:

Do not show a broken image grid.

No partners:

Hide the section if appropriate.

41. Loading States

Use elegant skeleton loaders.

Do not show:

Loading...

everywhere.

For cards:

image skeleton
title skeleton
text skeleton

Use subtle neutral surfaces.

42. Error States

Public:

Une erreur est survenue.
Veuillez réessayer.

Admin:

More contextual errors are allowed.

Always provide:

Réessayer

where appropriate.

43. Accessibility Visual Rules

Focus states must be visible.

Never remove:

outline

without replacing it with an accessible focus indicator.

Interactive elements must have sufficient contrast.

Touch targets should generally be at least:

44px
44. Mobile Design

Mobile is not a reduced desktop version.

On mobile:

hero stacks vertically
navigation becomes a drawer/menu
cards become one column
typography scales down
CTA buttons may become full-width
statistics become a 2-column grid where appropriate
gallery adapts naturally
padding decreases but remains generous

Avoid horizontal overflow.

45. Desktop Design

Desktop should take advantage of:

large imagery
whitespace
multi-column grids
asymmetric hero layout
floating cards
wide CTA sections

Maximum content width:

1280px
46. Design Tokens

Recommended tokens:

colors:
  navy: #172642
  green: #87CE18
  blue: #00A4DE
  orange: #EE7900
  warm: #FBF9F5
  warm-muted: #F5F2EC
  white: #FFFFFF


radius:
  sm: 8px
  md: 12px
  lg: 18px
  xl: 24px
  2xl: 32px
  pill: 9999px


spacing:
  section-sm: 72px
  section-md: 96px
  section-lg: 120px


container:
  max-width: 1280px

These values can be adjusted during implementation if necessary to match the reference HTML precisely.

47. Design Consistency

Every section must look like part of the same website.

Maintain:

same radius language
same shadows
same typography
same spacing rhythm
same color hierarchy
same button language
same image treatment

Do not make each section look like a different template.

48. Admin Design

The admin dashboard shares the brand identity but does NOT need to reproduce the public website layout.

Admin should prioritize:

clarity
productivity
data density
navigation
forms
tables
media management

Use:

Navy
White
Light warm/neutral backgrounds
Blue for information
Green for success
Orange for primary actions
Red only for destructive actions

The public website is editorial.

The admin dashboard is functional.

49. Admin Sidebar

Recommended:

Dashboard


CONTENU
Accueil
Missions
Galerie
Actualités
Partenaires
Impact
Soutenir


CONFIGURATION
Informations
Navigation
Réseaux sociaux
SEO


MÉDIAS
Bibliothèque


ADMINISTRATION
Utilisateurs
Rôles
Journal d'activité

Use clear icons.

Avoid overly complex nested navigation.

50. Admin Tables

Tables should be:

readable
compact
sortable where appropriate
searchable
filterable
responsive

On mobile, tables may transform into cards.

51. Admin Forms

Forms should use:

clear labels
helper text
validation
preview
save state
cancel action

Avoid giant forms with dozens of fields on one page.

Group related fields.

52. Content Editor

News editor should support:

title
slug
excerpt
content
image
category
publication status
publication date
SEO fields

Preview should be available where practical.

53. Media Library Design

Media library should feel like a modern content management tool.

Grid:

thumbnail
filename
type
size
date

Actions:

Preview
Copy URL
Edit metadata
Delete

Support:

drag/drop upload
multi-upload
upload progress
preview
54. Design Anti-patterns

Do NOT use:

excessive gradients
glassmorphism
neon colors
excessive rounded containers
huge shadows
excessive animations
generic SaaS dashboards for the public website
random color choices
inconsistent typography
stock-photo-heavy design
excessive icon usage
55. Final Design Goal

The final result should feel like:

Modern Senegalese NGO
+
Professional digital platform
+
Humanitarian storytelling
+
Strong community identity

The visitor should immediately understand:

Who LDS is
What LDS does
Where LDS acts
What impact LDS has
How to support LDS
How to contact LDS

The website should build trust before asking for support.

56. Final Visual Principle

The design should follow this hierarchy:

STORY
  ↓
ACTION
  ↓
IMPACT
  ↓
TRUST
  ↓
SUPPORT

The visitor should first understand the mission.

Then see real actions.

Then see measurable impact.

Then see partners/community credibility.

Then be invited to support.