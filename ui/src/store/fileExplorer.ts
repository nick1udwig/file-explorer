import { create } from 'zustand';
import { FileInfo } from '../types/api';

interface FileExplorerStore {
  currentPath: string;
  files: FileInfo[];
  selectedFiles: string[];
  uploadProgress: Map<string, number>;
  sharedLinks: Map<string, string>;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentPath: (path: string) => void;
  setFiles: (files: FileInfo[]) => void;
  selectFile: (path: string) => void;
  deselectFile: (path: string) => void;
  toggleFileSelection: (path: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  updateUploadProgress: (fileId: string, progress: number) => void;
  addSharedLink: (path: string, link: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useFileExplorerStore = create<FileExplorerStore>((set, get) => ({
  currentPath: '/',
  files: [],
  selectedFiles: [],
  uploadProgress: new Map(),
  sharedLinks: new Map(),
  loading: false,
  error: null,

  setCurrentPath: (path) => set({ currentPath: path }),
  
  setFiles: (files) => set({ files, error: null }),
  
  selectFile: (path) => set((state) => ({
    selectedFiles: [...state.selectedFiles, path]
  })),
  
  deselectFile: (path) => set((state) => ({
    selectedFiles: state.selectedFiles.filter(p => p !== path)
  })),
  
  toggleFileSelection: (path) => {
    const state = get();
    if (state.selectedFiles.includes(path)) {
      state.deselectFile(path);
    } else {
      state.selectFile(path);
    }
  },
  
  clearSelection: () => set({ selectedFiles: [] }),
  
  selectAll: () => set((state) => ({
    selectedFiles: state.files.map(f => f.path)
  })),
  
  updateUploadProgress: (fileId, progress) => set((state) => {
    const newProgress = new Map(state.uploadProgress);
    if (progress >= 100) {
      newProgress.delete(fileId);
    } else {
      newProgress.set(fileId, progress);
    }
    return { uploadProgress: newProgress };
  }),
  
  addSharedLink: (path, link) => set((state) => {
    const newLinks = new Map(state.sharedLinks);
    newLinks.set(path, link);
    return { sharedLinks: newLinks };
  }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
}));

export default useFileExplorerStore;