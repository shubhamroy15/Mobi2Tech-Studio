
import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { UploadIcon } from './Icons';

interface ImageDropzoneProps {
    onImageDrop: (imageFile: ImageFile) => void;
    imagePreviewUrl: string | null;
    title: string;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageDrop, imagePreviewUrl, title }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const previewUrl = URL.createObjectURL(file);
                onImageDrop({ file, previewUrl });
            } else {
                alert('Please upload an image file.');
            }
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-4 transition-colors duration-200 aspect-square flex items-center justify-center
                ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'}
            `}
        >
            <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
                <div className="text-center text-gray-400 pointer-events-none">
                    <UploadIcon className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm">Drag & drop or click to upload</p>
                </div>
            )}
        </div>
    );
};

export default ImageDropzone;
