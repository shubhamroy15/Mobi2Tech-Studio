
import React, { useState, useCallback, useEffect } from 'react';
import { ImageFile, ExportQuality, AspectRatio } from '../types';
import ImageDropzone from './ImageDropzone';
import Spinner from './Spinner';
import { compositeProductImage } from '../services/geminiService';
import { DownloadIcon, SaveIcon, TrashIcon } from './Icons';
import { downloadImageWithSettings } from '../utils/fileUtils';

const USER_PRESETS_STORAGE_KEY = 'ai-photo-studio-user-presets';

const ProductStudio: React.FC = () => {
    const [productImage, setProductImage] = useState<ImageFile | null>(null);
    const [backgroundPrompt, setBackgroundPrompt] = useState<string>('A clean, white studio background with soft, diffused lighting.');
    const [userPresets, setUserPresets] = useState<string[]>([]);
    const [isTransparent, setIsTransparent] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [exportQuality, setExportQuality] = useState<ExportQuality>('High');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    useEffect(() => {
        try {
            const savedPresets = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
            if (savedPresets) {
                setUserPresets(JSON.parse(savedPresets));
            }
        } catch (error) {
            console.error("Failed to load user presets from local storage", error);
        }
    }, []);

    const handleImageDrop = useCallback((imageFile: ImageFile) => {
        setProductImage(imageFile);
        setResultImage(null);
    }, []);

    const handleSubmit = async () => {
        if (!productImage) {
            setError('Please upload a product image.');
            return;
        }
        if (!backgroundPrompt && !isTransparent) {
            setError('Please provide a background description.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImage(null);

        try {
            const generatedImage = await compositeProductImage(productImage.file, backgroundPrompt, isTransparent, aspectRatio);
            setResultImage(generatedImage);
        } catch (e) {
            setError('An error occurred while generating the image. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (type: 'png' | 'jpeg') => {
        if (!resultImage || isDownloading) return;

        setIsDownloading(true);
        setError(null);
        try {
            await downloadImageWithSettings(resultImage, { 
                filename: 'product_image', 
                type, 
                quality: exportQuality,
                aspectRatio,
            });
        } catch (err) {
            console.error("Download failed:", err);
            setError("Failed to download image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSavePreset = () => {
        const trimmedPrompt = backgroundPrompt.trim();
        if (!trimmedPrompt) return;
    
        const allPrompts = [...BACKGROUND_PRESETS.map(p => p.prompt), ...userPresets];
        if (allPrompts.includes(trimmedPrompt)) {
            return;
        }
        
        const newPresets = [...userPresets, trimmedPrompt];
        setUserPresets(newPresets);
        try {
            localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
        } catch (error) {
            console.error("Failed to save user presets to local storage", error);
        }
    };
    
    const handleDeletePreset = (presetToDelete: string) => {
        const newPresets = userPresets.filter(p => p !== presetToDelete);
        setUserPresets(newPresets);
        try {
            localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
        } catch (error) {
            console.error("Failed to update user presets in local storage", error);
        }
    };

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };
    
    const BACKGROUND_PRESETS = [
        { label: "Studio White", prompt: "A clean, white studio background with soft, diffused lighting." },
        { label: "Rustic Wood", prompt: "A rustic wooden tabletop with a warm, cozy atmosphere." },
        { label: "Marble Counter", prompt: "A sleek, modern kitchen counter made of marble." },
        { label: "Forest Floor", prompt: "Outdoors on a mossy rock in a lush, green forest." },
        { label: "Reflective Black", prompt: "On a reflective black surface with dramatic, cinematic lighting." },
        { label: "Sandy Beach", prompt: "On a sandy beach with gentle waves and soft sunlight." },
        { label: "Abstract Gradient", prompt: "Suspended in mid-air against a vibrant, abstract, colorful gradient background." },
        { label: "Coffee Beans", prompt: "Resting on a pile of freshly roasted coffee beans with gentle steam rising." },
        { label: "Minimalist Room", prompt: "In a bright, minimalist, Scandinavian-style room with natural light from a window." },
    ];

    const QUALITIES: ExportQuality[] = ['Standard', 'High', 'Maximum'];
    const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];


    const isSaveDisabled = isLoading || !backgroundPrompt.trim() || 
    [...BACKGROUND_PRESETS.map(p => p.prompt), ...userPresets].includes(backgroundPrompt.trim());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl flex flex-col space-y-6">
                <h2 className="text-2xl font-bold text-white">Product Studio</h2>
                
                <ImageDropzone 
                    onImageDrop={handleImageDrop} 
                    imagePreviewUrl={productImage?.previewUrl || null} 
                    title="Upload Product Photo"
                />

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="backgroundPrompt" className="block text-sm font-medium text-gray-300">
                            Background Description
                        </label>
                        <button
                            onClick={handleSavePreset}
                            disabled={isSaveDisabled}
                            className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                            title={isSaveDisabled ? "Prompt is empty or already exists" : "Save as preset"}
                        >
                            <SaveIcon className="w-4 h-4" />
                            <span>Save</span>
                        </button>
                    </div>
                    <textarea
                        id="backgroundPrompt"
                        rows={3}
                        value={backgroundPrompt}
                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                        disabled={isTransparent || isLoading}
                        className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
                        placeholder="e.g., A marble countertop with a soft morning light..."
                    />
                </div>
                
                <div>
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-400">Or select a preset:</p>
                         <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => setBackgroundPrompt(preset.prompt)}
                                    disabled={isTransparent || isLoading}
                                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition disabled:opacity-50"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {userPresets.length > 0 && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-gray-700">
                            <p className="text-xs font-medium text-gray-400">Your Presets:</p>
                            <div className="flex flex-wrap gap-2">
                            {userPresets.map((preset) => (
                                <div key={preset} className="flex items-center bg-gray-700 rounded-full group transition-shadow shadow-sm hover:shadow-md">
                                    <button
                                        onClick={() => setBackgroundPrompt(preset)}
                                        disabled={isTransparent || isLoading}
                                        className="pl-3 pr-2 py-1.5 text-xs text-left text-gray-200 rounded-l-full transition disabled:opacity-50"
                                    >
                                        {truncateText(preset, 25)}
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePreset(preset)}
                                        disabled={isLoading}
                                        className="px-2 py-1.5 text-gray-400 hover:text-white hover:bg-red-500/80 rounded-r-full transition disabled:opacity-50"
                                        title="Delete preset"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5"/>
                                    </button>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Aspect Ratio
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                disabled={isLoading}
                                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                                    aspectRatio === ratio
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        id="transparent-bg"
                        type="checkbox"
                        checked={isTransparent}
                        onChange={(e) => setIsTransparent(e.target.checked)}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label htmlFor="transparent-bg" className="ml-3 block text-sm font-medium text-gray-300">
                        Transparent Background
                    </label>
                </div>
                
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !productImage}
                    className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    {isLoading ? <Spinner size="sm" /> : 'Generate Image'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="lg:col-span-2 bg-gray-800/20 rounded-2xl flex items-center justify-center p-6 min-h-[50vh] lg:min-h-0">
                {isLoading && <Spinner size="lg" />}
                {!isLoading && !resultImage && (
                    <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">Your generated image will appear here</p>
                        <p className="text-sm">Upload a product and describe a background to get started</p>
                    </div>
                )}
                {resultImage && (
                    <div className="flex flex-col items-center gap-6">
                        <img src={`data:image/png;base64,${resultImage}`} alt="Generated result" className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl"/>
                        
                        <div className="w-full max-w-xs flex flex-col items-center gap-3">
                            <label className="block text-sm font-medium text-gray-300">Export Quality</label>
                            <div className="flex w-full bg-gray-900/50 p-1 rounded-lg border border-gray-700">
                                {QUALITIES.map((quality) => (
                                    <button
                                        key={quality}
                                        onClick={() => setExportQuality(quality)}
                                        className={`w-full px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
                                            exportQuality === quality
                                                ? 'bg-indigo-600 text-white shadow'
                                                : 'text-gray-300 hover:bg-gray-700'
                                        }`}
                                    >
                                        {quality}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-4">
                             <button
                                onClick={() => handleDownload('png')}
                                disabled={isDownloading}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-wait"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Download PNG</span>
                            </button>
                             <button
                                onClick={() => handleDownload('jpeg')}
                                disabled={isDownloading}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-wait"
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

export default ProductStudio;