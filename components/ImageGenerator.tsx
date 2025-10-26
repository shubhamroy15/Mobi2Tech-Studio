import React, { useState } from 'react';
import { AspectRatio } from '../types';
import Spinner from './Spinner';
import { generateImage } from '../services/geminiService';
import { DownloadIcon, ChevronDownIcon, RefreshIcon } from './Icons';
import { downloadImage } from '../utils/fileUtils';

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A majestic lion with a glowing mane, standing on a cliff overlooking a futuristic city at sunset.');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    // Advanced options state
    const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
    const [style, setStyle] = useState('Photorealistic');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [seed, setSeed] = useState('');

    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please enter a prompt to generate an image.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const finalPrompt = `${style}, ${prompt}`;
            const seedValue = parseInt(seed, 10);
            const options = {
                negativePrompt: negativePrompt.trim() || undefined,
                seed: !isNaN(seedValue) ? seedValue : undefined
            };

            const generatedImage = await generateImage(finalPrompt, aspectRatio, options);
            setResultImage(generatedImage);
        } catch (e) {
            setError('An error occurred while generating the image. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRandomizeSeed = () => {
        setSeed(Math.floor(Math.random() * 1000000000).toString());
    };

    const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
    const STYLES = ['Photorealistic', 'Anime', 'Watercolor', 'Digital Art', 'Fantasy', 'Cyberpunk'];
    const PROMPT_SUGGESTIONS = [
        'A photorealistic cat wearing a tiny wizard hat, studying a glowing crystal ball.',
        'An epic fantasy landscape with floating islands, waterfalls, and a dragon soaring in the sky, watercolor style.',
        'Cyberpunk city street at night, neon lights reflecting on wet pavement, a lone figure in a trench coat.',
        'A whimsical anime-style scene of a girl sharing ramen with a friendly fox in a forest.',
        'Surreal digital art of a giant, ancient tree with galaxies swirling within its branches.'
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl flex flex-col space-y-6">
                <h2 className="text-2xl font-bold text-white">Image Generator</h2>
                
                <div>
                    <label htmlFor="generatePrompt" className="block text-sm font-medium text-gray-300 mb-2">
                        Prompt
                    </label>
                    <textarea
                        id="generatePrompt"
                        rows={5}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                        placeholder="e.g., A majestic cat astronaut floating in space..."
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400">Need inspiration? Try one of these:</p>
                     <div className="flex flex-wrap gap-2">
                        {PROMPT_SUGGESTIONS.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => setPrompt(suggestion)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
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

                {/* Advanced Options */}
                <div className="border-t border-gray-700/50 pt-4 space-y-4">
                    <button
                        onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
                        className="w-full flex justify-between items-center text-left text-base font-medium text-gray-200 hover:text-white"
                    >
                        <span>Advanced Options</span>
                        <ChevronDownIcon className={`w-6 h-6 transition-transform ${advancedOptionsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {advancedOptionsOpen && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label htmlFor="style-select" className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                                <select
                                    id="style-select"
                                    value={style}
                                    onChange={e => setStyle(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-gray-700 border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                                >
                                    {STYLES.map(s => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="negativePrompt" className="block text-sm font-medium text-gray-300 mb-2">Negative Prompt</label>
                                <textarea
                                    id="negativePrompt"
                                    rows={2}
                                    value={negativePrompt}
                                    onChange={e => setNegativePrompt(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="e.g., blurry, text, watermark"
                                />
                            </div>
                            <div>
                                <label htmlFor="seed" className="block text-sm font-medium text-gray-300 mb-2">Seed</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        id="seed"
                                        value={seed}
                                        onChange={e => setSeed(e.target.value.replace(/\D/g, ''))} // Allow only digits
                                        maxLength={10}
                                        disabled={isLoading}
                                        className="w-full bg-gray-700 border-gray-600 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        placeholder="Leave blank for random"
                                    />
                                    <button 
                                        onClick={handleRandomizeSeed}
                                        disabled={isLoading}
                                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                                        title="Randomize Seed"
                                    >
                                        <RefreshIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt}
                    className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    {isLoading ? <Spinner size="sm" /> : 'Generate'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="lg:col-span-2 bg-gray-800/20 rounded-2xl flex items-center justify-center p-6 min-h-[50vh] lg:min-h-0 relative">
                {/* Base image display */}
                {!resultImage ? (
                     <div className={`text-center text-gray-500 transition-all duration-300 ${isLoading ? 'blur-md' : ''}`}>
                        <p className="text-lg font-medium">Your generated image will appear here</p>
                        <p className="text-sm">Enter a prompt and click "Generate"</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full gap-4">
                        <img src={`data:image/png;base64,${resultImage}`} alt="Generated result" className={`max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-all duration-300 ${isLoading ? 'blur-md opacity-50' : ''}`} />
                        {!isLoading && (
                            <button
                                onClick={() => downloadImage(resultImage, 'generated_image', 'png')}
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
                        <p className="mt-4 text-white font-semibold">{resultImage ? 'Generating new image...' : 'Generating image...'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageGenerator;