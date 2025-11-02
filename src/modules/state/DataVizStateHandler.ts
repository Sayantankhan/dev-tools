import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import Papa from "papaparse";

export type ChartType = "line" | "bar" | "pie" | "area";

export const DataVizStateHandler = (): ToolHandler => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedXAxis, setSelectedXAxis] = useState("");
  const [selectedYAxis, setSelectedYAxis] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [rawInput, setRawInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    parseCSV: (csvString: string): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          },
        });
      });
    },

    parseJSON: (jsonString: string): any[] => {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [parsed];
    },

    extractColumns: (data: any[]): string[] => {
      if (!data || data.length === 0) return [];
      return Object.keys(data[0]);
    },

    isNumericColumn: (data: any[], column: string): boolean => {
      return data.every((row) => !isNaN(parseFloat(row[column])));
    },

    computeHistogram: (values: number[], binCount = 20) => {
      const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
      if (nums.length === 0) return { bins: [], mean: 0, std: 0, maxCount: 0 };

      // mean
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;

      // population std (use sample std if you prefer)
      const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
      const std = Math.sqrt(variance);

      // compute min/max and bin sizes
      const min = Math.min(...nums);
      const max = Math.max(...nums);

      // if all equal, create small range around value
      const range = max === min ? Math.max(1, Math.abs(min) || 1) : max - min;
      const binWidth = range / binCount;

      // init bins
      const bins = new Array(binCount).fill(0).map((_, i) => {
        const x0 = min + i * binWidth;
        const x1 = x0 + binWidth;
        return { x0, x1, center: (x0 + x1) / 2, count: 0 };
      });

      nums.forEach((v) => {
        let idx = Math.floor((v - min) / binWidth);
        if (idx < 0) idx = 0;
        if (idx >= binCount) idx = binCount - 1;
        bins[idx].count++;
      });
    
      const maxCount = Math.max(...bins.map((b) => b.count));
    
      return { bins, mean, std, maxCount };
    },

    gaussianPdf: (x: number, mean: number, std: number) => {
      if (std === 0) return x === mean ? 1 : 0;
      const coeff = 1 / (std * Math.sqrt(2 * Math.PI));
      const expo = Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
      return coeff * expo;
    }
};

const actions = {
  handleFileUpload: async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        let parsedData: any[];

        if (file.name.endsWith(".json")) {
          parsedData = helpers.parseJSON(content);
        } else {
          parsedData = await helpers.parseCSV(content);
        }

        setData(parsedData);
        const cols = helpers.extractColumns(parsedData);
        setColumns(cols);
        setSelectedXAxis(cols[0] || "");
        setSelectedYAxis(cols[1] || "");
        toast.success(`Loaded ${parsedData.length} rows`);
      } catch (error) {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  },

  handlePasteData: async () => {
    if (!rawInput.trim()) {
      toast.error("Please paste some data");
      return;
    }

    try {
      let parsedData: any[];

      // Try JSON first
      try {
        parsedData = helpers.parseJSON(rawInput);
      } catch {
        // If JSON fails, try CSV
        parsedData = await helpers.parseCSV(rawInput);
      }

      setData(parsedData);
      const cols = helpers.extractColumns(parsedData);
      setColumns(cols);
      setSelectedXAxis(cols[0] || "");
      setSelectedYAxis(cols[1] || "");
      toast.success(`Loaded ${parsedData.length} rows`);
    } catch (error) {
      toast.error("Failed to parse data");
    }
  },

  handleClear: () => {
    setData([]);
    setColumns([]);
    setSelectedXAxis("");
    setSelectedYAxis("");
    setRawInput("");
    toast.success("Cleared!");
  },
};

return {
  state: {
    data,
    columns,
    selectedXAxis,
    selectedYAxis,
    chartType,
    rawInput,
    fileInputRef,
  },
  setters: {
    setData,
    setColumns,
    setSelectedXAxis,
    setSelectedYAxis,
    setChartType,
    setRawInput,
  },
  helpers,
  actions,
};
};
