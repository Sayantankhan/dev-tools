import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2 } from "lucide-react";
import { DataVizStateHandler, ChartType } from "@/modules/state/DataVizStateHandler";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export const DataVizTool = () => {
  const { state, setters, helpers, actions } = DataVizStateHandler();

  const renderChart = () => {
    // For distribution, only need X-axis
    if (state.chartType === "distribution") {
      if (!state.data.length || !state.selectedXAxis) {
        return (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Load data and select X-axis to visualize distribution
          </div>
        );
      }
    } else {
      if (!state.data.length || !state.selectedXAxis || !state.selectedYAxis) {
        return (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Load data and select axes to visualize
          </div>
        );
      }
    }

    // Filter out null/undefined values and group by uniqueness for bar/line/area
    const chartData = state.chartType === "distribution" ? [] : (() => {
      const filtered = state.data
        .filter((row) => row[state.selectedXAxis] != null && row[state.selectedYAxis] != null)
        .map((row) => ({
          name: String(row[state.selectedXAxis]),
          value: parseFloat(row[state.selectedYAxis]) || 0,
        }));

      // Group by name and sum values
      const grouped = filtered.reduce((acc, item) => {
        const existing = acc.find((a) => a.name === item.name);
        if (existing) {
          existing.value += item.value;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, [] as Array<{ name: string; value: number }>);

      return grouped;
    })();

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
      
      case "distribution":
        { 
          const numericValues = state.data.map((row) => {
            const val = parseFloat(row[state.selectedXAxis]);
            return Number.isFinite(val) ? val : NaN;
          });

          const BIN_COUNT = 25;
          const { bins, mean, std, maxCount } = helpers.computeHistogram(numericValues, BIN_COUNT);

          const pdfAtMean = helpers.gaussianPdf(mean, mean, std) || 1;
          const gaussianScale = maxCount / pdfAtMean;

          const distData = bins.map((b) => {
            const pdfVal = helpers.gaussianPdf(b.center, mean, std);
            return {
              name: `${(b.x0).toFixed(2)} - ${(b.x1).toFixed(2)}`,
              center: b.center,
              count: b.count,
              gaussian: pdfVal * gaussianScale,
            };
          });
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} />
              <YAxis />

              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === "gaussian") return [Number(value).toFixed(2), "Gaussian(scaled)"];
                  return [value, "Count"];
                }}
              />
              <Legend />

              <Bar dataKey="count" fill="#8b5cf6" barSize={12} />
              <Line
                type="monotone"
                dataKey="gaussian"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                yAxisId={0}
              />
              </BarChart>
          </ResponsiveContainer>
        )}
      
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
              <SelectItem value="distribution">Std Distribution</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {state.columns.length > 0 && (
          <>
            <div className="min-w-[150px]">
              <Label>{state.chartType === "distribution" ? "Column (Numeric)" : "X-Axis"}</Label>
              <Select value={state.selectedXAxis} onValueChange={setters.setSelectedXAxis}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.chartType === "distribution"
                    ? state.columns
                        .filter((col) => helpers.isNumericColumn(state.data, col))
                        .map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))
                    : state.columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            {state.chartType !== "distribution" && (
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
            )}
          </>
        )}

        <input
          ref={state.fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={actions.handleFileUpload}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => state.fileInputRef.current?.click()} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          {state.fileName && (
            <span className="text-sm text-muted-foreground">📎 {state.fileName}</span>
          )}
        </div>

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
