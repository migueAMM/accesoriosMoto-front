import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProductoResponse,
  ProductoVentasResponse,
  PageResponse,
  FiltroProducto,
  BusquedaProductoParams,
} from '../modelos/catalogo';

@Injectable({
  providedIn: 'root',
})
export class CatalogoService {
  private readonly baseUrl = 'http://localhost:8080/api/productos';

  constructor(private http: HttpClient) {}

  listar(filtro: FiltroProducto = {}): Observable<PageResponse<ProductoResponse>> {
    let params = new HttpParams();

    if (filtro.marca) params = params.set('marca', filtro.marca);
    if (filtro.color) params = params.set('color', filtro.color);

    // Si se especifica precio mínimo o máximo, el backend en H2/Spring Boot exige obligatoriamente moneda
    if (filtro.precioMinimo !== undefined && filtro.precioMinimo !== null) {
      params = params.set('precioMinimo', filtro.precioMinimo.toString());
      params = params.set('moneda', filtro.moneda || 'COP');
    }
    if (filtro.precioMaximo !== undefined && filtro.precioMaximo !== null) {
      params = params.set('precioMaximo', filtro.precioMaximo.toString());
      params = params.set('moneda', filtro.moneda || 'COP');
    }

    if (filtro.tipoCompatibilidad)
      params = params.set('tipoCompatibilidad', filtro.tipoCompatibilidad);
    if (filtro.modeloCompatibilidad)
      params = params.set('modeloCompatibilidad', filtro.modeloCompatibilidad);
    if (filtro.pagina !== undefined && filtro.pagina !== null)
      params = params.set('pagina', filtro.pagina.toString());
    if (filtro.tamano !== undefined && filtro.tamano !== null)
      params = params.set('tamano', filtro.tamano.toString());

    return this.http.get<PageResponse<ProductoResponse>>(this.baseUrl, { params });
  }

  buscarPorTexto(paramsFiltro: BusquedaProductoParams = {}): Observable<PageResponse<ProductoResponse>> {
    let params = new HttpParams();

    if (paramsFiltro.texto) params = params.set('texto', paramsFiltro.texto);

    // El backend en H2/Spring Boot exige obligatoriamente moneda si se filtra por precio
    if (paramsFiltro.precioMinimo !== undefined && paramsFiltro.precioMinimo !== null) {
      params = params.set('precioMinimo', paramsFiltro.precioMinimo.toString());
      params = params.set('moneda', paramsFiltro.moneda || 'COP');
    }
    if (paramsFiltro.precioMaximo !== undefined && paramsFiltro.precioMaximo !== null) {
      params = params.set('precioMaximo', paramsFiltro.precioMaximo.toString());
      params = params.set('moneda', paramsFiltro.moneda || 'COP');
    }

    if (paramsFiltro.ordenarPor) params = params.set('ordenarPor', paramsFiltro.ordenarPor);
    if (paramsFiltro.direccion) params = params.set('direccion', paramsFiltro.direccion);
    if (paramsFiltro.pagina !== undefined && paramsFiltro.pagina !== null)
      params = params.set('pagina', paramsFiltro.pagina.toString());
    if (paramsFiltro.tamano !== undefined && paramsFiltro.tamano !== null)
      params = params.set('tamano', paramsFiltro.tamano.toString());

    return this.http.get<PageResponse<ProductoResponse>>(`${this.baseUrl}/buscar`, { params });
  }

  obtenerPorId(id: string): Observable<ProductoResponse> {
    return this.http.get<ProductoResponse>(`${this.baseUrl}/${id}`);
  }

  masVendidos(limite: number = 10): Observable<ProductoVentasResponse[]> {
    const params = new HttpParams().set('limite', limite.toString());
    return this.http.get<ProductoVentasResponse[]>(`${this.baseUrl}/mas-vendidos`, { params });
  }

  publicar(id: string): Observable<ProductoResponse> {
    return this.http.put<ProductoResponse>(`${this.baseUrl}/${id}/publicar`, {});
  }

  despublicar(id: string): Observable<ProductoResponse> {
    return this.http.put<ProductoResponse>(`${this.baseUrl}/${id}/despublicar`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Endpoints para Administrador (Crear Productos)
  crearCasco(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/cascos`, data);
  }

  crearChaqueta(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/chaquetas`, data);
  }

  crearGuantes(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/guantes`, data);
  }

  crearImpermeable(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/impermeables`, data);
  }

  crearBaul(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/baules`, data);
  }

  crearIntercomunicador(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/intercomunicadores`, data);
  }

  crearSoporteCelular(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/soportes-celular`, data);
  }

  crearVisor(data: any): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/visores`, data);
  }
}
