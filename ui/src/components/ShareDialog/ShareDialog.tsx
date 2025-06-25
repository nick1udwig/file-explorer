import React, { useState } from 'react';
import { FileInfo, AuthScheme, shareFile } from '../../types/api';
import useFileExplorerStore from '../../store/fileExplorer';
import './ShareDialog.css';

interface ShareDialogProps {
  file: FileInfo;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ file, onClose }) => {
  const [authScheme, setAuthScheme] = useState<AuthScheme>("Public");
  const [shareLink, setShareLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { addSharedLink } = useFileExplorerStore();

  const handleShare = async () => {
    setLoading(true);
    try {
      const link = await shareFile(file.path, authScheme);
      const fullLink = `${window.location.origin}${link}`;
      setShareLink(fullLink);
      addSharedLink(file.path, fullLink);
    } catch (err) {
      console.error('Failed to share file:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="share-dialog-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={e => e.stopPropagation()}>
        <h3>Share File: {file.name}</h3>
        
        <div className="share-options">
          <label>
            <input
              type="radio"
              name="authScheme"
              value="public"
              checked={authScheme === "Public"}
              onChange={() => setAuthScheme("Public")}
            />
            Public (Anyone with link can access)
          </label>
          <label>
            <input
              type="radio"
              name="authScheme"
              value="private"
              checked={authScheme === "Private"}
              onChange={() => setAuthScheme("Private")}
            />
            Private (Restricted access)
          </label>
        </div>

        {!shareLink && (
          <button 
            onClick={handleShare} 
            disabled={loading}
            className="share-button"
          >
            {loading ? 'Generating...' : 'Generate Share Link'}
          </button>
        )}

        {shareLink && (
          <div className="share-link-container">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="share-link-input"
            />
            <button onClick={copyToClipboard}>Copy</button>
          </div>
        )}

        <div className="dialog-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;