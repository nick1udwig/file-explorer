import React from 'react';
import { FileInfo } from '../../types/api';
import FileItem from './FileItem';
import './FileList.css';

interface FileListProps {
  files: FileInfo[];
  viewMode: 'list' | 'grid';
  loading: boolean;
  onNavigate: (path: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, viewMode, loading, onNavigate }) => {
  if (loading) {
    return <div className="file-list-loading">Loading...</div>;
  }

  if (files.length === 0) {
    return <div className="file-list-empty">No files in this directory</div>;
  }

  // Sort files: directories first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={`file-list file-list-${viewMode}`}>
      {sortedFiles.map((file) => (
        <FileItem
          key={file.path}
          file={file}
          viewMode={viewMode}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};

export default FileList;