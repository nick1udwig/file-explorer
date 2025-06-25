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
    try {
      setLoading(true);
      setError(null);
      const fileList = await listDirectory(path);
      setFiles(fileList);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleNavigate = (path: string) => {
    clearSelection();
    loadDirectory(path);
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