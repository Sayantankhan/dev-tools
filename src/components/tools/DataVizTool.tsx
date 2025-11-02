import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2 } from "lucide-react";
import { DataVizStateHandler, ChartType } from "@/modules/state/DataVizStateHandler";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export const DataVizTool = () => {
  const { state, setters, actions } = DataVizStateHandler();

  const renderChart = () => {
    if (!state.data.length || !state.selectedXAxis || !state.selectedYAxis) {
      return (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          Load data and select axes to visualize
        </div>
      );
    }

    const chartData = state.data.map((row) => ({
      name: String(row[state.selectedXAxis]),
      value: parseFloat(row[state.selectedYAxis]) || 0,
    }));

    switch (state.chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[120px]">
          <Label>Chart Type</Label>
          <Select value={state.chartType} onValueChange={(v: ChartType) => setters.setChartType(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {state.columns.length > 0 && (
          <>
            <div className="min-w-[150px]">
              <Label>X-Axis</Label>
              <Select value={state.selectedXAxis} onValueChange={setters.setSelectedXAxis}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Y-Axis</Label>
              <Select value={state.selectedYAxis} onValueChange={setters.setSelectedYAxis}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <input
          ref={state.fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={actions.handleFileUpload}
          className="hidden"
        />
        <Button onClick={() => state.fileInputRef.current?.click()} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload File
        </Button>

        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Data Input */}
      {state.data.length === 0 && (
        <div className="space-y-3">
          <Label>Paste CSV or JSON Data</Label>
          <Textarea
            value={state.rawInput}
            onChange={(e) => setters.setRawInput(e.target.value)}
            placeholder="Paste CSV or JSON data here..."
            className="code-editor min-h-[150px]"
          />
          <Button onClick={actions.handlePasteData} className="btn-gradient">
            Load Data
          </Button>
        </div>
      )}

      {/* Chart Display */}
      {state.data.length > 0 && (
        <div className="space-y-3">
          <Label>Visualization</Label>
          <div className="p-6 bg-card/50 rounded-lg border border-border">
            {renderChart()}
          </div>
        </div>
      )}

      {/* Data Info */}
      {state.data.length > 0 && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>
            Loaded {state.data.length} rows with {state.columns.length} columns: {state.columns.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};
