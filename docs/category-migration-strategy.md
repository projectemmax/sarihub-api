# Marketplace Category Migration Strategy

This migration changes SariHub categories from a flat medical catalog to a marketplace hierarchy.

## Schema Changes

- `Category.slug` is added for stable category identifiers.
- `Category.parentId` is added as a self-reference to support unlimited nesting.
- `Category.sortOrder` is added for admin-controlled ordering.
- `Category.name` is no longer globally unique, so labels can repeat in different branches.
- `Category.deletedAt` and `Category.variantTemplate` are removed from the category model.
- `Product.categoryId` remains a single foreign key to one category record.

## Safe Deployment Steps

1. Back up the database before applying the migration.
2. Export current category data if `variantTemplate` values need to be preserved elsewhere.
3. Run `npx prisma migrate deploy`.
4. Run `npx prisma generate`.
5. Run `npm run db:seed` or `npx prisma db seed` to insert marketplace categories.
6. Verify `GET /categories/tree` returns the expected hierarchy.
7. Verify existing products still have valid `categoryId` values.
8. Reassign legacy medical products to marketplace subcategories where needed.

## Product Category Path

Products continue to store only `categoryId`.

Example:

```text
Wireless Earbuds
categoryId = Audio
```

The display path is derived by walking `Category.parentId`:

```text
Electronics > Audio
```

No duplicate product category fields are stored.
