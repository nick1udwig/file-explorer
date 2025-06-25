use hyperprocess_macro::hyperprocess;
use hyperware_app_common::hyperware_process_lib::logging::{init_logging, Level, info, debug};
use hyperware_app_common::hyperware_process_lib::vfs::{self, FileType};
use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
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

#[derive(Default, Debug, serde::Serialize, serde::Deserialize)]
struct FileExplorerState {
    // HashMap to track shared files and their auth schemes
    shared_files: HashMap<String, AuthScheme>,
    // Current working directory for the user
    cwd: String,
}

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
impl FileExplorerState {
    #[init]
    async fn init(&mut self) {
        init_logging(Level::DEBUG, Level::INFO, None, None, None).unwrap();
        self.cwd = "/".to_string();

        hyperware_process_lib::homepage::add_to_homepage("File Explorer", None, Some(""), None);
        //hyperware_process_lib::homepage::add_to_homepage("File Explorer", Some(ICON), Some(""), None);
    }

    #[http]
    async fn list_directory(&mut self, path: String) -> Result<Vec<FileInfo>, String> {
        info!("list_directory called with path: {}", path);

        // For root path, read from VFS root to get all drives
        let vfs_path = if path == "/" || path.is_empty() {
            "/".to_string()
        } else {
            path.clone()
        };

        // Open directory
        let dir = vfs::Directory {
            path: vfs_path,
            timeout: 5,
        };

        // Read directory entries
        let entries = dir.read()
            .map_err(|e| format!("Failed to read directory: {}", e))?;

        // Convert to FileInfo
        let mut files = Vec::new();
        for entry in entries {
            // Check if entry is a directory
            if entry.file_type == FileType::Directory {
                // For directories, create a Directory object and read it
                let sub_dir = vfs::Directory {
                    path: format!("/{}", entry.path),
                    timeout: 5,
                };
                
                // Try to read the directory to get its contents count
                let dir_size = match sub_dir.read() {
                    Ok(contents) => contents.len() as u64,
                    Err(_) => 0, // If we can't read it, assume it's empty or inaccessible
                };
                
                // Extract filename from the path
                let filename = entry.path.split('/').last().unwrap_or("").to_string();
                
                files.push(FileInfo {
                    name: filename,
                    path: format!("/{}", entry.path),
                    size: dir_size, // Number of items in directory
                    created: 0,
                    modified: 0,
                    is_directory: true,
                    permissions: "rw".to_string(),
                });
            } else {
                // For files, get metadata as before
                let meta = vfs::metadata(&format!("/{}", entry.path), Some(5))
                    .map_err(|e| format!("Failed to get metadata for {}: {}", entry.path, e))?;
                
                // Extract filename from the path
                let filename = entry.path.split('/').last().unwrap_or("").to_string();
                
                files.push(FileInfo {
                    name: filename,
                    path: format!("/{}", entry.path),
                    size: meta.len,
                    created: 0,
                    modified: 0,
                    is_directory: false,
                    permissions: "rw".to_string(),
                });
            }
        }

        info!("Returning {} files", files.len());
        Ok(files)
    }

    #[http]
    async fn create_file(&mut self, path: String, content: Vec<u8>) -> Result<FileInfo, String> {
        info!("create_file called with path: {}", path);

        let vfs_path = path.clone();
        debug!("VFS path: {}", vfs_path);

        // Create file and write content
        let file = vfs::create_file(&vfs_path, Some(5))
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
        info!("read_file called with path: {}", path);

        let vfs_path = path.clone();

        let file = vfs::open_file(&vfs_path, false, Some(5))
            .map_err(|e| format!("Failed to open file: {}", e))?;

        file.read()
            .map_err(|e| format!("Failed to read file: {}", e))
    }

    #[http]
    async fn update_file(&mut self, path: String, content: Vec<u8>) -> Result<FileInfo, String> {
        info!("update_file called with path: {}", path);

        let vfs_path = path.clone();

        let file = vfs::open_file(&vfs_path, false, Some(5))
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
        info!("delete_file called with path: {}", path);

        let vfs_path = path.clone();

        vfs::remove_file(&vfs_path, Some(5))
            .map_err(|e| format!("Failed to delete file: {}", e))?;

        Ok(true)
    }

    #[http]
    async fn create_directory(&mut self, path: String) -> Result<FileInfo, String> {
        info!("create_directory called with path: {}", path);

        let vfs_path = path.clone();

        let _dir = vfs::open_dir(&vfs_path, true, Some(5))
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
    async fn delete_directory(&mut self, path: String) -> Result<bool, String> {
        info!("delete_directory called with path: {}", path);

        let vfs_path = path.clone();

        vfs::remove_dir(&vfs_path, Some(5))
            .map_err(|e| format!("Failed to delete directory: {}", e))?;

        Ok(true)
    }

    #[http]
    async fn upload_file(&mut self, path: String, filename: String, content: Vec<u8>) -> Result<FileInfo, String> {
        let full_path = format!("{}/{}", path, filename);
        self.create_file(full_path, content).await
    }

    #[http]
    async fn share_file(&mut self, path: String, auth: AuthScheme) -> Result<String, String> {
        // Generate share ID from path hash
        let share_id = format!("{:x}", md5::compute(&path));

        // Add to shared_files HashMap
        self.shared_files.insert(path.clone(), auth);

        // Return share link
        Ok(format!("/shared/{}", share_id))
    }

    #[http]
    async fn unshare_file(&mut self, path: String) -> Result<bool, String> {
        Ok(self.shared_files.remove(&path).is_some())
    }

    #[http]
    async fn get_share_link(&mut self, path: String) -> Result<Option<String>, String> {
        // Check if file is shared
        if self.shared_files.contains_key(&path) {
            let share_id = format!("{:x}", md5::compute(&path));
            Ok(Some(format!("/shared/{}", share_id)))
        } else {
            Ok(None)
        }
    }

    #[http]
    async fn serve_shared_file(&mut self) -> Result<Vec<u8>, String> {
        // Use get_path() to handle routing
        let request_path = hyperware_app_common::get_path();

        // Extract the file path from the request
        if let Some(request_path_str) = request_path {
            if let Some(share_id) = request_path_str.strip_prefix("/shared/") {
            // Find the original path from share_id
            for (path, auth_scheme) in &self.shared_files {
                if format!("{:x}", md5::compute(path)) == share_id {
                    match auth_scheme {
                        AuthScheme::Public => {
                            // Read and return file content
                            return self.read_file(path.clone()).await;
                        },
                        AuthScheme::Private => {
                            return Err("Access denied: Private file".to_string());
                        }
                    }
                }
            }
                Err("File not found or not shared".to_string())
            } else {
                Err("Invalid shared file path".to_string())
            }
        } else {
            Err("No request path provided".to_string())
        }
    }

    #[http]
    async fn get_current_directory(&mut self) -> Result<String, String> {
        Ok(self.cwd.clone())
    }

    #[http]
    async fn set_current_directory(&mut self, path: String) -> Result<String, String> {
        self.cwd = path.clone();
        Ok(path)
    }

    #[http]
    async fn move_file(&mut self, source: String, destination: String) -> Result<FileInfo, String> {
        // Read file content
        let content = self.read_file(source.clone()).await?;

        // Create file at destination
        let file_info = self.create_file(destination, content).await?;

        // Delete source file
        self.delete_file(source).await?;

        Ok(file_info)
    }

    #[http]
    async fn copy_file(&mut self, source: String, destination: String) -> Result<FileInfo, String> {
        // Read file content
        let content = self.read_file(source).await?;

        // Create file at destination
        self.create_file(destination, content).await
    }
}
