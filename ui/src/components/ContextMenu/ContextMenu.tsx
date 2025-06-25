import React, { useEffect, useRef } from 'react';
import { FileInfo } from '../../types/api';
import './ContextMenu.css';

interface ContextMenuProps {
  position: { x: number; y: number };
  file: FileInfo;
  onClose: () => void;
  onShare: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ position, file, onClose, onShare }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      <button onClick={() => { /* TODO */ onClose(); }}>
        📋 Copy
      </button>
      <button onClick={() => { /* TODO */ onClose(); }}>
        ✂️ Cut
      </button>
      <button onClick={() => { /* TODO */ onClose(); }}>
        📄 Rename
      </button>
      {!file.isDirectory && (
        <button onClick={onShare}>
          🔗 Share
        </button>
      )}
      <hr />
      <button onClick={() => { /* TODO */ onClose(); }}>
        🗑️ Delete
      </button>
    </div>
  );
};

export default ContextMenu;