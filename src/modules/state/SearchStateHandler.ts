import { useState, useCallback } from "react";
import { toast } from "sonner";
import { pipeline } from "@huggingface/transformers";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Document {
  id: string;
  name: string;
  content: string;
  chunks: string[];
  embeddings: number[][];
  status: "processing" | "processed" | "error";
}

interface SearchResult {
  documentName: string;
  text: string;
  score: number;
  chunkIndex: number;
}

let embeddingPipeline: any = null;

const getEmbeddingPipeline = async (modelName: string) => {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline("feature-extraction", modelName);
  }
  return embeddingPipeline;
};

const chunkText = (text: string, chunkSize = 500, overlap = 50): string[] => {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks.length > 0 ? chunks : [text];
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
};

const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.name.split(".").pop()?.toLowerCase();

  if (fileType === "txt") {
    return await file.text();
  } else if (fileType === "pdf") {
    return await extractTextFromPDF(file);
  } else if (fileType === "docx") {
    // For DOCX, we'll use a simple text extraction
    // In production, you'd want to use a proper DOCX parser
    toast.info("DOCX parsing is basic - consider converting to PDF or TXT for best results");
    return await file.text();
  }

  throw new Error("Unsupported file type");
};

export const useSearchHandler = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Xenova/all-MiniLM-L6-v2");
  const [pastedText, setPastedText] = useState("");

  const generateEmbeddings = async (texts: string[], modelName: string): Promise<number[][]> => {
    const extractor = await getEmbeddingPipeline(modelName);
    const embeddings = await extractor(texts, { pooling: "mean", normalize: true });
    return embeddings.tolist();
  };

  const processDocument = async (file: File, modelName: string): Promise<Document> => {
    const content = await extractTextFromFile(file);
    const chunks = chunkText(content);
    const embeddings = await generateEmbeddings(chunks, modelName);

    return {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      content,
      chunks,
      embeddings,
      status: "processed",
    };
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      const newDocs: Document[] = [];

      try {
        toast.info(`Processing ${files.length} file(s)...`);

        for (const file of Array.from(files)) {
          try {
            const doc = await processDocument(file, selectedModel);
            newDocs.push(doc);
          } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            toast.error(`Failed to process ${file.name}`);
          }
        }

        setDocuments((prev) => [...prev, ...newDocs]);
        toast.success(`Successfully processed ${newDocs.length} file(s)`);
      } catch (error) {
        console.error("Error processing files:", error);
        toast.error("Failed to process files");
      } finally {
        setIsProcessing(false);
        e.target.value = "";
      }
    },
    [selectedModel]
  );

  const handlePasteContent = useCallback(async () => {
    if (!pastedText.trim()) return;

    setIsProcessing(true);
    try {
      const chunks = chunkText(pastedText);
      const embeddings = await generateEmbeddings(chunks, selectedModel);

      const doc: Document = {
        id: `pasted-${Date.now()}`,
        name: `Pasted Text (${new Date().toLocaleTimeString()})`,
        content: pastedText,
        chunks,
        embeddings,
        status: "processed",
      };

      setDocuments((prev) => [...prev, doc]);
      setPastedText("");
      toast.success("Text processed successfully");
    } catch (error) {
      console.error("Error processing pasted text:", error);
      toast.error("Failed to process text");
    } finally {
      setIsProcessing(false);
    }
  }, [pastedText, selectedModel]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || documents.length === 0) return;

    setIsSearching(true);
    try {
      const queryEmbedding = await generateEmbeddings([query], selectedModel);
      const queryVector = queryEmbedding[0];

      const allResults: SearchResult[] = [];

      documents.forEach((doc) => {
        doc.embeddings.forEach((chunkEmbedding, chunkIdx) => {
          const score = cosineSimilarity(queryVector, chunkEmbedding);
          allResults.push({
            documentName: doc.name,
            text: doc.chunks[chunkIdx],
            score,
            chunkIndex: chunkIdx,
          });
        });
      });

      // Sort by score and take top 5
      allResults.sort((a, b) => b.score - a.score);
      setResults(allResults.slice(0, 5));
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [query, documents, selectedModel]);

  const clearDocument = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setResults([]);
  }, []);

  const clearAllDocuments = useCallback(() => {
    setDocuments([]);
    setResults([]);
    setQuery("");
    setPastedText("");
  }, []);

  const handleModelChange = useCallback((newModel: string) => {
    setSelectedModel(newModel);
    embeddingPipeline = null; // Reset pipeline to load new model
    if (documents.length > 0) {
      toast.info("Model changed. Re-upload documents for best results.");
    }
  }, [documents.length]);

  return {
    state: {
      documents,
      query,
      results,
      isSearching,
      isProcessing,
      selectedModel,
      pastedText,
    },
    setters: {
      setQuery,
      setPastedText,
      setSelectedModel: handleModelChange,
    },
    actions: {
      handleFileUpload,
      handlePasteContent,
      handleSearch,
      clearDocument,
      clearAllDocuments,
    },
    helpers: {},
  };
};
