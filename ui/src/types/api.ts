// Type definitions for the File Explorer API
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: number;
  modified: number;
  isDirectory: boolean;
  permissions: string;
}

export type AuthScheme = "Public" | "Private";

// Re-export everything from caller-utils except the types we define here
export {
  ApiError,
  parseResultResponse,
  // Functions
  copyFile,
  createDirectory,
  createFile,
  deleteFile,
  deleteDirectory,
  getCurrentDirectory,
  getShareLink,
  listDirectory,
  moveFile,
  readFile,
  serveSharedFile,
  setCurrentDirectory,
  shareFile,
  unshareFile,
  updateFile,
  uploadFile
} from '../../../target/ui/caller-utils';