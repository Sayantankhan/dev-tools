import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchHandler } from "@/modules/state/SearchStateHandler";

export const SearchTool = () => {
  const handler = useSearchHandler();
  const {
    documents,
    query,
    results,
    isSearching,
    isProcessing,
    selectedModel,
    pastedText,
    downloadProgress,
    isDownloading,
  } = handler.state;

  const {
    setQuery,
    setPastedText,
    setSelectedModel,
  } = handler.setters;

  const {
    handleFileUpload,
    handlePasteContent,
    handleSearch,
    clearDocument,
    clearAllDocuments,
  } = handler.actions;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Semantic Search</h2>
        <p className="text-muted-foreground">
          Upload documents or paste text, then ask questions in natural language
        </p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Embedding Model</CardTitle>
          <CardDescription>Select the model for semantic search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Xenova/all-MiniLM-L6-v2">MiniLM-L6-v2 (Fast, Balanced)</SelectItem>
              <SelectItem value="Xenova/paraphrase-multilingual-MiniLM-L12-v2">Multilingual MiniLM (Multi-language)</SelectItem>
              <SelectItem value="mixedbread-ai/mxbai-embed-xsmall-v1">MixedBread xSmall (High Quality)</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-2">
              <Label>Downloading model... {Math.round(downloadProgress * 100)}%</Label>
              <Progress value={downloadProgress * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Documents</CardTitle>
          <CardDescription>PDF, DOCX, or TXT files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={clearAllDocuments}
              disabled={documents.length === 0 || isProcessing}
              title="Clear all documents"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Document List */}
          {documents.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Documents ({documents.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                      <Badge variant={doc.status === "processed" ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => clearDocument(doc.id)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paste Text Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Or Paste Text</CardTitle>
          <CardDescription>Paste content directly for searching</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your text content here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={isProcessing}
            rows={6}
          />
          <Button
            onClick={handlePasteContent}
            disabled={!pastedText.trim() || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Process Text
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ask a Question</CardTitle>
          <CardDescription>Search across your documents with natural language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="What would you like to know?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching || documents.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleSearch();
                }
              }}
            />
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching || documents.length === 0}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3 mt-6">
              <Label>Search Results ({results.length})</Label>
              {results.map((result, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium">
                          {result.documentName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Relevance: {(result.score * 100).toFixed(1)}%
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        Chunk {result.chunkIndex + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{result.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {query && results.length === 0 && !isSearching && documents.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results found. Try rephrasing your question.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
