import React, { useEffect, useState } from 'react';
import useFileExplorerStore from '../../store/fileExplorer';
import { listDirectory, createDirectory, deleteFile, deleteDirectory } from '../../types/api';
import FileList from './FileList';
import Breadcrumb from './Breadcrumb';
import Toolbar from './Toolbar';
import UploadZone from '../Upload/UploadZone';
import './FileExplorer.css';

const FileExplorer: React.FC = () => {
  const {
    currentPath,
    files,
    selectedFiles,
    loading,
    error,
    setCurrentPath,
    setFiles,
    setLoading,
    setError,
    clearSelection
  } = useFileExplorerStore();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const loadDirectory = async (path: string) => {
    console.log('Loading directory:', path);
    try {
      setLoading(true);
      setError(null);
      const fileList = await listDirectory(path);
      console.log('Received files:', fileList);
      
      // Filter to show only files that belong to current directory or immediate subdirectories
      const filteredFiles = fileList.filter(file => {
        // Handle root path special case
        if (path === '/') {
          // For root, include files that start with / and have exactly one more segment
          // or files that are two segments deep (for pre-loading)
          const segments = file.path.split('/').filter(s => s); // Remove empty segments
          return segments.length === 1 || segments.length === 2;
        }
        
        // For non-root paths, check if file is under current path
        if (!file.path.startsWith(path)) {
          return false;
        }
        
        // Get the relative path from current directory
        const relativePath = file.path.substring(path.length);
        // Remove leading slash if present
        const cleanRelative = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        
        // Count segments in relative path
        const segments = cleanRelative.split('/').filter(s => s);
        
        // Include if it's a direct child (1 segment) or grandchild (2 segments)
        return segments.length === 1 || segments.length === 2;
      });
      
      console.log('Filtered files:', filteredFiles);
      setFiles(filteredFiles);
    } catch (err) {
      console.error('Error loading directory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    clearSelection();
    setCurrentPath(path);
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const newPath = currentPath === '/' 
      ? `/${folderName}`
      : `${currentPath}/${folderName}`;

    try {
      await createDirectory(newPath);
      await loadDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!confirm(`Delete ${selectedFiles.length} item(s)?`)) return;

    try {
      for (const path of selectedFiles) {
        const file = files.find(f => f.path === path);
        if (file?.isDirectory) {
          await deleteDirectory(path);
        } else {
          await deleteFile(path);
        }
      }
      clearSelection();
      await loadDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete items');
    }
  };

  const handleRefresh = () => {
    loadDirectory(currentPath);
  };

  return (
    <div className="file-explorer">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewFolder={handleCreateFolder}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        hasSelection={selectedFiles.length > 0}
      />
      
      <Breadcrumb 
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <UploadZone
        currentPath={currentPath}
        onUploadComplete={() => loadDirectory(currentPath)}
      >
        <FileList
          files={files}
          viewMode={viewMode}
          loading={loading}
          onNavigate={handleNavigate}
        />
      </UploadZone>
    </div>
  );
};

export default FileExplorer;