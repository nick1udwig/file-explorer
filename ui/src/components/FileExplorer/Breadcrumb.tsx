import React from 'react';
import './Breadcrumb.css';

interface BreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentPath, onNavigate }) => {
  const pathParts = currentPath.split('/').filter(Boolean);
  
  return (
    <div className="breadcrumb">
      <button 
        className="breadcrumb-item"
        onClick={() => onNavigate('/')}
      >
        Root
      </button>
      
      {pathParts.map((part, index) => {
        const path = '/' + pathParts.slice(0, index + 1).join('/');
        return (
          <React.Fragment key={path}>
            <span className="breadcrumb-separator">/</span>
            <button
              className="breadcrumb-item"
              onClick={() => onNavigate(path)}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumb;