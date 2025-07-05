import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFChunk {
  text: string;
  page: number;
}

export class FileProcessor {
  /**
   * Extract text from a PDF file
   */
  static async extractTextFromPDF(file: File): Promise<string[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const textChunks: string[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let pageText = '';
        for (const item of textContent.items) {
          if ('str' in item) {
            pageText += item.str + ' ';
          }
        }
        
        if (pageText.trim()) {
          textChunks.push(pageText.trim());
        }
      }
      
      return textChunks;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from markdown or text files
   */
  static async extractTextFromFile(file: File): Promise<string[]> {
    try {
      const text = await file.text();
      return [text];
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error('Failed to extract text from file');
    }
  }

  /**
   * Extract text from JSON files
   */
  static async extractTextFromJSON(file: File): Promise<string[]> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Convert JSON to readable text chunks
      const textChunks: string[] = [];
      
      const flattenJSON = (obj: any, path: string = ""): void => {
        if (typeof obj === 'object' && obj !== null) {
          if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
              const newPath = path ? `${path}[${i}]` : `[${i}]`;
              flattenJSON(obj[i], newPath);
            }
          } else {
            for (const [key, value] of Object.entries(obj)) {
              const newPath = path ? `${path}.${key}` : key;
              flattenJSON(value, newPath);
            }
          }
        } else {
          textChunks.push(`${path}: ${obj}`);
        }
      };
      
      flattenJSON(data);
      return textChunks;
    } catch (error) {
      console.error('Error extracting text from JSON:', error);
      throw new Error('Failed to extract text from JSON file');
    }
  }

  /**
   * Extract text from CSV files
   */
  static async extractTextFromCSV(file: File): Promise<string[]> {
    try {
      const text = await file.text();
      
      // Parse CSV and convert to text chunks
      const lines = text.split('\n');
      const textChunks: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (split by comma, handle quoted values)
        const cells = this.parseCSVLine(line);
        
        if (i === 0) { // Header row
          const header = cells.join(" | ");
          textChunks.push(`Headers: ${header}`);
        } else { // Data row
          const rowText = cells.join(" | ");
          textChunks.push(`Row ${i}: ${rowText}`);
        }
      }
      
      if (textChunks.length === 0) {
        throw new Error('CSV file is empty or could not be parsed');
      }
      
      return textChunks;
    } catch (error) {
      console.error('Error extracting text from CSV:', error);
      throw new Error('Failed to extract text from CSV file');
    }
  }

  /**
   * Simple CSV line parser that handles quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of cell
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    // Add the last cell
    cells.push(currentCell.trim());
    
    return cells;
  }

  /**
   * Split text into chunks similar to the backend CharacterTextSplitter
   */
  static splitTextIntoChunks(texts: string[], chunkSize: number = 1000, chunkOverlap: number = 200): string[] {
    const chunks: string[] = [];
    
    for (const text of texts) {
      if (text.length <= chunkSize) {
        chunks.push(text);
        continue;
      }
      
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);
        
        // Try to break at a word boundary
        if (end < text.length) {
          const lastSpace = chunk.lastIndexOf(' ');
          if (lastSpace > start + chunkSize * 0.8) { // Only break at word if it's not too early
            chunk = chunk.slice(0, lastSpace);
            start = start + lastSpace + 1;
          } else {
            start = end;
          }
        } else {
          start = end;
        }
        
        if (chunk.trim()) {
          chunks.push(chunk.trim());
        }
      }
    }
    
    return chunks;
  }

  /**
   * Create embeddings for text chunks using OpenAI API
   */
  static async createEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: 'text-embedding-3-small'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Error creating embeddings:', error);
      throw new Error('Failed to create embeddings');
    }
  }

  /**
   * Process any supported file type: PDF, Markdown, Text, CSV, or JSON
   */
  static async processFile(file: File): Promise<{
    chunks: string[];
    embeddings: number[][];
  }> {
    const fileType = file.name.toLowerCase().split('.').pop();
    
    let textChunks: string[];
    
    if (fileType === 'pdf') {
      // Extract text from PDF
      textChunks = await this.extractTextFromPDF(file);
    } else if (fileType === 'md' || fileType === 'txt') {
      // Extract text from markdown or text files
      textChunks = await this.extractTextFromFile(file);
    } else if (fileType === 'csv') {
      // Extract text from CSV files
      textChunks = await this.extractTextFromCSV(file);
    } else if (fileType === 'json') {
      // Extract text from JSON files
      textChunks = await this.extractTextFromJSON(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    if (textChunks.length === 0) {
      throw new Error('No text could be extracted from the file');
    }
    
    // Split text into chunks
    const chunks = this.splitTextIntoChunks(textChunks);
    
    if (chunks.length === 0) {
      throw new Error('No text chunks could be created from the file');
    }
    
    // Create embeddings
    const embeddings = await this.createEmbeddings(chunks);
    
    return {
      chunks,
      embeddings
    };
  }

  /**
   * Process a PDF file completely: extract text, split into chunks, and create embeddings
   * @deprecated Use processFile instead
   */
  static async processPDF(file: File): Promise<{
    chunks: string[];
    embeddings: number[][];
  }> {
    return this.processFile(file);
  }
} 