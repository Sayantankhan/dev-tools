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

          // Apply transformation on original data
          const transformedValues = helpers.applyTransformation(numericValues, state.transformationType);

          if (transformedValues.length === 0) {
            const transformationLabel = helpers.getTransformationLabel(state.transformationType);
            let errorMsg = "No valid numeric data to display";
            if (state.transformationType === "log" || state.transformationType === "boxcox") {
              errorMsg += " (transformation requires positive values)";
            } else if (state.transformationType === "sqrt") {
              errorMsg += " (transformation requires non-negative values)";
            }
            return (
              <div className={`h-[${height}px] flex items-center justify-center text-muted-foreground`}>
                {errorMsg}
              </div>
            );
          }

          // Compute statistics on ORIGINAL data (before transformation)
          const originalMean = originalValues.reduce((a, b) => a + b, 0) / originalValues.length;
          const originalVariance = originalValues.reduce((a, b) => a + Math.pow(b - originalMean, 2), 0) / originalValues.length;
          const originalStd = Math.sqrt(originalVariance);
          
          // Calculate skewness: (1/n) * Σ((x - mean) / std)^3
          const skewness = originalValues.reduce((a, b) => a + Math.pow((b - originalMean) / originalStd, 3), 0) / originalValues.length;
          const skewnessLabel = skewness > 0.5 ? " (Right-skewed)" : skewness < -0.5 ? " (Left-skewed)" : " (Symmetric)";

          const { bins, mean: transformedMean, std: transformedStd, maxCount } = helpers.computeHistogram(transformedValues, state.distributionBins);

          const pdfAtMean = helpers.gaussianPdf(transformedMean, transformedMean, transformedStd) || 1;
          const gaussianScale = maxCount / pdfAtMean;

          const distData = bins.map((b) => {
            const pdfVal = helpers.gaussianPdf(b.center, transformedMean, transformedStd);
            
            // Convert bin ranges back to original scale for display
            let binLabel = `${b.x0.toFixed(2)}-${b.x1.toFixed(2)}`;
            if (state.transformationType === "log") {
              binLabel = `${Math.exp(b.x0).toFixed(1)}-${Math.exp(b.x1).toFixed(1)}`;
            } else if (state.transformationType === "sqrt") {
              binLabel = `${Math.pow(b.x0, 2).toFixed(1)}-${Math.pow(b.x1, 2).toFixed(1)}`;
            } else if (state.transformationType === "boxcox") {
              const lambda = 0.5;
              const x0_orig = Math.pow(lambda * b.x0 + 1, 1/lambda);
              const x1_orig = Math.pow(lambda * b.x1 + 1, 1/lambda);
              binLabel = `${x0_orig.toFixed(1)}-${x1_orig.toFixed(1)}`;
            } else if (state.transformationType === "yeojohnson") {
              const lambda = 0.5;
              const x0_orig = b.x0 >= 0 ? Math.pow(lambda * b.x0 + 1, 1/lambda) - 1 : -Math.pow((2-lambda)*(-b.x0) + 1, 1/(2-lambda)) + 1;
              const x1_orig = b.x1 >= 0 ? Math.pow(lambda * b.x1 + 1, 1/lambda) - 1 : -Math.pow((2-lambda)*(-b.x1) + 1, 1/(2-lambda)) + 1;
              binLabel = `${x0_orig.toFixed(1)}-${x1_orig.toFixed(1)}`;
            }
            
            return {
              name: binLabel,
              center: b.center,
              count: b.count,
              gaussian: pdfVal * gaussianScale,
            };
          });
        
        return (
          <div className="space-y-3">
            {state.transformationType !== "none" && (
              <div className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
                <p><strong>{helpers.getTransformationLabel(state.transformationType)} Transformation Applied</strong></p>
                <p className="text-xs mt-1">
                  {state.transformationType === "log" && "Useful for right-skewed distributions"}
                  {state.transformationType === "sqrt" && "Moderate transformation for skewed data"}
                  {state.transformationType === "boxcox" && "Power transformation to normalize data (requires positive values)"}
                  {state.transformationType === "yeojohnson" && "Power transformation that works with negative values"}
                </p>
              </div>
            )}
            <div className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
              <p><strong>Statistics (Original Data):</strong> Mean = {originalMean.toFixed(2)}, Std Dev = {originalStd.toFixed(2)}{skewnessLabel}</p>
            </div>
            <ResponsiveContainer width="100%" height={height - (state.transformationType !== "none" ? 160 : 80)}>
              <ComposedChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  interval={Math.floor(state.distributionBins / 10)} 
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

  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
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
              <>
                <div className="min-w-[120px]">
                  <Label>Bins</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={state.distributionBins}
                    onChange={(e) => setters.setDistributionBins(parseInt(e.target.value) || 25)}
                    className="mt-1"
                  />
                </div>
                <div className="min-w-[150px]">
                  <Label>Transformation</Label>
                  <Select value={state.transformationType} onValueChange={(v: any) => setters.setTransformationType(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="log">Log</SelectItem>
                      <SelectItem value="sqrt">Square Root</SelectItem>
                      <SelectItem value="boxcox">Box-Cox (λ=0.5)</SelectItem>
                      <SelectItem value="yeojohnson">Yeo-Johnson (λ=0.5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
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

        {state.data.length > 0 && (
          <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Maximize2 className="w-4 h-4 mr-2" />
                Expand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-6">
              <DialogHeader className="mb-4">
                <DialogTitle>Expanded Chart View</DialogTitle>
              </DialogHeader>
              
              {/* Controls in expanded view */}
              <div className="flex flex-wrap gap-3 items-end mb-4 pb-4 border-b border-border">
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
                  <>
                    <div className="min-w-[120px]">
                      <Label>Bins</Label>
                      <Input
                        type="number"
                        min={5}
                        max={50}
                        value={state.distributionBins}
                        onChange={(e) => setters.setDistributionBins(parseInt(e.target.value) || 25)}
                        className="mt-1"
                      />
                    </div>
                    <div className="min-w-[150px]">
                      <Label>Transformation</Label>
                      <Select value={state.transformationType} onValueChange={(v: any) => setters.setTransformationType(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="log">Log</SelectItem>
                          <SelectItem value="sqrt">Square Root</SelectItem>
                          <SelectItem value="boxcox">Box-Cox (λ=0.5)</SelectItem>
                          <SelectItem value="yeojohnson">Yeo-Johnson (λ=0.5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
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
              </div>

              <div className="flex-1 overflow-auto pr-2">
                {renderChart(window.innerHeight * 0.65)}
              </div>
            </DialogContent>
          </Dialog>
        )}
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
