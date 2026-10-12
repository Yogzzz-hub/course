# UX benchmark and design decisions

Research date: 10 October 2026 (Asia/Kolkata).

Method: live public-page retrieval, navigation/content inspection and comparison of accessible journeys. This was **not** a hands-on usability study or a mobile/desktop visual audit of competitors. Responsive behavior, actual contrast, page-transition quality, form completion, private booking states and competitor Core Web Vitals were not verified. Scrimba and freeCodeCamp returned no readable content, so no live observations are attributed to them.

| Source | Observed pattern | Assessment for this academy | Adaptation / exclusion |
| --- | --- | --- | --- |
| [Coursera](https://www.coursera.org/) | Discovery search, multiple hero promotions, career-oriented exploration | Useful in a large catalogue; too many competing paths for one programme | Keep an immediately clear programme CTA; exclude search, carousels and subscription promotions |
| [Great Learning](https://www.mygreatlearning.com/) | Programme cards pair duration and format with a detail-page action | Quick facts help visitors compare; undisclosed formats cannot be borrowed | Show the confirmed seven months and a direct curriculum path; leave mode and schedule unconfirmed |
| [edX](https://www.edx.org/) | Learning proposition supported by outcomes and learner stories | Trust information matters, but another institution's evidence is not transferable | Build trust through transparent information and conditions; exclude invented metrics and testimonials |
| [Udemy](https://www.udemy.com/) | Broad search and goal/category discovery; learner stories link to courses | Discovery breadth serves a marketplace | Exclude categories, filters, badges and promotional urgency; retain a focused programme overview |
| [Codecademy](https://www.codecademy.com/) | Skill-path descriptions surface level, time and learning purpose; practice is explained concretely | Clear paths reduce uncertainty; practice needs an understandable explanation | Connect the stack in a four-layer programme map and five-step journey; exclude embedded IDE, gamification and sign-up wall |
| [Frontend Masters](https://frontendmasters.com/) (redirected to Master.dev during retrieval) | Paths, courses and pricing are separate primary destinations; technology areas are explicit | Topic specificity makes technical learning legible | Use compact technology tags and expandable curriculum; avoid a large catalogue navigation system |
| [Scrimba](https://scrimba.com/) | No readable content retrieved | Insufficient evidence for live evaluation | No unverified interaction claims |
| [freeCodeCamp](https://www.freecodecamp.org/) | No readable content retrieved | Insufficient evidence for live evaluation | No unverified interaction claims |
| [Linear](https://linear.app/) | Concise product proposition paired with concrete workflow demonstrations | Specificity can explain an abstract offering | Use original engineering-layer artwork and an explicitly illustrative build process; do not copy dashboards or product UI |
| [Vercel](https://vercel.com/) | Technical product positioning and product-navigation hierarchy | Relevant inspiration for communicating technical depth | Restrained type hierarchy and precise sectional labels; exclude infrastructure-console imitation |

## Journey matrix

| Journey | Design decision | Why / verification |
| --- | --- | --- |
| A: first visit | Positioning, supplied headline, two actions before illustration | Purpose and next action appear early; screenshot inspection |
| B: programme discovery | One featured programme and a dedicated overview | No unnecessary marketplace decisions; route and link tests |
| C: curriculum | Native expandable details and deep anchor links | Topic lists stay scannable and keyboard accessible; accordion tests |
| D: pricing | Three equivalent package cards plus itemised course table | No fabricated recommendation, discount or identical-package implication; central prices and arithmetic tests |
| E: enquiry/counselling | Minimal enquiry; Calendly with explicit loading consent | No invented slots or booking successes; integration and failure-state tests |
| F: phone | Content-first hero, native modal drawer, vertically stacked cards | Local checks at 320–430px, focus trap, escape and no overflow |
| G: desktop | Asymmetric hero, four-area stack diagram, sticky detail summary | Additional space supports comparison; local 1024–1920px checks |

## Original design contract

- Exact supplied ten-color palette, locally hosted Manrope and Space Grotesk variable fonts.
- Five translucent engineering plates form the signature visual. Original SVG, no third-party image licensing or invented project screenshots.
- Dark introduction → tinted programme → open timeline → silver curriculum spotlight → practical-learning illustration → support → prices → questions → counselling.
- Primary buttons use soft burgundy/silver foreground/background contrast; all interactions have visible keyboard focus.
- Animation is limited to a short entrance, subtle movement and state feedback, with reduced-motion support.
- Native `dialog` provides modal focus containment and native `details` provides accordion semantics. No custom calendar.

## Implementation references

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)

Provider behavior must be rechecked against the actual configured accounts during deployment. Mocked acceptance tests do not verify real email delivery or Calendly availability.
