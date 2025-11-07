import { useEffect, useRef, useState } from 'react';
import { MapPlotStateHandler } from '@/modules/state/MapPlotStateHandler';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Download, Upload, Trash2, Map as MapIcon, Layers } from 'lucide-react';
import { toPng } from 'html-to-image';

export function MapPlotTool() {
  const handler = MapPlotStateHandler();
  const { state, setters, actions, helpers } = handler;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'map' | 'controls'>('data');

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [0, 20],
      zoom: 1.5,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
}, []);

// Ensure map resizes when tab becomes visible or container size changes
useEffect(() => {
  if (!map.current) return;
  if (activeTab === 'map') {
    // Delay to let panel render
    setTimeout(() => map.current?.resize(), 50);
  }
}, [activeTab]);

useEffect(() => {
  if (!map.current || !mapContainer.current) return;
  const ro = new ResizeObserver(() => {
    map.current?.resize();
  });
  ro.observe(mapContainer.current);
  return () => ro.disconnect();
}, []);

  // Update map when data changes
  useEffect(() => {
    if (!map.current || state.data.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const filteredData = actions.getFilteredData();

    if (filteredData.length === 0) return;

    // Fit bounds
    if (state.bounds) {
      map.current.fitBounds(
        [
          [state.bounds.minLon, state.bounds.minLat],
          [state.bounds.maxLon, state.bounds.maxLat],
        ],
        { padding: 50 }
      );
    }

    // Render based on visual mode
    if (state.visualMode === 'raw' || state.visualMode === 'heatmap') {
      filteredData.forEach(point => {
        const el = document.createElement('div');
        el.className = 'map-marker';
        el.style.width = `${state.pointSize}px`;
        el.style.height = `${state.pointSize}px`;
        el.style.backgroundColor = helpers.getColorRampColors(state.colorRamp)[3];
        el.style.borderRadius = '50%';
        el.style.opacity = state.opacity.toString();
        el.style.border = '2px solid white';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(
            new maplibregl.Popup().setHTML(`
              <strong>${point.label}</strong><br/>
              Lat: ${point.latitude.toFixed(4)}<br/>
              Lon: ${point.longitude.toFixed(4)}<br/>
              Value: ${point.value}<br/>
              ${point.category ? `Category: ${point.category}` : ''}
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    } else if (state.visualMode === 'clustered') {
      // Simple clustering visualization
      filteredData.forEach(point => {
        const el = document.createElement('div');
        el.className = 'map-marker';
        el.style.width = `${state.pointSize}px`;
        el.style.height = `${state.pointSize}px`;
        el.style.backgroundColor = helpers.getColorRampColors(state.colorRamp)[4];
        el.style.borderRadius = '50%';
        el.style.opacity = state.opacity.toString();
        el.style.border = '2px solid white';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(
            new maplibregl.Popup().setHTML(`
              <strong>${point.label}</strong><br/>
              Lat: ${point.latitude.toFixed(4)}<br/>
              Lon: ${point.longitude.toFixed(4)}<br/>
              Value: ${point.value}
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [state.data, state.visualMode, state.selectedCategory, state.pointSize, state.opacity]);

  const handleExportPNG = async () => {
    if (!mapContainer.current) return;
    try {
      const dataUrl = await toPng(mapContainer.current);
      const link = document.createElement('a');
      link.download = `map-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 min-h-[70vh]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapIcon className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Map Plot</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.loadSampleData('cities')}>
            Sample Cities
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.loadSampleData('random')}>
            Sample Random
          </Button>
          <Button variant="outline" size="sm" onClick={actions.handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="data">Data Input</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <Label>Upload CSV/JSON</Label>
              <Input
                type="file"
                accept=".csv,.json"
                onChange={actions.handleFileUpload}
                className="mt-2"
              />
              {state.fileName && (
                <p className="text-sm text-muted-foreground mt-2">Loaded: {state.fileName}</p>
              )}
            </Card>

            <Card className="p-4">
              <Label>Paste Data</Label>
              <Textarea
                value={state.rawInput}
                onChange={(e) => setters.setRawInput(e.target.value)}
                placeholder="Paste CSV or JSON data..."
                className="mt-2 h-20"
              />
              <Button onClick={actions.handlePasteData} className="mt-2" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Load Data
              </Button>
            </Card>
          </div>

          {state.showFieldMapping && (
            <Card className="p-4">
              <Alert>
                <AlertDescription>
                  Please map the latitude and longitude fields from your data.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Latitude Field</Label>
                  <Select value={state.latField} onValueChange={setters.setLatField}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.availableFields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Longitude Field</Label>
                  <Select value={state.lonField} onValueChange={setters.setLonField}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.availableFields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={actions.applyFieldMapping} className="mt-4">
                Apply Mapping
              </Button>
            </Card>
          )}

          {state.data.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Data Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Points:</span>
                  <span className="ml-2 font-medium">{state.data.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valid:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {state.data.filter(p => p.valid).length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Invalid:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {state.data.filter(p => !p.valid).length}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="map" className="flex-1 flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <Button
              variant={state.visualMode === 'raw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setters.setVisualMode('raw')}
            >
              Raw Points
            </Button>
            <Button
              variant={state.visualMode === 'clustered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setters.setVisualMode('clustered')}
            >
              Clustered
            </Button>
            <Button
              variant={state.visualMode === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setters.setVisualMode('heatmap')}
            >
              Heatmap
            </Button>

            {state.categories.length > 0 && (
              <Select value={state.selectedCategory} onValueChange={setters.setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {state.categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportPNG}>
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button size="sm" variant="outline" onClick={() => actions.exportData('csv')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => actions.exportData('json')}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          <div ref={mapContainer} className="rounded-lg border h-[70vh] min-h-[400px]" />
        </TabsContent>

        <TabsContent value="controls" className="flex-1 overflow-auto">
          <div className="grid gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Visual Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Point Size: {state.pointSize}px</Label>
                  <Slider
                    value={[state.pointSize]}
                    onValueChange={([v]) => setters.setPointSize(v)}
                    min={4}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Opacity: {state.opacity.toFixed(2)}</Label>
                  <Slider
                    value={[state.opacity]}
                    onValueChange={([v]) => setters.setOpacity(v)}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Color Ramp</Label>
                  <Select value={state.colorRamp} onValueChange={(v: any) => setters.setColorRamp(v)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viridis">Viridis</SelectItem>
                      <SelectItem value="plasma">Plasma</SelectItem>
                      <SelectItem value="inferno">Inferno</SelectItem>
                      <SelectItem value="magma">Magma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {state.visualMode === 'heatmap' && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Heatmap Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Heat Radius: {state.heatRadius}px</Label>
                    <Slider
                      value={[state.heatRadius]}
                      onValueChange={([v]) => setters.setHeatRadius(v)}
                      min={10}
                      max={50}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Intensity: {state.heatIntensity.toFixed(1)}</Label>
                    <Slider
                      value={[state.heatIntensity]}
                      onValueChange={([v]) => setters.setHeatIntensity(v)}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            )}

            {state.visualMode === 'clustered' && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Cluster Settings</h3>
                <div>
                  <Label>Cluster Radius: {state.clusterRadius}px</Label>
                  <Slider
                    value={[state.clusterRadius]}
                    onValueChange={([v]) => setters.setClusterRadius(v)}
                    min={20}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
