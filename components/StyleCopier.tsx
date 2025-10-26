

import React, { useState, useCallback } from 'react';
import { ImageFile, ProductDetails } from '../types';
import ImageDropzone from './ImageDropzone';
import MultiImageDropzone from './MultiImageDropzone';
import Spinner from './Spinner';
import { copyProductStyle, generateProductDetails, generateStyledBackground, compositeProductWithBackground } from '../services/geminiService';
import { DownloadIcon, InfoIcon, CopyIcon, CheckIcon, TrashIcon } from './Icons';
import { downloadImage, base64ToFile } from '../utils/fileUtils';

const StyleCopier: React.FC = () => {
    // Image state
    const [sourceImages, setSourceImages] = useState<ImageFile[]>([]);
    const [targetImage, setTargetImage] = useState<ImageFile | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
    const [copiedSuggestionIndex, setCopiedSuggestionIndex] = useState<number | null>(null);

    // Image generation options
    const [copyProductStyleToggle, setCopyProductStyleToggle] = useState(true);
    const [copyBackgroundStyleToggle, setCopyBackgroundStyleToggle] = useState(false);
    const [isTransparent, setIsTransparent] = useState(false);

    // Product details state
    const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
    const [productDetailsEnabled, setProductDetailsEnabled] = useState(false);

    // Loading and error states
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // New state for two-step composition
    const [generatedBackground, setGeneratedBackground] = useState<string | null>(null);
    const [compositeStep, setCompositeStep] = useState<'initial' | 'preview' | 'final'>('initial');


    const handleSourceImagesAdd = useCallback((files: File[]) => {
        const maxFiles = 5;
        const newImageFiles = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));
        setSourceImages(prev => {
            const combined = [...prev, ...newImageFiles];
            return combined.slice(0, maxFiles);
        });
    }, []);

    const handleSourceImageRemove = useCallback((index: number) => {
        setSourceImages(prev => prev.filter((_, i) => i !== index));
    }, []);


    const handleTargetImageDrop = useCallback((file: ImageFile) => {
        setTargetImage(file);
        setResultImage(null);
        setProductDetails(null);
        setCompositeStep('initial');
    }, []);

    const handleInitialGenerate = async () => {
        if (sourceImages.length === 0 || !targetImage) {
            setError('Please upload both source and target images.');
            return;
        }
        if (!copyProductStyleToggle && !copyBackgroundStyleToggle && !isTransparent) {
            setError('Please select at least one copy option or transparent background.');
            return;
        }
    
        setIsGeneratingImage(true);
        setError(null);
        setResultImage(null);
        setGeneratedBackground(null);
    
        if (copyBackgroundStyleToggle && !isTransparent) {
            setCompositeStep('preview');
            try {
                const bg = await generateStyledBackground(
                    sourceImages.map(f => f.file),
                    additionalPrompt
                );
                setGeneratedBackground(bg);
            } catch (e) {
                console.error(e);
                if (e instanceof Error) {
                    setError(e.message);
                } else {
                    setError('An unexpected error occurred while generating the background.');
                }
                setCompositeStep('initial');
            } finally {
                setIsGeneratingImage(false);
            }
        } else {
            setCompositeStep('final');
            try {
                const finalImage = await copyProductStyle(
                    sourceImages.map(f => f.file),
                    targetImage.file,
                    {
                        copyProductStyle: copyProductStyleToggle,
                        copyBackgroundStyle: false, // This flow handles non-background-copy cases
                        isTransparent: isTransparent,
                        prompt: additionalPrompt
                    }
                );
                setResultImage(finalImage);
            } catch (e) {
                console.error(e);
                if (e instanceof Error) {
                    setError(e.message);
                } else {
                    setError('An unexpected error occurred while generating the image.');
                }
            } finally {
                setIsGeneratingImage(false);
            }
        }
    };
    
    const handleComposite = async () => {
        if (!generatedBackground || !targetImage) return;
    
        setIsGeneratingImage(true);
        setError(null);
        setCompositeStep('final');
    
        try {
            const backgroundImageFile = base64ToFile(generatedBackground, 'background.png', 'image/png');
            
            const finalImage = await compositeProductWithBackground(
                targetImage.file,
                backgroundImageFile,
                {
                    copyProductStyle: copyProductStyleToggle,
                    sourceStyleImages: copyProductStyleToggle ? sourceImages.map(f => f.file) : undefined
                }
            );
            setResultImage(finalImage);
        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred during the final composition step.');
            }
        } finally {
            setIsGeneratingImage(false);
        }
    };


    const handleGenerateDetails = async () => {
        if (!targetImage) return;
        
        setIsGeneratingDetails(true);
        setError(null);
        setProductDetails(null);

        try {
            const details = await generateProductDetails(targetImage.file);
            setProductDetails(details);
        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred while generating product details.');
            }
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleGenerateAll = () => {
        if (sourceImages.length === 0) {
            setError('Please upload at least one source style image.');
            return;
        }
        if (!targetImage) {
            setError('Please upload a target product image.');
            return;
        }
        handleInitialGenerate();
        if (productDetailsEnabled) {
            handleGenerateDetails();
        }
    }
    
    const handleDetailsChange = (field: keyof ProductDetails, value: string) => {
        if (productDetails) {
            setProductDetails({ ...productDetails, [field]: value });
        }
    };

    const handleCopySuggestion = (suggestion: string, index: number) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(suggestion).then(() => {
                setCopiedSuggestionIndex(index);
                setTimeout(() => {
                    setCopiedSuggestionIndex(null);
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy suggestion to clipboard', err);
            });
        }
    };

    const isLoading = isGeneratingImage || isGeneratingDetails;
    
    const Toggle = ({ label, description, tooltipText, enabled, onChange, disabled }: { label: string, description: string, tooltipText: string, enabled: boolean, onChange: (e: boolean) => void, disabled: boolean}) => (
        <div className="flex items-start justify-between">
            <div className="pr-4 relative group cursor-help">
                <p className="font-medium text-gray-200">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
                <div role="tooltip" className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 transform -translate-y-1 group-hover:translate-y-0">
                    {tooltipText}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-800 ${enabled ? 'bg-indigo-600' : 'bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={enabled}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
    
    const DetailField = ({ label, fieldName, value }: { label: string, fieldName: keyof ProductDetails, value: string }) => (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <textarea
                rows={3}
                value={value}
                onChange={(e) => handleDetailsChange(fieldName, e.target.value)}
                className="w-full bg-gray-900/80 border-gray-600 rounded-lg p-2.5 text-xs focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
        </div>
    );

    const PROMPT_SUGGESTIONS = [
        "Change the background to a dark marble surface.",
        "Make the lighting more dramatic and cinematic.",
        "Give the product a vintage, faded photo look.",
        "Place the product on a rustic wooden table.",
        "Add a subtle reflection underneath the product."
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg-col-span-1 bg-gray-800/50 p-6 rounded-2xl flex flex-col space-y-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white">Product Style Copier</h2>

                {/* --- IMAGE UPLOAD SECTION --- */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Source Style Images (1-5)</label>
                    <MultiImageDropzone 
                        onImagesAdd={handleSourceImagesAdd} 
                        images={sourceImages}
                        maxFiles={5} 
                        title="Upload Reference Photos" 
                    />
                    {sourceImages.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 pt-2">
                            {sourceImages.map((imageFile, index) => (
                                <div key={imageFile.previewUrl} className="relative group aspect-square">
                                    <img src={imageFile.previewUrl} alt={`Source style ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                    <button
                                        onClick={() => handleSourceImageRemove(index)}
                                        className="absolute top-1 right-1 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove image"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Target Product Image</label>
                    <ImageDropzone 
                        onImageDrop={handleTargetImageDrop} 
                        imagePreviewUrl={targetImage?.previewUrl || null} 
                        title="Upload New Product"
                    />
                </div>
                
                {/* --- STYLE COPY SECTION --- */}
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white">Style Copy</h3>
                    <Toggle 
                        label="Copy Product Style"
                        description="Copies perspective, pose, lighting, and shadow style."
                        tooltipText="This option preserves the product's shape, texture, and details while copying its style, color, lighting, and reflections from the source images."
                        enabled={copyProductStyleToggle}
                        onChange={setCopyProductStyleToggle}
                        disabled={isLoading}
                    />
                    <Toggle 
                        label="Copy Background Style"
                        description="Copies background texture, lighting, and ambiance."
                        tooltipText="When enabled, the AI generates a new background that matches the style, texture, and mood of the background in your source images."
                        enabled={copyBackgroundStyleToggle}
                        onChange={setCopyBackgroundStyleToggle}
                        disabled={isLoading || isTransparent}
                    />
                     <div className="space-y-4">
                        <label htmlFor="styleCopierPrompt" className="block text-sm font-medium text-gray-300">
                            Additional Instructions (Optional)
                        </label>
                        <textarea
                            id="styleCopierPrompt"
                            rows={3}
                            value={additionalPrompt}
                            onChange={(e) => setAdditionalPrompt(e.target.value)}
                            disabled={isLoading}
                            className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
                            placeholder="e.g., Change the background to a sandy beach..."
                        />
                         <div className="flex flex-wrap gap-2">
                            {PROMPT_SUGGESTIONS.map((suggestion, index) => (
                                <div key={index} className="flex items-center bg-gray-700 rounded-full group transition-shadow shadow-sm hover:shadow-md">
                                    <button
                                        onClick={() => setAdditionalPrompt(suggestion)}
                                        disabled={isLoading}
                                        className="pl-3 pr-2 py-1.5 text-xs text-left text-gray-200 rounded-l-full transition disabled:opacity-50"
                                        title="Click to use this prompt"
                                    >
                                        {suggestion}
                                    </button>
                                    <button
                                        onClick={() => handleCopySuggestion(suggestion, index)}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-indigo-600/80 rounded-r-full transition-colors disabled:opacity-50"
                                        title="Copy prompt to clipboard"
                                    >
                                        {copiedSuggestionIndex === index ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="flex items-center pt-2">
                        <input
                            id="transparent-bg-copier"
                            type="checkbox"
                            checked={isTransparent}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setIsTransparent(checked);
                                if (checked) {
                                    setCopyBackgroundStyleToggle(false);
                                }
                            }}
                            disabled={isLoading}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-600"
                        />
                        <label htmlFor="transparent-bg-copier" className="ml-3 block text-sm font-medium text-gray-300">
                            Transparent Background
                        </label>
                    </div>
                </div>

                {/* --- PRODUCT DETAILS SECTION --- */}
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                    <Toggle
                        label="Generate Product Details"
                        description="Also generate technical and marketing copy for the product."
                        tooltipText="When enabled, the AI will analyze the target product image and generate marketing copy, specifications, and other useful text-based details."
                        enabled={productDetailsEnabled}
                        onChange={setProductDetailsEnabled}
                        disabled={isLoading}
                    />

                    {productDetailsEnabled && (
                        <div className="pl-2 pt-2 space-y-4 animate-fade-in">
                            <button
                                onClick={handleGenerateDetails}
                                disabled={!targetImage || isGeneratingDetails}
                                className="flex items-center space-x-2 text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white py-1.5 px-3 rounded-lg transition"
                            >
                                <InfoIcon className="w-4 h-4" />
                                <span>{isGeneratingDetails ? 'Working...' : 'Generate Details'}</span>
                            </button>

                            {isGeneratingDetails && !productDetails && <Spinner size="sm" />}

                            {productDetails && (
                                <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                                    <DetailField label="Specifications" fieldName="specifications" value={productDetails.specifications} />
                                    <DetailField label="Usage Instructions" fieldName="usageInstructions" value={productDetails.usageInstructions} />
                                    <DetailField label="Compatibility" fieldName="compatibility" value={productDetails.compatibility} />
                                    <DetailField label="Maintenance Tips" fieldName="maintenanceTips" value={productDetails.maintenanceTips} />
                                    <DetailField label="Performance / Metrics" fieldName="performanceMetrics" value={productDetails.performanceMetrics} />
                                    <DetailField label="Warranty" fieldName="warranty" value={productDetails.warranty} />
                                    <DetailField label="Status" fieldName="status" value={productDetails.status} />
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className="pt-4 mt-auto">
                    <button
                        onClick={handleGenerateAll}
                        disabled={isLoading || sourceImages.length === 0 || !targetImage}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Spinner size="sm" /> : 'Generate All'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                </div>

            </div>

            <div className="lg:col-span-2 bg-gray-800/20 rounded-2xl flex items-center justify-center p-6 min-h-[50vh] lg:min-h-0">
                {isGeneratingImage && <div className="flex flex-col items-center gap-4"><Spinner size="lg" /><p className="text-white mt-2 font-semibold">{compositeStep === 'preview' ? 'Generating background...' : 'Compositing image...'}</p></div>}
                
                {!isGeneratingImage && compositeStep === 'initial' && (
                    <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">Your generated image will appear here</p>
                        <p className="text-sm">Upload source and target images to get started</p>
                    </div>
                )}

                {!isGeneratingImage && compositeStep === 'preview' && generatedBackground && (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <p className="text-lg font-semibold text-white">Background Preview</p>
                        <img src={`data:image/png;base64,${generatedBackground}`} alt="Generated background" className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl"/>
                        <div className="flex flex-col sm:flex-row gap-4">
                             <button
                                onClick={handleComposite}
                                className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-lg transition"
                            >
                                <span>Accept & Composite Product</span>
                            </button>
                             <button
                                onClick={() => { setCompositeStep('initial'); setGeneratedBackground(null); }}
                                className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-5 rounded-lg transition"
                            >
                                <span>Discard & Restart</span>
                            </button>
                        </div>
                    </div>
                )}
                
                {!isGeneratingImage && compositeStep === 'final' && resultImage && (
                    <div className="flex flex-col items-center gap-6">
                        <img src={`data:image/png;base64,${resultImage}`} alt="Generated result" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"/>
                        <div className="flex space-x-4">
                             <button
                                onClick={() => downloadImage(resultImage, 'styled_product', 'png')}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Download PNG</span>
                            </button>
                             <button
                                onClick={() => downloadImage(resultImage, 'styled_product', 'jpeg')}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Download JPG</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StyleCopier;
