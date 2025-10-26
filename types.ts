import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type Tab = 'studio' | 'editor' | 'generator' | 'copier';

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface ImageFile {
  file: File;
  previewUrl: string;
}

export type ExportQuality = 'Standard' | 'High' | 'Maximum';

export interface ProductDetails {
    specifications: string;
    usageInstructions: string;
    compatibility: string;
    maintenanceTips: string;
    performanceMetrics: string;
    warranty: string;
    status: string;
}
