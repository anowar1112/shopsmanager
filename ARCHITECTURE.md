# Architecture decisions

## 1. Why a separate API instead of a full-stack framework

The shop computer will eventually need offline/PWA behaviour, and a barcode
scanner or a phone app may hit the same data later. A plain SPA plus a REST API
keeps that door open: the web app is just one client, and a service worker can
be added without touching the backend.

## 2. Inventory is a ledger, not a number

`products.stockQuantity` is a **cache**. The truth is
`inventory_transactions`, an append-only table where every row records
`stockBefore`, `stockAfter`, who did it, when, and what caused it
(sale / purchase / manual / adjustment / opening).

Consequences:
- Stock can always be rebuilt and verified against the ledger.
- The audit trail the spec asks for is a by-product, not extra work.
- A voided sale writes a *reversing* row rather than deleting history.

## 3. Money

`Decimal(12,2)` everywhere, never `Float`. The API converts Prisma `Decimal`
objects to plain numbers at the edge (`toNumber`) so the frontend never deals
with a decimal library.

## 4. Snapshots on line items

`sale_items` stores `productName`, `sku`, `unitPrice` **and `costPrice`**.
`purchase_items` does the same. So:
- Renaming or archiving a product never rewrites an old invoice.
- Profit is computed from the cost *at the time of sale*, so changing a
  purchase price tomorrow cannot silently change last month's profit report.

## 5. Nothing financial is hard-deleted

- Products, customers, suppliers, expenses → `deletedAt` soft-delete.
- Sales → `status = VOID` with `voidedBy`, `voidedAt`, `voidReason`.
- Purchases → immutable once inventory has moved.

## 6. Transactions

A sale writes: sale + sale items + one inventory transaction per line +
product stock updates + customer rollups + invoice sequence bump. All of it runs
inside a single `prisma.$transaction`, so stock and money can never disagree.

## 7. Permissions in one place

`packages/shared/src/permissions.ts` holds the permission list and the
role → permission map. The API enforces it in middleware; the web app imports the
same map to hide actions. A new role is one entry, not a scattered audit.

## 8. Multi-shop from day one

Every business table carries `shopId` and every query is scoped by it, taken from
the authenticated user's token — never from the request body. Turning this into a
multi-tenant SaaS later needs no migration.

## 9. Uniform API envelope

Success: `{ success: true, data, meta? }`
Failure: `{ success: false, error: { code, message, fields? } }`

`fields` maps 1:1 onto form inputs, so server-side validation errors can be
shown directly under the right input without special-casing per form.

## 10. Ready for, but not doing yet

- **Barcode** — `products.barcode` exists and is indexed; POS search will check
  it. Nothing else needs to change when a scanner arrives.
- **Offline** — the SPA plus a queue of pending POS writes; the ledger design
  means replaying queued sales is safe.
- **Returns/refunds** — will reuse the reversing-ledger mechanism built for voids.
