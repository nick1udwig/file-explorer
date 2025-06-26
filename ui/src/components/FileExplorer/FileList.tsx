import React from 'react';
import { FileInfo } from '../../types/api';
import FileItem from './FileItem';
import './FileList.css';

interface FileListProps {
  files: FileInfo[];
  viewMode: 'list' | 'grid';
  loading: boolean;
  onNavigate: (path: string) => void;
  currentPath: string;
}

const FileList: React.FC<FileListProps> = ({ files, viewMode, loading, onNavigate, currentPath }) => {
  if (loading) {
    return <div className="file-list-loading">Loading...</div>;
  }

  if (files.length === 0) {
    return <div className="file-list-empty">No files in this directory</div>;
  }

  // Build tree structure from flat list
  const fileMap = new Map<string, FileInfo & { children?: FileInfo[] }>();
  const topLevelFiles: (FileInfo & { children?: FileInfo[] })[] = [];
  
  // First pass: create map of all files
  files.forEach(file => {
    fileMap.set(file.path, { ...file, children: [] });
  });
  
  // Second pass: organize into tree
  files.forEach(file => {
    const fileWithChildren = fileMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    if (fileMap.has(parentPath)) {
      // This file has a parent in our list
      const parent = fileMap.get(parentPath)!;
      if (!parent.children) parent.children = [];
      parent.children.push(fileWithChildren);
    } else {
      // No parent in list - check if it's a direct child of current directory
      // Handle potential leading slash mismatch between breadcrumb and double-click navigation
      const normalizedCurrentPath = currentPath.startsWith('/') && currentPath !== '/' 
        ? currentPath.substring(1) 
        : currentPath;
      const expectedParent = normalizedCurrentPath === '/' ? '' : normalizedCurrentPath;
      
      if (parentPath === expectedParent) {
        // This is a direct child of the current directory
        topLevelFiles.push(fileWithChildren);
      }
      // Otherwise, it's a grandchild or deeper that shouldn't be shown at top level
    }
  });

  // Sort files: directories first, then by name
  const sortFiles = (files: (FileInfo & { children?: FileInfo[] })[]) => {
    return [...files].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const sortedFiles = sortFiles(topLevelFiles);
  // Also sort children
  sortedFiles.forEach(file => {
    if (file.children) {
      file.children = sortFiles(file.children);
    }
  });

  return (
    <div className={`file-list file-list-${viewMode}`}>
      {sortedFiles.map((file) => (
        <FileItem
          key={file.path}
          file={file}
          viewMode={viewMode}
          onNavigate={onNavigate}
          depth={0}
        />
      ))}
    </div>
  );
};

export default FileList;