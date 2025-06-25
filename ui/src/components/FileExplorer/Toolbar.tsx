import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './Toolbar.css';

interface ToolbarProps {
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  hasSelection: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onNewFolder,
  onDelete,
  onRefresh,
  hasSelection
}) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onNewFolder} title="New Folder">
          📁 New Folder
        </button>
        <button 
          onClick={onDelete} 
          disabled={!hasSelection}
          title="Delete Selected"
        >
          🗑️ Delete
        </button>
        <button onClick={onRefresh} title="Refresh">
          🔄 Refresh
        </button>
      </div>
      
      <div className="toolbar-group">
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => onViewModeChange('list')}
          title="List View"
        >
          ☰
        </button>
        <button
          className={viewMode === 'grid' ? 'active' : ''}
          onClick={() => onViewModeChange('grid')}
          title="Grid View"
        >
          ⊞
        </button>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;