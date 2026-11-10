import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PedidoResponse,
  RegistrarPedidoRequest,
  SolicitarReembolsoRequest,
  DejarComentarioRequest,
  ComentarioResponse,
} from '../modelos/compras';

@Injectable({
  providedIn: 'root',
})
export class ComprasService {
  private readonly pedidosUrl = 'http://localhost:8080/api/pedidos';
  private readonly comentariosUrl = 'http://localhost:8080/api/comentarios';

  constructor(private http: HttpClient) {}

  listarMisPedidos(): Observable<PedidoResponse[]> {
    return this.http.get<PedidoResponse[]>(this.pedidosUrl);
  }

  crearPedido(request: RegistrarPedidoRequest): Observable<PedidoResponse> {
    return this.http.post<PedidoResponse>(this.pedidosUrl, request);
  }

  completarPedido(id: string): Observable<void> {
    return this.http.put<void>(`${this.pedidosUrl}/${id}/completar`, {});
  }

  solicitarReembolso(id: string, motivo: string): Observable<void> {
    const body: SolicitarReembolsoRequest = { motivo };
    return this.http.put<void>(`${this.pedidosUrl}/${id}/reembolso`, body);
  }

  dejarComentario(request: DejarComentarioRequest): Observable<ComentarioResponse> {
    return this.http.post<ComentarioResponse>(this.comentariosUrl, request);
  }
}
