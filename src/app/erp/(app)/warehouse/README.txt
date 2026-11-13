JAAD ERP WAREHOUSE V9

This version specifically corrects the previous mistake.

- The Inventory Register keeps the previous six-column design:
  SKU | Item | Quantity | Location | Status | Actions
- No new database column is required.
- No SQL migration is required.
- The previous missing-column error for reorder_qty is removed.
- SKU is generated automatically when Add inventory item is clicked.
- Hover/click the item name to see the item details.
- The details popup has Print / Save PDF.
- Low stock remains red; In stock remains green.
- Ambient, Cold Room, Frozen, Secure, Quarantine and Oversize remain visually distinct.
- Reorder Queue reviews items already at/below their existing reorder_level.
- Dashboard is NOT included and is NOT changed.

Install:
Replace only the files in src/app/(app)/warehouse/ with these files.
Then restart the dev server if needed.
