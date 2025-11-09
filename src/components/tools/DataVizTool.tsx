import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Trash2, Maximize2 } from "lucide-react";
import { DataVizStateHandler, ChartType } from "@/modules/state/DataVizStateHandler";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ComposedChart } from "recharts";
import { useState } from "react";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export const DataVizTool = () => {
  const { state, setters, helpers, actions } = DataVizStateHandler();
  const [isExpanded, setIsExpanded] = useState(false);

  const renderChart = (height = 400) => {
    // For distribution and clustering, only need X-axis
    if (state.chartType === "distribution" || state.chartType === "clustering") {
      if (!state.data.length || !state.selectedXAxis) {
        return (
          <div className={`h-[${height}px] flex items-center justify-center text-muted-foreground`}>
            Load data and select X-axis to visualize {state.chartType}
          </div>
        );
      }
    } else {
      if (!state.data.length || !state.selectedXAxis || !state.selectedYAxis) {
        return (
          <div className={`h-[${height}px] flex items-center justify-center text-muted-foreground`}>
            Load data and select axes to visualize
          </div>
        );
      }
    }

    // Filter out null/undefined values and group by uniqueness for bar/line/area
    const chartData = state.chartType === "distribution" || state.chartType === "clustering" ? [] : (() => {
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

      // Sort if X-axis is numeric
      const isXNumeric = helpers.isNumericColumn(state.data, state.selectedXAxis);
      if (isXNumeric) {
        grouped.sort((a, b) => parseFloat(a.name) - parseFloat(b.name));
      }

      return grouped;
    })();

    switch (state.chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
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
          <ResponsiveContainer width="100%" height={height}>
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
        const showLegend = chartData.length <= 10;
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height * 0.35, 150)}
                label={chartData.length <= 20}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
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
          let numericValues = state.data
            .map((row) => {
              const val = parseFloat(row[state.selectedXAxis]);
              return Number.isFinite(val) ? val : NaN;
            })
            .filter((v) => !isNaN(v));

          // Store original values for statistics
          const originalValues = [...numericValues];

          // Apply log transformation if enabled
          let logTransformedValues = numericValues;
          if (state.useLogScale && numericValues.length > 0) {
            logTransformedValues = numericValues
              .filter((v) => v > 0) // Log only works on positive values
              .map((v) => Math.log(v));
          }

          if (logTransformedValues.length === 0) {
            return (
              <div className={`h-[${height}px] flex items-center justify-center text-muted-foreground`}>
                No valid numeric data to display
                {state.useLogScale && " (log scale requires positive values)"}
              </div>
            );
          }

          // Compute statistics on ORIGINAL data (before log transformation)
          const originalMean = originalValues.reduce((a, b) => a + b, 0) / originalValues.length;
          const originalVariance = originalValues.reduce((a, b) => a + Math.pow(b - originalMean, 2), 0) / originalValues.length;
          const originalStd = Math.sqrt(originalVariance);

          const BIN_COUNT = 25;
          const { bins, mean: logMean, std: logStd, maxCount } = helpers.computeHistogram(logTransformedValues, BIN_COUNT);

          const pdfAtMean = helpers.gaussianPdf(logMean, logMean, logStd) || 1;
          const gaussianScale = maxCount / pdfAtMean;

          const distData = bins.map((b) => {
            const pdfVal = helpers.gaussianPdf(b.center, logMean, logStd);
            return {
              name: state.useLogScale 
                ? `${Math.exp(b.x0).toFixed(1)}-${Math.exp(b.x1).toFixed(1)}`
                : `${b.x0.toFixed(2)}-${b.x1.toFixed(2)}`,
              center: b.center,
              count: b.count,
              gaussian: pdfVal * gaussianScale,
            };
          });
        
        return (
          <div className="space-y-3">
            {state.useLogScale && (
              <div className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
                <p><strong>Log Scale Applied:</strong> Data transformed using natural logarithm</p>
                <p className="text-xs mt-1">Useful for right-skewed distributions</p>
              </div>
            )}
            <div className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
              <p><strong>Statistics (Original Data):</strong> Mean = {originalMean.toFixed(2)}, Std Dev = {originalStd.toFixed(2)}</p>
            </div>
            <ResponsiveContainer width="100%" height={height - (state.useLogScale ? 160 : 80)}>
              <ComposedChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  interval={Math.floor(BIN_COUNT / 10)} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 9 }} 
                />
                <YAxis />

                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "gaussian") return [Number(value).toFixed(2), "Gaussian(scaled)"];
                    return [value, "Count"];
                  }}
                />
                <Legend />

                <Bar dataKey="count" fill="#8b5cf6" barSize={10} />
                <Line
                  type="monotone"
                  dataKey="gaussian"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

      case "clustering":
        {
          // Get all values (numeric or categorical)
          const values = state.data.map((row) => row[state.selectedXAxis]);

          const { clusters, silhouette } = helpers.computeClustering(
            values, 
            state.clusterBins, 
            state.selectedXAxis,
            state.data
          );

          const clusterData = clusters.map((c) => ({
            name: c.label,
            count: c.count,
            center: c.center,
            description: c.description,
          }));

          return (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
                <p><strong>Clustering Quality Score:</strong> {(silhouette * 100).toFixed(2)}%</p>
                <p className="text-xs mt-1">Higher score = better separation between clusters</p>
              </div>
              <div className="text-sm bg-card/50 p-4 rounded-lg border border-border">
                <p className="font-semibold mb-2">Cluster Descriptions:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {clusters.map((cluster, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-xs">
                        <strong>{cluster.description}</strong>: {cluster.range} 
                        <span className="text-muted-foreground ml-1">({cluster.count} items)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={height - 180}>
                <BarChart data={clusterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6">
                    {clusterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }
      
      default:
        return null;
    }
  };

  const ChartWrapper = ({ children, showExpand = true }: { children: React.ReactNode, showExpand?: boolean }) => (
    <div className="relative">
      {showExpand && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2 z-10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full">
            <DialogHeader>
              <DialogTitle>Expanded Chart View</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {renderChart(600)}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {children}
    </div>
  );

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
              <SelectItem value="clustering">Clustering</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {state.columns.length > 0 && (
          <>
            <div className="min-w-[150px]">
              <Label>{(state.chartType === "distribution" || state.chartType === "clustering") ? "Column" : "X-Axis"}</Label>
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

            {state.chartType === "clustering" && (
              <div className="min-w-[120px]">
                <Label>Bins</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={state.clusterBins}
                  onChange={(e) => setters.setClusterBins(parseInt(e.target.value) || 5)}
                  className="mt-1"
                />
              </div>
            )}

            {state.chartType === "distribution" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="log-scale"
                  checked={state.useLogScale}
                  onCheckedChange={(checked) => setters.setUseLogScale(checked as boolean)}
                />
                <Label htmlFor="log-scale" className="cursor-pointer text-sm">
                  Log Scale (for skewed data)
                </Label>
              </div>
            )}

            {state.chartType !== "distribution" && state.chartType !== "clustering" && (
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
          <ChartWrapper>
            <div className="p-6 bg-card/50 rounded-lg border border-border overflow-hidden">
              {renderChart()}
            </div>
          </ChartWrapper>
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
