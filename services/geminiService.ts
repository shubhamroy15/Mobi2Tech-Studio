

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AspectRatio, ProductDetails } from "../types";
import { fileToBase64, getMimeType } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY || "YOUR_API_KEY" });

const fileToGenerativePart = async (file: File) => {
    const base64Data = await fileToBase64(file);
    return {
      inlineData: {
        data: base64Data,
        mimeType: getMimeType(file),
      },
    };
};

const getCanvasDescription = (aspectRatio: AspectRatio): string => {
    switch (aspectRatio) {
        case "16:9":
            return "a 1500 pixel wide landscape canvas with a 16:9 aspect ratio";
        case "9:16":
            return "a 1500 pixel tall portrait canvas with a 9:16 aspect ratio";
        case "4:3":
            return "a 1500 pixel wide landscape canvas with a 4:3 aspect ratio";
        case "3:4":
            return "a 1500 pixel tall portrait canvas with a 3:4 aspect ratio";
        case "1:1":
        default:
            return "a 1500x1500 pixel square canvas";
    }
};

export const compositeProductImage = async (
    productImage: File,
    backgroundPrompt: string,
    isTransparent: boolean,
    aspectRatio: AspectRatio
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const imagePart = await fileToGenerativePart(productImage);

    const canvasDescription = getCanvasDescription(aspectRatio);

    let prompt = '';
    if (isTransparent) {
        prompt = `You are an expert photo editor. Take the provided product image and perfectly isolate the main product from its original background. The final output must be just the product on a transparent background. Ensure the edges are exceptionally clean with no halos or artifacts. The output canvas must be ${canvasDescription}, with the product perfectly centered while leaving approximately 10% padding on all sides.`;
    } else {
        prompt = `You are a world-class product photographer and retoucher. Your task is to perform a professional product photo composite.
        1.  **Isolate Product:** Perfectly isolate the main product from the provided image. The mask must be flawless with clean edges and no halos.
        2.  **Create Background:** Generate a new, photorealistic background based on this description: "${backgroundPrompt}". The background should be high-quality, whether it's a studio or lifestyle setting.
        3.  **Composite:** Place the isolated product onto the new background.
        4.  **Integrate:** This is critical. Analyze the lighting in the new background and realistically adjust the product's lighting, shadows, and highlights to match the scene perfectly. The product's color grading must be harmonized with the background.
        5.  **Add Shadow:** Create a natural, soft contact shadow underneath the product to ground it in the scene. The shadow must be consistent with the direction and softness of the main light source.
        6.  **Final Output:** The final image must be ${canvasDescription}. Center the product within this canvas, leaving approximately 10% padding on all sides. Preserve all original texture and fine details of the product. The final result should look like a real, professionally shot photograph.`;
    }

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    const firstPart = response.candidates?.[0]?.content?.parts[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return firstPart.inlineData.data;
    }
    throw new Error("No image data received from API.");
};

export const editImageWithPrompt = async (
    sourceImage: File,
    prompt: string
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const imagePart = await fileToGenerativePart(sourceImage);
    const textPart = { text: prompt };
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    const firstPart = response.candidates?.[0]?.content?.parts[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return firstPart.inlineData.data;
    }
    throw new Error("No image data received from API.");
};

export const generateImage = async (
    prompt: string,
    aspectRatio: AspectRatio,
    options: { negativePrompt?: string; seed?: number } = {}
): Promise<string> => {
    const model = 'imagen-4.0-generate-001';

    const config: {
        numberOfImages: number;
        outputMimeType: string;
        aspectRatio: AspectRatio;
        negativePrompt?: string;
        seed?: number;
    } = {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio,
    };

    if (options.negativePrompt) {
        config.negativePrompt = options.negativePrompt;
    }
    if (options.seed !== undefined) {
        config.seed = options.seed;
    }

    const response = await ai.models.generateImages({
        model,
        prompt,
        config,
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }
    throw new Error("No image data received from API.");
};

export const copyProductStyle = async (
    sourceImages: File[],
    targetImage: File,
    options: {
        copyProductStyle: boolean;
        copyBackgroundStyle: boolean;
        isTransparent: boolean;
        prompt?: string;
    }
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const { copyProductStyle, copyBackgroundStyle, isTransparent, prompt: additionalPrompt } = options;

    if (!copyProductStyle && !copyBackgroundStyle && !isTransparent) {
        throw new Error("At least one copy option or transparent background must be selected.");
    }
    
    try {
        const sourceImageParts = await Promise.all(sourceImages.map(fileToGenerativePart));
        const targetImagePart = await fileToGenerativePart(targetImage);

        let prompt = `You are a world-class product photographer and retoucher specializing in professional photographic style transfer.
        You will be given one or more 'source style' images and one 'target product' image.
        Your task is to re-render the 'target product' image, meticulously applying stylistic elements from the 'source style' images while adhering to strict preservation rules.

        **Primary Directive: The target product's physical form, shape, dimensions, texture, patterns, and structural details MUST be preserved exactly.** You are only to copy stylistic cues like color, lighting, shadows, reflections, and surface material properties from the source. The target product must remain recognizable and true to its original form.

        The source images are provided first, followed by the target product image.
        `;
        
        if (additionalPrompt) {
            prompt += `
            **Additional User Instructions:**
            -   Incorporate the following specific instruction: "${additionalPrompt}". This instruction should modify or override the style transfer where applicable, especially concerning the background or overall mood.
            `;
        }
        
        if (isTransparent) {
            if (copyProductStyle) {
                prompt += `
                **Goal: Isolate and re-style the target product on a transparent background.**
                1.  Analyze the lighting, texture rendering, and overall aesthetic from the source images.
                2.  Apply this style to the target product, following the Primary Directive above.
                3.  Isolate the re-styled product perfectly from any background.
                4.  The final output must be ONLY the product on a transparent background. Ensure edges are flawless with no halos.
                5.  The output canvas must be a 1500x1500 pixel square. Center the product within this canvas, leaving approximately 10% padding on all sides.
                `;
            } else {
                prompt += `
                **Goal: Isolate the target product on a transparent background WITHOUT re-styling.**
                1.  The source images provided should be ignored for styling purposes.
                2.  Perfectly isolate the main product from the 'target product' image. The mask must be flawless with clean edges and no halos.
                3.  CRITICAL: Preserve the product's original lighting, color grading, texture, and overall appearance. DO NOT alter the product's look in any way.
                4.  The final output must be ONLY the product on a transparent background.
                5.  The output canvas must be a 1500x1500 pixel square. Center the product within this canvas, leaving approximately 10% padding on all sides.
                `;
            }
        } else {
            if (copyProductStyle) {
                prompt += `
                **Goal: Style Transfer for Product ONLY (Original Background MUST be Preserved)**
                1.  **Analyze Style:** Analyze the 'source style' images for their comprehensive photographic style (lighting, color, shadows, reflections, mood).
                2.  **Apply to Product:** Apply this style ONLY to the main product within the 'target product' image.
                3.  **Preserve Background (CRITICAL):** The background of the 'target product' image MUST BE PRESERVED EXACTLY AS IS. DO NOT change, alter, or replace the background in any way. The re-styled product must be seamlessly blended back into its original, untouched background.
                4.  **Preserve Product Form:** You must adhere to the main Primary Directive: Maintain the original product’s physical shape, texture, and all structural details during the style transfer.
                `;
            }

            prompt += `
            **Final Output Requirements:**
            -   The final image must be a photorealistic, professional-grade photograph.
            -   The canvas must be a 1500x1500 pixel square.
            -   The main product must be perfectly centered, leaving approximately 10% padding on all sides.
            `;
        }

        const textPart = { text: prompt };
        const allParts = [...sourceImageParts, targetImagePart, textPart];

        const response = await ai.models.generateContent({
            model,
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const firstPart = response.candidates?.[0]?.content?.parts[0];
        if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        }
        throw new Error("The AI service did not return an image. This might be due to a content safety policy. Please try a different image or prompt.");
    } catch (e: any) {
        console.error('Gemini API Error in copyProductStyle:', e);
        if (e instanceof Error) {
            throw new Error(`Image processing failed: ${e.message}`);
        }
        throw new Error('An unknown network or API error occurred.');
    }
};


export const generateStyledBackground = async (
    sourceImages: File[],
    additionalPrompt?: string
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    
    try {
        const sourceImageParts = await Promise.all(sourceImages.map(fileToGenerativePart));

        let prompt = `You are an expert background designer for product photography.
        You will be given one or more 'source style' images.
        Your task is to generate a new, photorealistic background that perfectly matches the style of the source images.

        **Analysis:**
        -   Analyze the background in the source images, noting its texture, color palette, lighting, depth of field, and overall ambiance (e.g., studio, lifestyle, rustic, modern).
        -   If there are multiple source images, derive an average or a harmonious blend of these stylistic elements.

        **Final Output Requirements:**
        -   The final image must be a photorealistic, high-quality background.
        -   The canvas must be a 1500x1500 pixel square.
        -   The background should be suitable for placing a product on it later. Ensure there is a clear surface or area where a product could realistically sit.
        `;

        if (additionalPrompt) {
            prompt += `
            **Additional User Instructions:**
            -   Incorporate the following specific instruction: "${additionalPrompt}". This instruction should modify or override the style transfer where applicable.
            `;
        }

        const textPart = { text: prompt };
        const allParts = [...sourceImageParts, textPart];

        const response = await ai.models.generateContent({
            model,
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const firstPart = response.candidates?.[0]?.content?.parts[0];
        if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        }
        throw new Error("The AI service did not return a background image. This might be due to a content safety policy. Please try a different image or prompt.");
    } catch(e: any) {
        console.error('Gemini API Error in generateStyledBackground:', e);
        if (e instanceof Error) {
            throw new Error(`Background generation failed: ${e.message}`);
        }
        throw new Error('An unknown network or API error occurred while generating the background.');
    }
};

export const compositeProductWithBackground = async (
    targetImage: File,
    backgroundImage: File,
    options: {
        copyProductStyle: boolean;
        sourceStyleImages?: File[];
    }
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const { copyProductStyle, sourceStyleImages } = options;

    try {
        const targetImagePart = await fileToGenerativePart(targetImage);
        const backgroundImagePart = await fileToGenerativePart(backgroundImage);
        const sourceStyleParts = sourceStyleImages ? await Promise.all(sourceStyleImages.map(fileToGenerativePart)) : [];

        let prompt = `You are a world-class product photographer and retoucher. Your task is to perform a professional product photo composite using a provided product image and a provided background image.
        The images are provided in this order: ${sourceStyleImages && sourceStyleImages.length > 0 ? 'source style images, ' : ''}target product, then background.
        `;
        
        if (copyProductStyle && sourceStyleImages && sourceStyleImages.length > 0) {
            prompt += `
            **Primary Directive: The target product's physical form, shape, dimensions, texture, patterns, and structural details MUST be preserved exactly.** You are only to copy stylistic cues from the 'source style' images. The target product must remain recognizable and true to its original form.

            **Step 1: Re-style Product**
            -   First, analyze the 'source style' images to understand the camera angle, lighting, shadow style, and color grading.
            -   Apply this comprehensive photographic style to the 'target product', re-lighting it to match the source style. This must be done while strictly following the Primary Directive.
            
            **Step 2: Composite and Integrate**
            -   Take the re-styled product from Step 1 and place it onto the provided 'background' image.
            -   Analyze the lighting in the 'background' image and ensure the re-styled product's lighting, shadows, and highlights are perfectly harmonized with the scene.
            -   Create a natural, soft contact shadow underneath the product to ground it in the scene.
            `;
        } else {
            prompt += `
            **Step 1: Isolate Product**
            -   Perfectly isolate the main product from the 'target product' image. The mask must be flawless with clean edges and no halos.
            -   CRITICAL: Preserve the product's original lighting, color grading, texture, and overall appearance. DO NOT alter the product's look in any way.
            
            **Step 2: Composite and Add Shadow**
            -   Place the original, unchanged product from Step 1 onto the provided 'background' image.
            -   Create a natural, soft contact shadow underneath the product to ground it in the scene. The shadow must be consistent with the direction and softness of the main light source in the background, but the lighting ON THE PRODUCT ITSELF must not be changed.
            `;
        }

        prompt += `
        **Final Output Requirements:**
        -   The final output should be the composite on the provided background canvas (1500x1500 pixels).
        -   Center the product within the canvas, leaving approximately 10% padding on all sides.
        -   Preserve all original texture and fine details of the product.
        -   The final result should look like a real, professionally shot photograph.
        `;

        const textPart = { text: prompt };
        const allParts = [...sourceStyleParts, targetImagePart, backgroundImagePart, textPart];

        const response = await ai.models.generateContent({
            model,
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });
        
        const firstPart = response.candidates?.[0]?.content?.parts[0];
        if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        }
        throw new Error("The AI service did not return the final composite image. This could be due to a content safety policy.");
    } catch(e: any) {
        console.error('Gemini API Error in compositeProductWithBackground:', e);
        if (e instanceof Error) {
            throw new Error(`Image composition failed: ${e.message}`);
        }
        throw new Error('An unknown network or API error occurred during the final composition.');
    }
};


export const generateProductDetails = async (
    productImage: File
): Promise<ProductDetails> => {
    try {
        const model = 'gemini-2.5-flash';
        const imagePart = await fileToGenerativePart(productImage);
        const prompt = `You are a professional technical writer and product marketer. Analyze the provided product image and generate a complete set of product details. Identify the product and provide concise, accurate, and well-formatted information for each of the following fields. If a field is not applicable or information cannot be determined from the image, state "Not available from image".`;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        specifications: { type: Type.STRING, description: 'Detailed technical specifications (e.g., dimensions, material, weight, connectivity).' },
                        usageInstructions: { type: Type.STRING, description: 'Clear, step-by-step instructions on how to use the product.' },
                        compatibility: { type: Type.STRING, description: 'Information on what other devices, software, or systems this product is compatible with.' },
                        maintenanceTips: { type: Type.STRING, description: 'Tips for cleaning, storing, and maintaining the product to ensure longevity.' },
                        performanceMetrics: { type: Type.STRING, description: 'Key performance indicators (e.g., battery life, charging time, speed, power output).' },
                        warranty: { type: Type.STRING, description: 'A standard or plausible warranty statement for this type of product.' },
                        status: { type: Type.STRING, description: 'The current status or condition of the product shown (e.g., "New", "In use", "Charging").' }
                    },
                    required: ['specifications', 'usageInstructions', 'compatibility', 'maintenanceTips', 'performanceMetrics', 'warranty', 'status']
                }
            }
        });

        try {
            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error("API returned empty details.");
            }
            const parsedJson = JSON.parse(jsonText);
            return parsedJson as ProductDetails;
        } catch (e) {
            console.error("Failed to parse JSON response from API:", response.text);
            throw new Error("Could not read the product details from the AI. The format might be incorrect.");
        }
    } catch (e: any) {
        console.error('Gemini API Error in generateProductDetails:', e);
        if (e instanceof Error) {
            throw new Error(`Failed to generate details: ${e.message}`);
        }
        throw new Error('An unknown network or API error occurred while generating product details.');
    }
};
