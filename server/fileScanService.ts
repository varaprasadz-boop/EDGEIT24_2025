import type { IStorage } from "./storage";

export interface ScanResult {
  status: 'clean' | 'infected' | 'error';
  scanCompletedAt: Date;
  details?: string;
}

export class FileScanService {
  constructor(private storage: IStorage) {}
  
  async scanFile(fileId: string): Promise<ScanResult> {
    try {
      const result = await this.performScan(fileId);
      
      await this.storage.updateMessageFile(fileId, {
        scanStatus: result.status as any,
      });
      
      console.log(`[FileScanService] File ${fileId} scan completed: ${result.status}`);
      return result;
    } catch (error) {
      console.error(`[FileScanService] Error scanning file ${fileId}:`, error);
      
      await this.storage.updateMessageFile(fileId, {
        scanStatus: 'error' as any,
      });
      
      return {
        status: 'error',
        scanCompletedAt: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async performScan(fileId: string): Promise<ScanResult> {
    console.log(`[FileScanService] Performing mock virus scan on file ${fileId}...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      status: 'clean',
      scanCompletedAt: new Date(),
      details: 'Mock scan completed successfully',
    };
  }
  
  async queueScan(fileId: string): Promise<void> {
    setImmediate(async () => {
      await this.scanFile(fileId);
    });
  }
}
