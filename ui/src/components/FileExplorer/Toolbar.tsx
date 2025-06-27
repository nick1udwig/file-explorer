import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onUpload: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onNewFolder,
  onRefresh,
  onUpload
}) => {
  const toggleViewMode = () => {
    onViewModeChange(viewMode === 'list' ? 'grid' : 'list');
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onNewFolder} title="New Folder" className="icon-button">
          📁
        </button>
        <button onClick={onUpload} title="Upload File" className="icon-button">
          📤
        </button>
        <button onClick={onRefresh} title="Refresh" className="icon-button">
          🔄
        </button>
      </div>
      
      <div className="toolbar-group">
        <button
          onClick={toggleViewMode}
          title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
          className="icon-button"
        >
          {viewMode === 'list' ? '⊞' : '☰'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;