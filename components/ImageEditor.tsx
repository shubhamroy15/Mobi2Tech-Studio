
import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import ImageDropzone from './ImageDropzone';
import Spinner from './Spinner';
import { editImageWithPrompt } from '../services/geminiService';
import { DownloadIcon } from './Icons';
import { downloadImage } from '../utils/fileUtils';


const ImageEditor: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<ImageFile | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    const handleImageDrop = useCallback((imageFile: ImageFile) => {
        setSourceImage(imageFile);
        setResultImage(null);
    }, []);

    const handleSubmit = async () => {
        if (!sourceImage) {
            setError('Please upload an image to edit.');
            return;
        }
        if (!prompt) {
            setError('Please enter an editing prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const editedImage = await editImageWithPrompt(sourceImage.file, prompt);
            setResultImage(editedImage);
        } catch (e: any) {
            // FIX: Explicitly typing the caught error object. This can resolve obscure parsing issues
            // that lead to incorrect "Cannot find name" errors for variables that are in scope.
            setError('An error occurred while editing the image. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const PROMPT_PRESETS = [
        "Add a retro, vintage filter.",
        "Make the colors more vibrant and cinematic.",
        "Change the season to autumn.",
        "Remove the person in the background.",
        "Add a subtle sun flare in the top right corner."
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl flex flex-col space-y-6">
                <h2 className="text-2xl font-bold text-white">Image Editor</h2>
                
                <ImageDropzone 
                    onImageDrop={handleImageDrop} 
                    imagePreviewUrl={sourceImage?.previewUrl || null} 
                    title="Upload Image to Edit"
                />

                <div>
                    <label htmlFor="editPrompt" className="block text-sm font-medium text-gray-300 mb-2">
                        Editing Prompt
                    </label>
                    <textarea
                        id="editPrompt"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                        placeholder="e.g., Add a retro filter, make the sky blue..."
                    />
                </div>
                
                 <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400">Try an example:</p>
                     <div className="flex flex-wrap gap-2">
                        {PROMPT_PRESETS.map((preset, index) => (
                            <button
                                key={index}
                                onClick={() => setPrompt(preset)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition disabled:opacity-50"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !sourceImage}
                    className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    {isLoading ? <Spinner size="sm" /> : 'Apply Edits'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="lg:col-span-2 bg-gray-800/20 rounded-2xl flex items-center justify-center p-6 min-h-[50vh] lg:min-h-0 relative">
                {/* Display Area */}
                {!sourceImage ? (
                    <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">Your edited image will appear here</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                         <img
                            src={resultImage ? `data:image/png;base64,${resultImage}` : sourceImage.previewUrl}
                            alt={resultImage ? "Edited result" : "Source"}
                            className={`max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-all duration-300 ${isLoading ? 'blur-md opacity-50' : ''}`}
                        />
                        {resultImage && !isLoading && (
                            <button
                                onClick={() => downloadImage(resultImage, 'edited_image', 'png')}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Download PNG</span>
                            </button>
                        )}
                    </div>
                )}
                
                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 rounded-2xl">
                        <Spinner size="lg" />
                        <p className="mt-4 text-white font-semibold">Applying edits...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageEditor;
