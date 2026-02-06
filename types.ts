
// Define ColorValue interface used by Swatch components
export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PromptState {
  word1: string;
  word2: string;
  constraint: string;
}