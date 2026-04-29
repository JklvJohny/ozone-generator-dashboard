export interface SensorData {
  ozone_ppm: number;
  ozone_adc?: number;     // Raw ADC 0-4095 (diagnostic)
  ozone_ratio?: number;   // Rs/R0 ratio   (diagnostic)
  voltage: number;
  current: number;
  active_modules: number;
  electrode_a: boolean;
  electrode_b: boolean;
  electrode_c: boolean;
  electrode_level: number;
  sensor_status: string;
  mode?: "local" | "remote";
  timestamp: string;
}
