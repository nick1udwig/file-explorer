import React, { useState, useRef } from 'react';
import { uploadFile } from '../../types/api';
import useFileExplorerStore from '../../store/fileExplorer';
import './UploadZone.css';

interface UploadZoneProps {
  currentPath: string;
  onUploadComplete: () => void;
  children: React.ReactNode;
}

const UploadZone: React.FC<UploadZoneProps> = ({ currentPath, onUploadComplete, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { updateUploadProgress, setError } = useFileExplorerStore();
  const dragCounter = useRef(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    try {
      updateUploadProgress(fileId, 0);
      
      const content = await file.arrayBuffer();
      const contentArray = Array.from(new Uint8Array(content));
      
      // Simulate upload progress
      updateUploadProgress(fileId, 50);
      
      await uploadFile(currentPath, file.name, contentArray);
      
      updateUploadProgress(fileId, 100);
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      updateUploadProgress(fileId, 100); // Remove from progress
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
    >
      {children}
      {isDragging && (
        <div className="upload-overlay">
          <div className="upload-message">
            Drop files here to upload
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;