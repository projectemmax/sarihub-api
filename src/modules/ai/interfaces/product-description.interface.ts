export interface ProductDescriptionAiResult {
  description: string;
  shortDescription: string;
  seoDescription: string;
  tags: string[];
}

export interface ProductDescriptionPromptInput {
  name: string;
  category?: string;
  brand?: string;
  features?: string[];
  specifications?: string[];
  sellerNotes?: string;
}
