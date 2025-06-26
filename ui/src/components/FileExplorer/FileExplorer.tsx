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
      console.log('Total files received:', fileList.length);
      
      // Backend returns files for the requested directory with 2 levels of depth
      // We need to include all files so the tree structure works, but we'll filter
      // what's shown at the top level in FileList
      const filteredFiles = fileList.filter(file => {
        if (file.path === path) return false; // Exclude the directory itself
        
        // For the tree to work properly, we need to include all files
        // The FileList component will handle showing only direct children at top level
        return true;
      });
      
      console.log(`Setting ${filteredFiles.length} files`);
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
          currentPath={currentPath}
        />
      </UploadZone>
    </div>
  );
};

export default FileExplorer;