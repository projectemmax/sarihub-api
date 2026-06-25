import { Prisma } from "@prisma/client";

export interface CategoryTreeNode {
  id: string;
  name: string;
  variantTemplate?: Prisma.JsonValue | null;
  children: CategoryTreeNode[];
}

export interface AdminCategoryTreeNode extends CategoryTreeNode {
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;

  childCount: number;
  descendantCount: number;

  children: AdminCategoryTreeNode[];
}
