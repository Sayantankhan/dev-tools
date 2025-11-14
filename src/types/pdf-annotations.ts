export type AnnotationType = 'text' | 'signature' | 'checkbox' | 'mask';

export interface PDFAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  
  // Image-specific (signature, checkbox, mask)
  imageData?: string;
  
  // Checkbox-specific
  checkboxState?: 'tick' | 'x';
}

export interface PageAnnotations {
  [pageIndex: number]: PDFAnnotation[];
}
