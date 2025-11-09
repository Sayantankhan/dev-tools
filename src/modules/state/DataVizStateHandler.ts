import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import Papa from "papaparse";

export type ChartType = "line" | "bar" | "pie" | "area" | "distribution" | "clustering";

export const DataVizStateHandler = (): ToolHandler => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedXAxis, setSelectedXAxis] = useState("");
  const [selectedYAxis, setSelectedYAxis] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [rawInput, setRawInput] = useState("");
  const [fileName, setFileName] = useState<string>("");
  const [clusterBins, setClusterBins] = useState(5);
  const [distributionBins, setDistributionBins] = useState(25);
  const [transformationType, setTransformationType] = useState<"none" | "log" | "sqrt" | "boxcox" | "yeojohnson">("none");
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

    sortDataByAxis: (data: any[], xCol: string, yCol: string, isNumeric: boolean) => {
      if (!isNumeric) return data;
      return [...data].sort((a, b) => {
        const aVal = parseFloat(a[xCol]);
        const bVal = parseFloat(b[xCol]);
        return aVal - bVal;
      });
    },

    computeClustering: (values: any[], binCount: number, columnName: string = "", data: any[] = []) => {
      // Check if data is numeric or categorical
      const isNumeric = helpers.isNumericColumn(data, columnName);
      
      if (!isNumeric) {
        // Handle categorical data
        const categoricalValues = values.filter(v => v != null && v !== "");
        if (categoricalValues.length === 0) return { clusters: [], silhouette: 0 };
        
        // Count occurrences of each unique value
        const valueCounts = new Map<string, number>();
        categoricalValues.forEach(v => {
          const key = String(v);
          valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
        });
        
        // Convert to clusters format
        const clusters = Array.from(valueCounts.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .map(([value, count]) => ({
            label: value,
            description: value,
            range: value,
            center: 0,
            count: count,
            items: []
          }));
        
        // Simple quality score based on distribution evenness
        const totalCount = categoricalValues.length;
        const expectedCount = totalCount / clusters.length;
        const variance = clusters.reduce((sum, c) => 
          sum + Math.pow(c.count - expectedCount, 2), 0
        ) / clusters.length;
        const silhouette = 1 - (Math.sqrt(variance) / totalCount);
        
        return { clusters, silhouette: Math.max(0, silhouette) };
      }
      
      // Handle numeric data (existing logic)
      const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
      if (nums.length === 0) return { clusters: [], silhouette: 0 };

      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const range = max === min ? 1 : max - min;
      const binWidth = range / binCount;

      // Generate contextual labels based on column name and data
      const getClusterDescription = (index: number, total: number, x0: number, x1: number): string => {
        const colLower = columnName.toLowerCase();
        const center = (x0 + x1) / 2;
        
        // Binary/Boolean columns (0 or 1)
        if (min === 0 && max === 1 && total === 2) {
          if (colLower.includes('survived') || colLower.includes('survival')) {
            return center < 0.5 ? "Did not survive" : "Survived";
          }
          return center < 0.5 ? "No" : "Yes";
        }
        
        // Categorical detection - check if data has distinct categorical values
        if (data.length > 0 && columnName) {
          const uniqueValues = [...new Set(data.map(row => row[columnName]))].filter(v => v != null);
          if (uniqueValues.length <= 10 && uniqueValues.length === total) {
            // Return actual categorical values
            const sortedValues = uniqueValues.sort();
            return String(sortedValues[index] || `Category ${index + 1}`);
          }
        }
        
        // Monetary columns
        if (colLower.includes('price') || colLower.includes('fare') || colLower.includes('cost') || colLower.includes('amount')) {
          return `$${x0.toFixed(0)}-$${x1.toFixed(0)}`;
        }
        
        // Age columns
        if (colLower.includes('age')) {
          if (total === 2) return center < (max - min) / 2 + min ? "Young" : "Old";
          if (total === 3) return ["Young", "Middle-aged", "Senior"][index];
          if (total === 4) return ["Child", "Young Adult", "Middle-aged", "Senior"][index];
          return `Age ${x0.toFixed(0)}-${x1.toFixed(0)}`;
        }
        
        // Score/Rating columns
        if (colLower.includes('score') || colLower.includes('rating')) {
          if (total === 2) return center < (max - min) / 2 + min ? "Low Score" : "High Score";
          if (total === 3) return ["Low", "Medium", "High"][index];
          return `Score ${x0.toFixed(1)}-${x1.toFixed(1)}`;
        }
        
        // Generic numeric ranges with context
        if (total === 2) return index === 0 ? "Lower Range" : "Upper Range";
        if (total === 3) return ["Low", "Medium", "High"][index];
        if (total === 4) return ["Very Low", "Low", "High", "Very High"][index];
        if (total === 5) return ["Very Low", "Low", "Medium", "High", "Very High"][index];
        
        // For more than 5, use percentile
        const percentile = Math.round((index / (total - 1)) * 100);
        return `P${percentile} (${x0.toFixed(1)}-${x1.toFixed(1)})`;
      };

      const clusters = new Array(binCount).fill(0).map((_, i) => {
        const x0 = min + i * binWidth;
        const x1 = x0 + binWidth;
        const description = getClusterDescription(i, binCount, x0, x1);
        return { 
          label: `${description}`,
          description,
          range: `${x0.toFixed(1)}-${x1.toFixed(1)}`,
          center: (x0 + x1) / 2,
          count: 0,
          items: [] as number[]
        };
      });

      nums.forEach((v) => {
        let idx = Math.floor((v - min) / binWidth);
        if (idx < 0) idx = 0;
        if (idx >= binCount) idx = binCount - 1;
        clusters[idx].count++;
        clusters[idx].items.push(v);
      });

      // Simple silhouette-like score: variance within vs between clusters
      const totalMean = nums.reduce((a, b) => a + b, 0) / nums.length;
      let withinVariance = 0;
      let betweenVariance = 0;

      clusters.forEach((cluster) => {
        if (cluster.items.length === 0) return;
        const clusterMean = cluster.items.reduce((a, b) => a + b, 0) / cluster.items.length;
        cluster.items.forEach((v) => {
          withinVariance += Math.pow(v - clusterMean, 2);
        });
        betweenVariance += cluster.items.length * Math.pow(clusterMean - totalMean, 2);
      });

      const silhouette = betweenVariance / (withinVariance + betweenVariance + 1);

      return { clusters, silhouette };
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
    },

    applyTransformation: (values: number[], transformType: "none" | "log" | "sqrt" | "boxcox" | "yeojohnson") => {
      if (transformType === "none") return values;
      
      switch (transformType) {
        case "log":
          return values.filter(v => v > 0).map(v => Math.log(v));
        
        case "sqrt":
          return values.filter(v => v >= 0).map(v => Math.sqrt(v));
        
        case "boxcox": {
          // Box-Cox transformation with lambda = 0.5 (sqrt-like)
          // Box-Cox requires positive values
          const positiveValues = values.filter(v => v > 0);
          const lambda = 0.5;
          return positiveValues.map(v => (Math.pow(v, lambda) - 1) / lambda);
        }
        
        case "yeojohnson": {
          // Yeo-Johnson transformation with lambda = 0.5
          // Works with negative values unlike Box-Cox
          const lambda = 0.5;
          return values.map(v => {
            if (v >= 0) {
              return (Math.pow(v + 1, lambda) - 1) / lambda;
            } else {
              return -(Math.pow(-v + 1, 2 - lambda) - 1) / (2 - lambda);
            }
          });
        }
        
        default:
          return values;
      }
    },

    getTransformationLabel: (transformType: "none" | "log" | "sqrt" | "boxcox" | "yeojohnson") => {
      switch (transformType) {
        case "log": return "Log";
        case "sqrt": return "Square Root";
        case "boxcox": return "Box-Cox (λ=0.5)";
        case "yeojohnson": return "Yeo-Johnson (λ=0.5)";
        default: return "";
      }
    }
};

const actions = {
  handleFileUpload: async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
    setFileName("");
    setClusterBins(5);
    setDistributionBins(25);
    setTransformationType("none");
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
    fileName,
    clusterBins,
    distributionBins,
    transformationType,
    fileInputRef,
  },
  setters: {
    setData,
    setColumns,
    setSelectedXAxis,
    setSelectedYAxis,
    setChartType,
    setRawInput,
    setFileName,
    setClusterBins,
    setDistributionBins,
    setTransformationType,
  },
  helpers,
  actions,
};
};
