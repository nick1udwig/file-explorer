# File Explorer Implementation Plan

## Overview
This document provides a detailed implementation plan for the File Explorer hyperapp, starting from the `id` app template and following the backend → interface → frontend development pattern.

## Architecture Overview

### Key Components
1. **Backend (Rust)**
   - VFS (Virtual File System) wrapper
   - File operations handler
   - Auth scheme management (HashMap for file permissions)
   - Public HTTP endpoint for file serving
   
2. **WIT Interface**
   - File operations API
   - Directory operations API
   - File sharing/auth API
   
3. **Frontend (React/TypeScript)**
   - Windows Explorer-like UI
   - File/folder browsing
   - Drag-and-drop upload
   - Context menus for file operations
   - Share link generation

## Phase 1: Backend Implementation

### 1.1 Project Setup
1. Copy the `id` app structure as template
2. Update metadata.json:
   ```json
   {
     "name": "file-explorer",
     "description": "VFS file explorer with Windows-like UX and file sharing",
     "package_name": "file_explorer",
     "current_version": "0.1.0",
     "publisher": "sys",
     "wit_version": 1,
     "dependencies": ["vfs:hyperware_ai:vfs"]
   }
   ```

### 1.2 Type Definitions for Auto-Generated API
The WIT interface will be automatically generated from the Rust types and HTTP-annotated functions. Define these types in the Rust backend:

```rust
// Types that will appear in the generated WIT interface
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created: u64,
    pub modified: u64,
    pub is_directory: bool,
    pub permissions: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum AuthScheme {
    Public,
    Private,
}

// The HTTP endpoint functions will generate the WIT interface
// Example function signatures that will create the API:
// #[http]
// async fn list_directory(&mut self, path: String) -> Result<Vec<FileInfo>, String>
// #[http]
// async fn create_file(&mut self, path: String, content: Vec<u8>) -> Result<FileInfo, String>
// etc.
```

### 1.3 State Structure
```rust
#[derive(Default, Debug, serde::Serialize, serde::Deserialize)]
struct FileExplorerState {
    // HashMap to track shared files and their auth schemes
    shared_files: HashMap<String, AuthScheme>,
    // Current working directory for the user
    cwd: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
enum AuthScheme {
    Public,
    Private,
}
```

### 1.4 Core Implementation
In `file-explorer/src/lib.rs`:

1. **VFS Integration**
   - Import VFS capabilities: `use hyperware_process_lib::vfs::{open_file, create_file, open_dir, remove_file, remove_dir, metadata};`
   - Implement wrapper functions for VFS operations
   - Handle path normalization and validation

   **Key VFS Functions to Use:**
   
   ```rust
   // File Operations
   use hyperware_process_lib::vfs::{File, open_file, create_file, remove_file, metadata};
   
   // open_file(path: &str, create: bool, timeout: Option<u64>) -> Result<File, VfsError>
   // Opens existing file or creates if create=true
   let file = open_file("/app:pkg:v/drive/myfile.txt", false, Some(5))?;
   
   // create_file(path: &str, timeout: Option<u64>) -> Result<File, VfsError>  
   // Creates new file or truncates existing
   let file = create_file("/app:pkg:v/drive/newfile.txt", Some(5))?;
   
   // File methods:
   file.read() -> Result<Vec<u8>, VfsError>  // Read entire file
   file.write(&[u8]) -> Result<(), VfsError>  // Write entire content
   file.append(&[u8]) -> Result<(), VfsError>  // Append to file
   file.metadata() -> Result<FileMetadata, VfsError>  // Get size, type
   
   // remove_file(path: &str, timeout: Option<u64>) -> Result<(), VfsError>
   // Deletes a file
   remove_file("/app:pkg:v/drive/oldfile.txt", Some(5))?;
   ```
   
   ```rust
   // Directory Operations
   use hyperware_process_lib::vfs::{Directory, open_dir, remove_dir};
   
   // open_dir(path: &str, create: bool, timeout: Option<u64>) -> Result<Directory, VfsError>
   // Opens existing dir or creates if create=true
   let dir = open_dir("/app:pkg:v/drive/mydir", true, Some(5))?;
   
   // Directory methods:
   dir.read() -> Result<Vec<DirEntry>, VfsError>  // List directory contents
   // DirEntry contains: path: String, file_type: FileType
   
   // remove_dir(path: &str, timeout: Option<u64>) -> Result<(), VfsError>
   // Removes empty directory
   remove_dir("/app:pkg:v/drive/emptydir", Some(5))?;
   ```
   
   ```rust
   // Metadata Operations
   // metadata(path: &str, timeout: Option<u64>) -> Result<FileMetadata, VfsError>
   // Get info about file or directory
   let meta = metadata("/app:pkg:v/drive/item", Some(5))?;
   // FileMetadata contains: file_type: FileType, len: u64
   
   // FileType enum: File, Directory, Symlink, Other
   ```
   
   **Path Format:**
   - VFS paths must include package ID: `/{package_id}/drive/path/to/file`
   - Example: `/file-explorer:sys:v/drive/documents/file.txt`
   - The hyperapp only has access to its own package's drives

2. **File Operations (with HTTP annotations)**
   ```rust
   use hyperware_process_lib::vfs::{open_file, create_file, open_dir, remove_file, remove_dir, metadata, FileType};
   
   #[http]
   async fn list_directory(&mut self, path: String) -> Result<Vec<FileInfo>, String> {
       // Construct VFS path
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       // Open directory
       let dir = open_dir(&vfs_path, false, Some(5))
           .map_err(|e| format!("Failed to open directory: {}", e))?;
       
       // Read directory entries
       let entries = dir.read()
           .map_err(|e| format!("Failed to read directory: {}", e))?;
       
       // Convert to FileInfo
       let mut files = Vec::new();
       for entry in entries {
           let meta = metadata(&entry.path, Some(5))
               .map_err(|e| format!("Failed to get metadata: {}", e))?;
           
           files.push(FileInfo {
               name: entry.path.split('/').last().unwrap_or("").to_string(),
               path: entry.path.replace("/file-explorer:sys:v/drive", ""),
               size: meta.len,
               created: 0, // VFS doesn't provide creation time
               modified: 0, // VFS doesn't provide modification time
               is_directory: meta.file_type == FileType::Directory,
               permissions: "rw".to_string(),
           });
       }
       
       Ok(files)
   }
   
   #[http]
   async fn create_file(&mut self, path: String, content: Vec<u8>) -> Result<FileInfo, String> {
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       // Create file and write content
       let file = create_file(&vfs_path, Some(5))
           .map_err(|e| format!("Failed to create file: {}", e))?;
       
       file.write(&content)
           .map_err(|e| format!("Failed to write file: {}", e))?;
       
       // Get metadata for response
       let meta = file.metadata()
           .map_err(|e| format!("Failed to get metadata: {}", e))?;
       
       Ok(FileInfo {
           name: path.split('/').last().unwrap_or("").to_string(),
           path,
           size: meta.len,
           created: 0,
           modified: 0,
           is_directory: false,
           permissions: "rw".to_string(),
       })
   }
   
   #[http]
   async fn read_file(&mut self, path: String) -> Result<Vec<u8>, String> {
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       let file = open_file(&vfs_path, false, Some(5))
           .map_err(|e| format!("Failed to open file: {}", e))?;
       
       file.read()
           .map_err(|e| format!("Failed to read file: {}", e))
   }
   
   #[http]
   async fn update_file(&mut self, path: String, content: Vec<u8>) -> Result<FileInfo, String> {
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       let file = open_file(&vfs_path, false, Some(5))
           .map_err(|e| format!("Failed to open file: {}", e))?;
       
       file.write(&content)
           .map_err(|e| format!("Failed to write file: {}", e))?;
       
       let meta = file.metadata()
           .map_err(|e| format!("Failed to get metadata: {}", e))?;
       
       Ok(FileInfo {
           name: path.split('/').last().unwrap_or("").to_string(),
           path,
           size: meta.len,
           created: 0,
           modified: 0,
           is_directory: false,
           permissions: "rw".to_string(),
       })
   }
   
   #[http]
   async fn delete_file(&mut self, path: String) -> Result<bool, String> {
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       remove_file(&vfs_path, Some(5))
           .map_err(|e| format!("Failed to delete file: {}", e))?;
       
       Ok(true)
   }
   
   #[http]
   async fn create_directory(&mut self, path: String) -> Result<FileInfo, String> {
       let vfs_path = format!("/file-explorer:sys:v/drive{}", path);
       
       let _dir = open_dir(&vfs_path, true, Some(5))
           .map_err(|e| format!("Failed to create directory: {}", e))?;
       
       Ok(FileInfo {
           name: path.split('/').last().unwrap_or("").to_string(),
           path,
           size: 0,
           created: 0,
           modified: 0,
           is_directory: true,
           permissions: "rw".to_string(),
       })
   }
   
   #[http]
   async fn upload_file(&mut self, path: String, filename: String, content: Vec<u8>) -> Result<FileInfo, String> {
       let full_path = format!("{}/{}", path, filename);
       self.create_file(full_path, content).await
   }
   ```

3. **Sharing System**
   ```rust
   #[http]
   async fn share_file(&mut self, path: String, auth: AuthScheme) -> Result<String, String> {
       // Add to shared_files HashMap
       // Generate and return share link
   }
   
   #[http]
   async fn get_share_link(&mut self, path: String) -> Result<Option<String>, String> {
       // Check if file is shared and return link
   }
   
   // Special endpoint for serving shared files
   #[http]
   async fn serve_shared_file(&mut self) -> Result<Vec<u8>, String> {
       // Use get_path() to handle routing
       let request_path = hyperware_app_common::get_path();
       
       // Extract the file path from the request
       if request_path.starts_with("/shared/") {
           let file_path = request_path.strip_prefix("/shared/").unwrap();
           // Check auth scheme and serve file
       } else {
           Err("Invalid path".to_string())
       }
   }
   ```

### 1.5 HTTP Endpoints Configuration
```rust
#[hyperprocess(
    name = "file-explorer",
    ui = Some(HttpBindingConfig::default()),
    endpoints = vec![
        Binding::Http {
            path: "/api",
            config: HttpBindingConfig::default(),
        },
        Binding::Ws {
            path: "/ws",
            config: WsBindingConfig::default(),
        },
        Binding::Http {
            path: "/shared",
            config: HttpBindingConfig::default(),
        }
    ],
    save_config = SaveOptions::Never,
    wit_world = "file-explorer-sys-v0",
)]
```

## Phase 2: Interface Generation

### 2.1 Build Process
```bash
kit build --hyperapp
```
This automatically:
- Analyzes the Rust backend code
- Identifies all `#[http]` annotated functions
- Extracts parameter and return types
- Generates WIT interface definitions in `api/`
- Creates TypeScript bindings in `target/ui/caller-utils/`

### 2.2 Generated API Structure
The build process will create:
- WIT files based on your Rust function signatures
- TypeScript types matching your Rust structs/enums
- Async functions for each HTTP endpoint
- Proper error handling types

Example generated TypeScript:
```typescript
// Auto-generated from Rust types
export interface FileInfo {
    name: string;
    path: string;
    size: number;
    created: number;
    modified: number;
    is_directory: boolean;
    permissions: string;
}

export enum AuthScheme {
    Public = "public",
    Private = "private"
}

// Auto-generated from HTTP functions
export async function listDirectory(path: string): Promise<FileInfo[]>;
export async function createFile(path: string, content: Uint8Array): Promise<FileInfo>;
// etc.
```

## Phase 3: Frontend Implementation

### 3.1 UI Structure
```
ui/
├── src/
│   ├── components/
│   │   ├── FileExplorer/
│   │   │   ├── FileExplorer.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   └── styles.css
│   │   ├── ContextMenu/
│   │   │   ├── ContextMenu.tsx
│   │   │   └── styles.css
│   │   ├── Upload/
│   │   │   ├── DropZone.tsx
│   │   │   ├── UploadProgress.tsx
│   │   │   └── styles.css
│   │   └── ShareDialog/
│   │       ├── ShareDialog.tsx
│   │       └── styles.css
│   ├── store/
│   │   └── fileExplorer.ts
│   ├── hooks/
│   │   ├── useFileOperations.ts
│   │   └── useDragDrop.ts
│   └── App.tsx
```

### 3.2 State Management (Zustand)
```typescript
interface FileExplorerStore {
    currentPath: string;
    files: FileInfo[];
    selectedFiles: string[];
    uploadProgress: Map<string, number>;
    sharedLinks: Map<string, string>;
    
    // Actions
    setCurrentPath: (path: string) => void;
    setFiles: (files: FileInfo[]) => void;
    selectFile: (path: string) => void;
    deselectFile: (path: string) => void;
    clearSelection: () => void;
    updateUploadProgress: (fileId: string, progress: number) => void;
    addSharedLink: (path: string, link: string) => void;
}
```

### 3.3 Core Components

1. **FileExplorer Component**
   - Main container
   - Toolbar with navigation buttons
   - Breadcrumb navigation
   - File list view (grid/list toggle)

2. **FileList Component**
   - Display files/folders
   - Handle selection (click, ctrl+click, shift+click)
   - Double-click to open
   - Right-click context menu

3. **DropZone Component**
   - Drag-and-drop overlay
   - Handle file/folder drops
   - Visual feedback during drag

4. **ContextMenu Component**
   - Right-click menu options:
     - Create new file/folder
     - Rename
     - Delete
     - Share
     - Download
     - Properties

5. **ShareDialog Component**
   - Select auth scheme
   - Generate link
   - Copy to clipboard

### 3.4 File Operations Implementation

1. **Navigation**
   ```typescript
   const navigateTo = async (path: string) => {
       const files = await listDirectory(path);
       store.setFiles(files);
       store.setCurrentPath(path);
   };
   ```

2. **Upload Handling**
   ```typescript
   const handleUpload = async (files: FileList) => {
       for (const file of files) {
           const content = await file.arrayBuffer();
           await uploadFile(currentPath, file.name, Array.from(new Uint8Array(content)));
       }
       await refreshCurrentDirectory();
   };
   ```

3. **Drag-Drop Support**
   - File drag from desktop
   - Directory drag support (using webkitGetAsEntry API)
   - Visual drop zones

### 3.5 Windows Explorer UX Features

1. **Selection Behavior**
   - Single click: select
   - Double click: open
   - Ctrl+click: toggle selection
   - Shift+click: range selection
   - Ctrl+A: select all

2. **Keyboard Shortcuts**
   - Delete: delete selected
   - F2: rename
   - Ctrl+C/V: copy/paste
   - Ctrl+N: new folder

3. **View Options**
   - List view
   - Grid view (large icons)
   - Sort by name/size/date

## Phase 4: Integration & Testing

### 4.1 Development Workflow
1. Implement backend feature
2. Run `kit build --hyperapp` to generate bindings
3. Implement frontend to consume new API
4. Test full integration

### 4.2 Testing Strategy
1. **Backend Tests**
   - Unit tests for file operations
   - Integration tests with VFS
   - Auth scheme validation tests

2. **Frontend Tests**
   - Component rendering tests
   - User interaction tests
   - File operation mock tests

### 4.3 Error Handling
1. **Backend**
   - VFS operation failures
   - Invalid paths
   - Permission errors
   - Storage limits

2. **Frontend**
   - Network errors
   - Invalid file types
   - Upload failures
   - User feedback for all errors

## Phase 5: Public File Serving

### 5.1 Shared Files Endpoint
The `serve_shared_file` function will handle public file access using path matching:
```rust
#[http]
async fn serve_shared_file(&mut self) -> Result<Vec<u8>, String> {
    // Get the request path
    let request_path = hyperware_app_common::get_path();
    
    // Check if this is a shared file request
    if let Some(file_path) = request_path.strip_prefix("/shared/") {
        // Check if file is in shared_files HashMap
        if let Some(auth_scheme) = self.shared_files.get(file_path) {
            match auth_scheme {
                AuthScheme::Public => {
                    // Read file from VFS and return content
                    // vfs_read_file(file_path).await
                },
                AuthScheme::Private => {
                    Err("Access denied".to_string())
                }
            }
        } else {
            Err("File not shared".to_string())
        }
    } else {
        Err("Invalid shared file path".to_string())
    }
}
```

### 5.2 Link Generation
- Format: `https://domain.com/file-explorer/shared/{file-id}`
- File ID: hash of path or unique identifier
- Store mapping in state

## Implementation Timeline

1. **Week 1**: Backend core implementation
   - Project setup from id template
   - WIT interface definition
   - Basic file operations

2. **Week 2**: Backend sharing features
   - Auth scheme implementation
   - Public endpoint setup
   - Link generation

3. **Week 3**: Frontend UI structure
   - Component architecture
   - Basic file browsing
   - Selection handling

4. **Week 4**: Frontend advanced features
   - Drag-drop upload
   - Context menus
   - Share dialog
   - Windows Explorer UX polish

5. **Week 5**: Integration & testing
   - Full system testing
   - Error handling
   - Performance optimization
   - Documentation

## Key Development Notes

### API Generation Process
1. **Backend-First Development**
   - Define Rust types (structs, enums) that will be used in function signatures
   - Implement functions with `#[http]` annotations
   - Use proper Rust types that can be serialized (serde::Serialize/Deserialize)
   - The WIT interface is AUTO-GENERATED from these implementations

2. **Build & Generate**
   - Run `kit build --hyperapp` after backend changes
   - This generates:
     - WIT files in `api/` directory
     - TypeScript bindings in `target/ui/caller-utils/`
   - Never manually edit the generated files

3. **Frontend Consumption**
   - Import generated functions from `target/ui/caller-utils/`
   - Use generated TypeScript types for type safety
   - Handle Promise-based async functions

### Important Guidelines
- DO NOT manually create WIT files - they are generated
- `#[http]` annotations don't take arguments - use `hyperware_app_common::get_path()` for routing
- Always build backend first, then generate interface, then implement frontend
- Use existing VFS capabilities rather than reimplementing file operations
- Follow Windows Explorer UX patterns closely for familiarity
- Ensure all file operations are properly authenticated
- Handle large file uploads with progress indicators
- Consider file type icons and previews for better UX

### Type Mapping
- Rust `String` → TypeScript `string`
- Rust `Vec<u8>` → TypeScript `Uint8Array`
- Rust `u64` → TypeScript `number`
- Rust `Result<T, E>` → TypeScript `Promise<T>` (errors throw)
- Rust enums → TypeScript enums with string values