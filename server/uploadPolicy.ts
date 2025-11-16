export const UploadPolicy = {
  MAX_FILE_SIZE_MB: 25,
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25MB in bytes
  
  ALLOWED_MIME_TYPES: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown',
    
    // Audio/Video (common formats)
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
  ],
  
  isValidFileSize(sizeInBytes: number): boolean {
    return sizeInBytes > 0 && sizeInBytes <= this.MAX_FILE_SIZE_BYTES;
  },
  
  isValidMimeType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
  },
  
  validate(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
    if (!this.isValidFileSize(fileSize)) {
      return {
        valid: false,
        error: `File size must be less than ${this.MAX_FILE_SIZE_MB}MB`,
      };
    }
    
    if (!this.isValidMimeType(mimeType)) {
      return {
        valid: false,
        error: `File type '${mimeType}' is not allowed`,
      };
    }
    
    return { valid: true };
  },
};
