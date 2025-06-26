import React, { useState } from 'react';
import { FileInfo } from '../../types/api';
import useFileExplorerStore from '../../store/fileExplorer';
import ContextMenu from '../ContextMenu/ContextMenu';
import ShareDialog from '../ShareDialog/ShareDialog';
import './FileItem.css';

interface FileItemProps {
  file: FileInfo & { children?: FileInfo[] };
  viewMode: 'list' | 'grid';
  onNavigate: (path: string) => void;
  depth?: number;
}

const FileItem: React.FC<FileItemProps> = ({ file, viewMode, onNavigate, depth = 0 }) => {
  const { selectedFiles, toggleFileSelection } = useFileExplorerStore();
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const isSelected = selectedFiles.includes(file.path);

  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleFileSelection(file.path);
    } else if (e.detail === 2 && file.isDirectory) {
      // Double click navigates into directories
      console.log('Double-click on directory:', file.path);
      onNavigate(file.path);
    } else if (!file.isDirectory) {
      // Single click selects files
      toggleFileSelection(file.path);
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Expand toggle clicked for:', file.path);
    console.log('Current isExpanded:', isExpanded);
    console.log('Has children?', hasChildren);
    console.log('Children:', file.children);
    console.log('Children length:', file.children?.length);
    setIsExpanded(!isExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  const getFileIcon = () => {
    if (file.isDirectory) {
      return '📁';
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt': return '📄';
      case 'pdf': return '📕';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'mp3':
      case 'wav': return '🎵';
      case 'mp4':
      case 'avi': return '🎬';
      case 'zip':
      case 'rar': return '📦';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasChildren = file.isDirectory && file.children && file.children.length > 0;

  return (
    <>
      <div
        className={`file-item file-item-${viewMode} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
      >
        {file.isDirectory && viewMode === 'list' && (
          <button className="expand-toggle" onClick={handleExpandToggle}>
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        <span className="file-icon">{getFileIcon()}</span>
        <span className="file-name">{file.name}</span>
        {viewMode === 'list' && (
          <>
            <span className="file-size">
              {file.isDirectory ? `${file.size} items` : formatFileSize(file.size)}
            </span>
            <span className="file-modified">
              {file.modified ? new Date(file.modified * 1000).toLocaleDateString() : '-'}
            </span>
          </>
        )}
      </div>
      
      {/* Render children when expanded */}
      {isExpanded && hasChildren && viewMode === 'list' && (
        <div className="file-children">
          {(() => {
            console.log('Rendering children for:', file.path, 'Children:', file.children);
            return null;
          })()}
          {file.children!.map((child) => (
            <FileItem
              key={child.path}
              file={child as FileInfo & { children?: FileInfo[] }}
              viewMode={viewMode}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {contextMenuOpen && (
        <ContextMenu
          position={contextMenuPosition}
          file={file}
          onClose={() => setContextMenuOpen(false)}
          onShare={() => {
            setShareDialogOpen(true);
            setContextMenuOpen(false);
          }}
        />
      )}

      {shareDialogOpen && (
        <ShareDialog
          file={file}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </>
  );
};

export default FileItem;