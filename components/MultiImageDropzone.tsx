
import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { UploadIcon } from './Icons';

interface MultiImageDropzoneProps {
    onImagesAdd: (files: File[]) => void;
    images: ImageFile[];
    maxFiles?: number;
    title: string;
}

const MultiImageDropzone: React.FC<MultiImageDropzoneProps> = ({ onImagesAdd, images, maxFiles = 5, title }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (files) {
            const addedFiles: File[] = [];
            for (let i = 0; i < files.length; i++) {
                if (images.length + addedFiles.length >= maxFiles) break;
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    addedFiles.push(file);
                }
            }
            if (addedFiles.length > 0) {
                onImagesAdd(addedFiles);
            }
        }
    }, [images, maxFiles, onImagesAdd]);

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
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-4 transition-colors duration-200 flex items-center justify-center min-h-[120px]
                ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'}
            `}
        >
            <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={images.length >= maxFiles}
            />
            <div className="text-center text-gray-400 pointer-events-none">
                <UploadIcon className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                <p className="font-semibold">{title}</p>
                <p className="text-sm">Drag & drop or click to upload ({images.length}/{maxFiles})</p>
            </div>
        </div>
    );
};

export default MultiImageDropzone;