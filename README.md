# File Explorer

File Explorer is a hyperapp that wraps the vfs, providing two key services:
1. A GUI File Explorer that matches UX of the Windows File Explorer.
   Allows for:
   - Browsing, creating, editing files.
   - Creating, browsing, editing directories.
   - Uploading files with drag-drop or file dialog selection.
   - Uploading directories with drag-drop or file dialog selection.
2. Creating shareable links for files.
   The File Explorer maintains a HashMap of file: auth scheme.
   Files are served from a public HTTP endpoint.
   When a request is made, the File Explorer determines if the requested file is in the HashMap and if the auth scheme is satisfied.
   Initially, the only auth scheme variant is `Public` which, if set, allows anyone with the link to view the file.

Creating a shareable link is just one of the options for manipulating files amongst creating, editing, etc.
