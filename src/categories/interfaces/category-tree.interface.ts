export interface CategoryTreeNode {
  id: string;
  name: string;
  children: CategoryTreeNode[];
}

export interface AdminCategoryTreeNode extends CategoryTreeNode {
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children: AdminCategoryTreeNode[];
}
