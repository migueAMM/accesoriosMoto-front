import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'info' | 'advertencia';

export interface Aviso {
  id: string;
  mensaje: string;
  tipo: TipoAviso;
  duracionMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class AvisosService {
  // Lista reactiva de avisos activos gestionados con Signals
  public avisos = signal<Aviso[]>([]);

  mostrar(mensaje: string, tipo: TipoAviso = 'info', duracionMs: number = 4500): void {
    const id = 'aviso-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const nuevo: Aviso = { id, mensaje, tipo, duracionMs };

    this.avisos.update((actuales) => [...actuales, nuevo]);

    if (duracionMs > 0) {
      setTimeout(() => {
        this.cerrar(id);
      }, duracionMs);
    }
  }

  exito(mensaje: string, duracionMs: number = 4500): void {
    this.mostrar(mensaje, 'exito', duracionMs);
  }

  error(mensaje: string, duracionMs: number = 5500): void {
    this.mostrar(mensaje, 'error', duracionMs);
  }

  info(mensaje: string, duracionMs: number = 4500): void {
    this.mostrar(mensaje, 'info', duracionMs);
  }

  advertencia(mensaje: string, duracionMs: number = 5000): void {
    this.mostrar(mensaje, 'advertencia', duracionMs);
  }

  cerrar(id: string): void {
    this.avisos.update((actuales) => actuales.filter((a) => a.id !== id));
  }

  limpiar(): void {
    this.avisos.set([]);
  }

  // Traducción pedagógica de códigos HTTP según la rúbrica (Sección 2.6)
  traducirErrorHttp(status: number, mensajeBackend?: string): string {
    switch (status) {
      case 400:
        return 'Revisa los datos: ' + (mensajeBackend || 'la información enviada no cumple el formato requerido.');
      case 401:
        return 'Inicia sesión: tu sesión ha vencido o necesitas autenticarte para continuar.';
      case 403:
        return 'No autorizado: tu rol de usuario no tiene permisos para realizar esta operación.';
      case 404:
        return 'No existe: el recurso solicitado no fue encontrado en el catálogo.';
      case 500:
        return 'Error del servidor: ' + (mensajeBackend || 'falló el procesamiento interno en el backend.');
      default:
        return mensajeBackend || `Error en la operación (Código HTTP ${status}).`;
    }
  }
}
