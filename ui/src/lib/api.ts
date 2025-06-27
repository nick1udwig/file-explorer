// API wrapper to fix URL routing for hyperapp
// Re-export everything else from the generated API
export * from '../types/api';

// Import specific types and functions we need to override
import { 
  GetCurrentDirectoryRequest, 
  ListDirectoryRequest,
  ApiError, 
  parseResultResponse, 
  FileInfo 
} from '../types/api';

// Helper to get the correct API base URL
function getApiBaseUrl(): string {
  // For hyperapp, we need to include the full path, not just origin
  // window.location.pathname includes the app path like /file-explorer:file-explorer:sys/
  const pathParts = window.location.pathname.split('/');
  // Remove the last part if it's empty or a specific page
  if (pathParts[pathParts.length - 1] === '' || !pathParts[pathParts.length - 1].includes(':')) {
    pathParts.pop();
  }
  return window.location.origin + pathParts.join('/');
}

// Override getCurrentDirectory with correct URL
export async function getCurrentDirectory(): Promise<string> {
  const data: GetCurrentDirectoryRequest = {
    GetCurrentDirectory: null,
  };
  
  const response = await fetch(`${getApiBaseUrl()}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new ApiError(`HTTP request failed with status: ${response.status}`);
  }
  
  const jsonResponse = await response.json();
  return parseResultResponse<string>(jsonResponse);
}

// Override listDirectory with correct URL
export async function listDirectory(path: string): Promise<FileInfo[]> {
  const data: ListDirectoryRequest = {
    ListDirectory: path,
  };
  
  const response = await fetch(`${getApiBaseUrl()}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new ApiError(`HTTP request failed with status: ${response.status}`);
  }
  
  const jsonResponse = await response.json();
  return parseResultResponse<FileInfo[]>(jsonResponse);
}