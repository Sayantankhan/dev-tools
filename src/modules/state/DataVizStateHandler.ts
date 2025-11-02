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
