export interface ProductDescriptionAiResult {
  description: string;
  highlights: string[];
  keywords: string[];
}

export interface ProductDescriptionPromptInput {
  name: string;
  features: string[];
}
