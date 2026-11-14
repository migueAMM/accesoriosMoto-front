export interface ProductoResponse {
  id: string;
  tipo: string;
  marca: string;
  color: string;
  precioMonto: number;
  precioMoneda: string;
  estadoPublicacion: 'PUBLICADO' | 'BORRADOR' | string;
  imagenUrl?: string;
}

export interface ProductoVentasResponse {
  id: string;
  tipo: string;
  marca: string;
  ventas: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type TipoCompatibilidad = 'MOTO' | 'CASCO';

export interface FiltroProducto {
  marca?: string;
  color?: string;
  precioMinimo?: number;
  precioMaximo?: number;
  moneda?: string;
  tipoCompatibilidad?: TipoCompatibilidad;
  modeloCompatibilidad?: string;
  pagina?: number;
  tamano?: number;
}

export interface BusquedaProductoParams {
  texto?: string;
  precioMinimo?: number;
  precioMaximo?: number;
  moneda?: string;
  ordenarPor?: string;
  direccion?: 'asc' | 'desc';
  pagina?: number;
  tamano?: number;
}
