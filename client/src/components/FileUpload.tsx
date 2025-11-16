import { useState, useRef, useCallback } from "react";
import { Upload, X, FileIcon, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 25; // 25MB default max

export function FileUpload({
  onFileSelect,
  onFileRemove,
  maxSizeMB = MAX_FILE_SIZE_MB,
  acceptedFileTypes = [],
  disabled = false,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return false;
    }

    if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Accepted file types: ${acceptedFileTypes.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [maxSizeMB, acceptedFileTypes, toast]);

  const handleFileChange = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleRemove = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileRemove?.();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-8 w-8 text-primary" />;
    } else if (file.type.includes("pdf") || file.type.includes("document")) {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    return <FileIcon className="h-8 w-8 text-primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (selectedFile) {
    return (
      <div className="border rounded-md p-3 bg-accent/20" data-testid="file-upload-selected">
        <div className="flex items-center gap-3">
          {getFileIcon(selectedFile)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="h-1 mt-2" />
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRemove}
            disabled={disabled}
            data-testid="button-remove-file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-md p-6 text-center cursor-pointer
        transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-accent/50"}
      `}
      onClick={() => !disabled && fileInputRef.current?.click()}
      data-testid="file-upload-dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        accept={acceptedFileTypes.join(",")}
        className="hidden"
        disabled={disabled}
        data-testid="input-file"
      />
      
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium mb-1">
        {isDragActive ? "Drop file here" : "Drag & drop or click to upload"}
      </p>
      <p className="text-xs text-muted-foreground">
        Max file size: {maxSizeMB}MB
      </p>
    </div>
  );
}
