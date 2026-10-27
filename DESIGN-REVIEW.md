# Reference-matched illustrated edition

The supplied October 27 reference is the visual source of truth. The earlier grid presentation has been replaced with an illustrated restaurant: dark timber walls, wooden doors and shelves, six metal gas hobs, two sinks, a dish cabinet, three dining tables, reception desk, grocer counter, office furniture and tropical plants. All interactive stock, orders, workers and quantities are real HTML driven by game state over that artwork.

Stock uses one representative heap per ingredient and a live quantity below, including spices. The painting never determines quantity. Storage can show six ingredient types and any engine-supported quantity. Plate sizes and counts remain visible.

All workers use overhead people in owner-specific apron colours. The start screen offers four selectable chefs, each tied to a distinct apron colour. The same character artwork is used in the live game. These are four preset looks; independent hair/face/clothing customisation is not implemented.

The plan has separate zoom and pan, plus Whole plan to fit it into the available space. Own orders stay below the plan. Other players' recipes are behind Team, while workers remain visible on the floor. Recipe cards show plate requirements, ingredient/spice have/need counts, cooking progress and actions. Extra ingredients appear as excess quantities. Long recipes and additional tickets scroll.

Unused rooms in early scenarios are clearly marked as opening in a later restaurant. Their furniture is decorative and has no action targets. Actual occupied/free slot counts come from the unchanged rules engine. Static hobs without an enabled worker station are decorative. Prepared-meal artwork is representative of recipe categories, rather than a unique illustration for every recipe.

## Verification

- Browser rendering: all 13 scenarios, each with 1–4 players (52 cases), preserving the exact engine worker-slot counts, no script errors.
- Interactions: chef choice, name entry, solo campaign, taking orders, plate selection, two simultaneous dishwashers, cooking-station occupation, Team, shop and office, zoom in and Whole plan.
- Responsive screenshots: 1366×1024, 1280×960, 1194×834, 1024×768, 768×1024 and 390×844. No page-width overflow in the responsive checks. Smaller overview modes offer zoom for comfortable tapping and reading.
- Existing 215-run gameplay simulation suite uses the actual current inline rules engine. This visual update does not change mechanics or transport.

Physical iPad Safari touch behaviour and multiplayer on separate devices remain unverified. Preview access is still owner-private.
