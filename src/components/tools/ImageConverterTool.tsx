import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileImage } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export const ImageConverterTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    setSelectedFile(file);
    setConvertedImage(null);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    
    const img = new Image();
    const url = URL.createObjectURL(selectedFile);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast.error("Failed to create canvas");
        URL.revokeObjectURL(url);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          setConvertedImage(pngUrl);
          toast.success("Image converted to PNG!");
        }
      }, 'image/png', 1.0);
      
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      toast.error("Failed to load image");
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleDownload = () => {
    if (!convertedImage) return;
    const a = document.createElement('a');
    a.href = convertedImage;
    a.download = selectedFile?.name.replace(/\.[^.]+$/, '.png') || 'converted.png';
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            JPEG to PNG Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select Image (JPEG, JPG, WEBP)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Select Image
              </Button>
              {selectedFile && (
                <span className="flex items-center text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>
          
          {selectedFile && !convertedImage && (
            <Button onClick={handleConvert}>Convert to PNG</Button>
          )}
          
          {convertedImage && (
            <div className="space-y-3">
              <img src={convertedImage} alt="Converted" className="max-w-full rounded-lg border" />
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
