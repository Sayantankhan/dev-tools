import { useState, useCallback } from 'react';
import { PDFAnnotation, PageAnnotations } from '@/types/pdf-annotations';

export const usePDFAnnotations = () => {
  const [annotations, setAnnotations] = useState<PageAnnotations>({});
  const [history, setHistory] = useState<PageAnnotations[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addAnnotation = useCallback((pageIndex: number, annotation: PDFAnnotation) => {
    setAnnotations(prev => {
      const newAnnotations = {
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), annotation]
      };
      
      // Add to history
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(i => i + 1);
      
      return newAnnotations;
    });
  }, [historyIndex]);

  const updateAnnotation = useCallback((pageIndex: number, annotationId: string, updates: Partial<PDFAnnotation>) => {
    setAnnotations(prev => {
      const pageAnnotations = prev[pageIndex] || [];
      const newAnnotations = {
        ...prev,
        [pageIndex]: pageAnnotations.map(ann => 
          ann.id === annotationId ? { ...ann, ...updates } : ann
        )
      };
      
      // Add to history
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(i => i + 1);
      
      return newAnnotations;
    });
  }, [historyIndex]);

  const removeAnnotation = useCallback((pageIndex: number, annotationId: string) => {
    setAnnotations(prev => {
      const newAnnotations = {
        ...prev,
        [pageIndex]: (prev[pageIndex] || []).filter(ann => ann.id !== annotationId)
      };
      
      // Add to history
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(i => i + 1);
      
      return newAnnotations;
    });
  }, [historyIndex]);

  const clearPage = useCallback((pageIndex: number) => {
    setAnnotations(prev => {
      const newAnnotations = { ...prev };
      delete newAnnotations[pageIndex];
      
      // Add to history
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(i => i + 1);
      
      return newAnnotations;
    });
  }, [historyIndex]);

  const clearAll = useCallback(() => {
    setAnnotations({});
    setHistory([{}]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(i => i + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const getPageAnnotations = useCallback((pageIndex: number) => {
    return annotations[pageIndex] || [];
  }, [annotations]);

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearPage,
    clearAll,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    getPageAnnotations,
  };
};
