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
  
  // Second pass: build ALL parent-child relationships first
  files.forEach(file => {
    const fileWithChildren = fileMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    console.log(`Building tree: file=${file.path}, parentPath=${parentPath}`);
    
    if (fileMap.has(parentPath)) {
      // This file has a parent in our list
      const parent = fileMap.get(parentPath)!;
      if (!parent.children) parent.children = [];
      parent.children.push(fileWithChildren);
      console.log(`  Added ${file.path} as child of ${parentPath}`);
    } else {
      console.log(`  No parent found for ${file.path}`);
    }
  });
  
  // Third pass: determine what goes at the top level
  // Handle potential leading slash mismatch between breadcrumb and double-click navigation
  const normalizedCurrentPath = currentPath.startsWith('/') && currentPath !== '/' 
    ? currentPath.substring(1) 
    : currentPath;
  const expectedParent = normalizedCurrentPath === '/' ? '' : normalizedCurrentPath;
  
  files.forEach(file => {
    const fileWithChildren = fileMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    // Only add to top level if it's a direct child of current directory and has no parent in the list
    if (!fileMap.has(parentPath) && parentPath === expectedParent) {
      topLevelFiles.push(fileWithChildren);
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

  // Recursively sort all children
  const sortRecursive = (files: (FileInfo & { children?: FileInfo[] })[]) => {
    const sorted = sortFiles(files);
    sorted.forEach(file => {
      if (file.children && file.children.length > 0) {
        file.children = sortRecursive(file.children);
      }
    });
    return sorted;
  };

  const sortedFiles = sortRecursive(topLevelFiles);

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