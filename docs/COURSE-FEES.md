# Course fees and master package comparison

The reusable React/TypeScript module is exported from `src/components/course-fees/index.ts` and integrated at `/programmes/python-full-stack#pricing`. Homepage programme comparison links to it. It uses Tailwind, Lucide and the shared four colour palettes.

```tsx
import { CourseFeesComparison, type PackageSelection } from './components/course-fees';

export function ProgrammeFees() {
  async function proceed(selection: PackageSelection) {
    // Pass the ID to your enrolment pipeline. The price fields are display snapshots.
    // Authentication, plan validation and final pricing belong to your server.
    const query = new URLSearchParams({ package: selection.packageId, checkout: '1' });
    window.location.assign(`/student-panel?${query}`);
  }

  return <CourseFeesComparison initialView="packages" onProceed={proceed}/>;
}
```

The default catalogue adapts the existing `src/data/programmes.ts` curriculum and prices rather than duplicating them. All internal amounts use integer paise. Eleven individual fees total **₹1,57,000**. Standard is **₹59,999** (**₹97,001 less**), Premium is **₹79,999** (**₹77,001 less**) and Elite is **₹99,999** (**₹57,001 less**). Savings are computed from the current catalogue; equal or higher package prices display the appropriate difference without claiming a discount.

`catalogue` accepts a typed `CourseFeeCatalogue` for another published INR programme. `initialView` accepts `individual`, `packages` or `savings`. `initialPackageId` seeds the selected radio option; if it is absent or no longer available, the first published package is selected. Optional `counsellingHref` supplies a discussion link for each package. Empty catalogues show empty states. Invalid or unsafe prices, duplicate identifiers and incomplete programme information disable the pricing UI.

`onProceed` receives `programmeId`, `packageId`, `packageName`, `currency`, `priceMinor`, `individualTotalMinor` and `savingsMinor`. It can return a promise. While pending, package controls are disabled and repeated clicks dispatch once. A rejected callback shows a recoverable message and permits retry. The component does not create an order or claim a payment result.

The website passes only the package ID and checkout intent in the Student Panel URL. An authenticated prospect opens the billing view with the matching package from their **server-provided learning plan**. An unavailable package requires explicit review of the recommendation. Existing orders and enrolled accounts retain their existing payment paths. Anonymous visitors are asked to sign in; the built-in sign-in destination preserves the selected package and only accepts a fixed local workspace return path. A real identity provider must preserve and validate the return destination when connected. No live checkout is available without the backend and payment provider described in [STUDENT-PANEL.md](STUDENT-PANEL.md).

Tabs support Left/Right arrows, Home and End with roving focus and labelled tab panels. Tables have captions and scoped headers. The savings table scrolls within a labelled, keyboard-focusable region on narrow screens. Prices and typography respond to all four shared palettes and reduced-motion preferences.
