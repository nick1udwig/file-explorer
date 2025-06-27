import React, { useEffect, useState } from 'react';
import useFileExplorerStore from '../../store/fileExplorer';
import { listDirectory, createDirectory, createFile, deleteFile, deleteDirectory, FileInfo, getCurrentDirectory } from '../../types/api';
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
    try {
      setLoading(true);
      setError(null);
      const fileList = await listDirectory(path);
      
      // Backend returns files for the requested directory with 2 levels of depth
      // We need to include all files so the tree structure works, but we'll filter
      // what's shown at the top level in FileList
      const filteredFiles = fileList.filter(file => {
        if (file.path === path) return false; // Exclude the directory itself
        
        // For the tree to work properly, we need to include all files
        // The FileList component will handle showing only direct children at top level
        return true;
      });
      
      setFiles(filteredFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const loadSubdirectory = async (path: string): Promise<FileInfo[]> => {
    try {
      const fileList = await listDirectory(path);
      
      // Filter out the directory itself and return only its contents
      const filteredFiles = fileList.filter(file => {
        if (file.path === path) return false; // Exclude the directory itself
        return true;
      });
      
      return filteredFiles;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subdirectory');
      return [];
    }
  };

  // Initialize with home directory on first load
  useEffect(() => {
    const initializeDirectory = async () => {
      try {
        const cwd = await getCurrentDirectory();
        setCurrentPath(cwd);
      } catch (err) {
        // If getting cwd fails, fall back to root
        console.error('Failed to get current directory:', err);
        setCurrentPath('/');
      }
    };
    
    initializeDirectory();
  }, []);

  // Load directory whenever path changes
  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
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

  const handleCreateFile = async () => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const newPath = currentPath === '/' 
      ? `/${fileName}`
      : `${currentPath}/${fileName}`;

    try {
      // Create an empty file
      await createFile(newPath, []);
      await loadDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
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

  const handleUpload = () => {
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;
      
      // Trigger the upload process for each file
      const event = new CustomEvent('upload-files', { 
        detail: { files: Array.from(files) } 
      });
      window.dispatchEvent(event);
    };
    
    // Trigger the file dialog
    fileInput.click();
  };

  return (
    <div className="file-explorer">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewFolder={handleCreateFolder}
        onNewFile={handleCreateFile}
        onRefresh={handleRefresh}
        onUpload={handleUpload}
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
          onLoadSubdirectory={loadSubdirectory}
        />
      </UploadZone>
    </div>
  );
};

export default FileExplorer;