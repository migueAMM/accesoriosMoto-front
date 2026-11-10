export interface ItemPedidoRequest {
  productoId: string;
  cantidad: number;
}

export interface RegistrarPedidoRequest {
  compradorId: string;
  items: ItemPedidoRequest[];
}

export interface ItemPedidoResponse {
  id: string;
  productoId: string;
  cantidad: number;
  subtotalMonto: number;
  subtotalMoneda: string;
}

export interface PedidoResponse {
  id: string;
  estado: string;
  fecha: string;
  items: ItemPedidoResponse[];
  totalMonto: number;
  totalMoneda: string;
}

export interface SolicitarReembolsoRequest {
  motivo: string;
}

export interface DejarComentarioRequest {
  compradorId: string;
  pedidoId: string;
  productoId: string;
  calificacion: number;
  texto: string;
}

export interface ComentarioResponse {
  id: string;
  productoId: string;
  calificacion: number;
  texto: string;
}
