import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import Supercluster from 'supercluster';
import { toast } from 'sonner';

export interface MapDataPoint {
  latitude: number;
  longitude: number;
  value: number;
  label?: string;
  category?: string;
  originalIndex: number;
  valid: boolean;
  error?: string;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export type VisualMode = 'heatmap' | 'clustered' | 'raw';

export function MapPlotStateHandler() {
  const [data, setData] = useState<MapDataPoint[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<VisualMode>('clustered');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [heatRadius, setHeatRadius] = useState(25);
  const [heatIntensity, setHeatIntensity] = useState(1);
  const [clusterRadius, setClusterRadius] = useState(40);
  const [pointSize, setPointSize] = useState(8);
  const [opacity, setOpacity] = useState(0.8);
  const [colorRamp, setColorRamp] = useState<'viridis' | 'plasma' | 'inferno' | 'magma'>('viridis');
  const [latField, setLatField] = useState<string>('latitude');
  const [lonField, setLonField] = useState<string>('longitude');
  const [valueField, setValueField] = useState<string>('value');
  const [labelField, setLabelField] = useState<string>('label');
  const [categoryField, setCategoryField] = useState<string>('category');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const helpers = {
    detectLatLonFields: (fields: string[]): { lat: string | null; lon: string | null } => {
      const latVariants = ['latitude', 'lat', 'y'];
      const lonVariants = ['longitude', 'lon', 'lng', 'long', 'x'];

      const lat = fields.find(f => latVariants.includes(f.toLowerCase())) || null;
      const lon = fields.find(f => lonVariants.includes(f.toLowerCase())) || null;

      return { lat, lon };
    },

    validateCoordinate: (lat: number, lon: number): { valid: boolean; error?: string } => {
      if (isNaN(lat) || isNaN(lon)) {
        return { valid: false, error: 'Invalid number' };
      }
      if (lat < -90 || lat > 90) {
        return { valid: false, error: 'Latitude out of range [-90, 90]' };
      }
      if (lon < -180 || lon > 180) {
        return { valid: false, error: 'Longitude out of range [-180, 180]' };
      }
      return { valid: true };
    },

    parseCSV: async (csvString: string): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('CSV parse errors:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => reject(error),
        });
      });
    },

    parseJSON: (jsonString: string): any[] => {
      try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    },

    computeBounds: (points: MapDataPoint[]): MapBounds => {
      const validPoints = points.filter(p => p.valid);
      if (validPoints.length === 0) {
        return { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 };
      }

      return {
        minLat: Math.min(...validPoints.map(p => p.latitude)),
        maxLat: Math.max(...validPoints.map(p => p.latitude)),
        minLon: Math.min(...validPoints.map(p => p.longitude)),
        maxLon: Math.max(...validPoints.map(p => p.longitude)),
      };
    },

    createClusters: (points: MapDataPoint[], radius: number, zoom: number) => {
      const supercluster = new Supercluster({
        radius,
        maxZoom: 16,
      });

      const geoPoints = points
        .filter(p => p.valid)
        .map(p => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude],
          },
          properties: {
            ...p,
          },
        }));

      supercluster.load(geoPoints);
      return supercluster;
    },

    extractCategories: (points: MapDataPoint[]): string[] => {
      const cats = new Set<string>();
      points.forEach(p => {
        if (p.category) cats.add(p.category);
      });
      return Array.from(cats).sort();
    },

    getSampleData: (type: 'cities' | 'random'): string => {
      if (type === 'cities') {
        return `latitude,longitude,value,label,category
40.7128,-74.0060,10,New York City,city
51.5074,-0.1278,15,London,city
35.6762,139.6503,12,Tokyo,city
-33.8688,151.2093,8,Sydney,city
28.6139,77.2090,9,Delhi,city
48.8566,2.3522,11,Paris,city
-23.5505,-46.6333,7,São Paulo,city
55.7558,37.6173,13,Moscow,city
41.9028,12.4964,14,Rome,city
19.4326,-99.1332,10,Mexico City,city`;
      } else {
        const points: string[] = ['latitude,longitude,value,label'];
        for (let i = 0; i < 100; i++) {
          const lat = (Math.random() * 180 - 90).toFixed(4);
          const lon = (Math.random() * 360 - 180).toFixed(4);
          const value = Math.floor(Math.random() * 100);
          points.push(`${lat},${lon},${value},Point ${i + 1}`);
        }
        return points.join('\n');
      }
    },

    getColorRampColors: (ramp: string): string[] => {
      const ramps = {
        viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
        plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
        inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
        magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
      };
      return ramps[ramp as keyof typeof ramps] || ramps.viridis;
    },
  };

  const actions = {
    handleFileUpload: useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setFileName(file.name);

      try {
        const text = await file.text();
        const isJSON = file.name.endsWith('.json');

        let parsedData: any[];
        if (isJSON) {
          parsedData = helpers.parseJSON(text);
        } else {
          parsedData = await helpers.parseCSV(text);
        }

        if (parsedData.length === 0) {
          toast.error('No data found in file');
          setIsProcessing(false);
          return;
        }

        // Extract available fields
        const fields = Object.keys(parsedData[0]);
        setAvailableFields(fields);

        // Auto-detect lat/lon fields
        const detected = helpers.detectLatLonFields(fields);
        if (detected.lat) setLatField(detected.lat);
        if (detected.lon) setLonField(detected.lon);

        // If we couldn't auto-detect, show field mapping UI
        if (!detected.lat || !detected.lon) {
          setShowFieldMapping(true);
          setRawInput(text);
          toast.info('Please map latitude and longitude fields');
          setIsProcessing(false);
          return;
        }

        // Check for optional fields
        if (fields.includes('value')) setValueField('value');
        if (fields.includes('label')) setLabelField('label');
        if (fields.includes('category')) setCategoryField('category');

        await actions.processData(parsedData, detected.lat, detected.lon);
      } catch (error: any) {
        toast.error(`Error loading file: ${error.message}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }, []),

    handlePasteData: useCallback(async () => {
      if (!rawInput.trim()) {
        toast.error('Please paste some data first');
        return;
      }

      setIsProcessing(true);

      try {
        let parsedData: any[];
        const trimmed = rawInput.trim();

        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          parsedData = helpers.parseJSON(trimmed);
        } else {
          parsedData = await helpers.parseCSV(trimmed);
        }

        if (parsedData.length === 0) {
          toast.error('No data found');
          setIsProcessing(false);
          return;
        }

        const fields = Object.keys(parsedData[0]);
        setAvailableFields(fields);

        const detected = helpers.detectLatLonFields(fields);
        if (detected.lat) setLatField(detected.lat);
        if (detected.lon) setLonField(detected.lon);

        if (!detected.lat || !detected.lon) {
          setShowFieldMapping(true);
          toast.info('Please map latitude and longitude fields');
          setIsProcessing(false);
          return;
        }

        if (fields.includes('value')) setValueField('value');
        if (fields.includes('label')) setLabelField('label');
        if (fields.includes('category')) setCategoryField('category');

        await actions.processData(parsedData, detected.lat, detected.lon);
      } catch (error: any) {
        toast.error(`Error parsing data: ${error.message}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }, [rawInput]),

    processData: useCallback(async (parsedData: any[], latF: string, lonF: string) => {
      const mappedData: MapDataPoint[] = parsedData.map((row, index) => {
        const lat = parseFloat(row[latF]);
        const lon = parseFloat(row[lonF]);
        const validation = helpers.validateCoordinate(lat, lon);

        return {
          latitude: lat,
          longitude: lon,
          value: row[valueField] ? parseFloat(row[valueField]) : 1,
          label: row[labelField] || `Point ${index + 1}`,
          category: row[categoryField] || undefined,
          originalIndex: index,
          valid: validation.valid,
          error: validation.error,
        };
      });

      const validCount = mappedData.filter(p => p.valid).length;
      const invalidCount = mappedData.length - validCount;

      setData(mappedData);
      setBounds(helpers.computeBounds(mappedData));
      setCategories(helpers.extractCategories(mappedData));
      setShowFieldMapping(false);

      if (invalidCount > 0) {
        toast.warning(`${invalidCount} invalid points detected (out of ${mappedData.length})`);
      } else {
        toast.success(`Loaded ${validCount} points successfully`);
      }
    }, [valueField, labelField, categoryField]),

    applyFieldMapping: useCallback(async () => {
      if (!rawInput.trim()) return;

      setIsProcessing(true);

      try {
        let parsedData: any[];
        const trimmed = rawInput.trim();

        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          parsedData = helpers.parseJSON(trimmed);
        } else {
          parsedData = await helpers.parseCSV(trimmed);
        }

        await actions.processData(parsedData, latField, lonField);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, [rawInput, latField, lonField]),

    loadSampleData: useCallback(async (type: 'cities' | 'random') => {
      const sampleCSV = helpers.getSampleData(type);
      setRawInput(sampleCSV);
      setFileName(`sample-${type}.csv`);

      const parsedData = await helpers.parseCSV(sampleCSV);
      await actions.processData(parsedData, 'latitude', 'longitude');
    }, []),

    handleClear: useCallback(() => {
      setData([]);
      setRawInput('');
      setFileName(null);
      setBounds(null);
      setCategories([]);
      setSelectedCategory('all');
      setShowFieldMapping(false);
      setAvailableFields([]);
      toast.info('Data cleared');
    }, []),

    getFilteredData: useCallback((): MapDataPoint[] => {
      if (selectedCategory === 'all') {
        return data.filter(p => p.valid);
      }
      return data.filter(p => p.valid && p.category === selectedCategory);
    }, [data, selectedCategory]),

    exportData: useCallback((format: 'csv' | 'json') => {
      const filteredData = actions.getFilteredData();
      
      if (format === 'csv') {
        const csvData = Papa.unparse(filteredData.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          value: p.value,
          label: p.label,
          category: p.category,
        })));
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `map-data-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
      } else {
        const jsonData = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `map-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('JSON exported');
      }
    }, [data, selectedCategory]),
  };

  return {
    state: {
      data,
      rawInput,
      fileName,
      visualMode,
      selectedCategory,
      categories,
      bounds,
      heatRadius,
      heatIntensity,
      clusterRadius,
      pointSize,
      opacity,
      colorRamp,
      latField,
      lonField,
      valueField,
      labelField,
      categoryField,
      availableFields,
      showFieldMapping,
      isProcessing,
    },
    setters: {
      setRawInput,
      setVisualMode,
      setSelectedCategory,
      setHeatRadius,
      setHeatIntensity,
      setClusterRadius,
      setPointSize,
      setOpacity,
      setColorRamp,
      setLatField,
      setLonField,
      setValueField,
      setLabelField,
      setCategoryField,
    },
    helpers,
    actions,
  };
}
