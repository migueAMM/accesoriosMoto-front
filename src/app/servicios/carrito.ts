import { Injectable, signal, computed } from '@angular/core';
import { ProductoResponse } from '../modelos/catalogo';

export interface ItemCarrito {
  producto: ProductoResponse;
  cantidad: number;
}

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private readonly STORAGE_KEY = 'accesoriosmoto_carrito';

  // Lista reactiva de items en el carrito
  public items = signal<ItemCarrito[]>([]);

  // Contador computado del total de unidades agregadas
  public cantidadTotal = computed(() =>
    this.items().reduce((acum, item) => acum + item.cantidad, 0)
  );

  // Subtotal total en COP computado
  public subtotal = computed(() =>
    this.items().reduce(
      (acum, item) => acum + (item.producto.precioMonto || 0) * item.cantidad,
      0
    )
  );

  // Control reactivo del panel lateral (Drawer) de Carrito
  public drawerAbierto = signal<boolean>(false);

  // Notificación flotante (Toast)
  public notificacion = signal<string | null>(null);

  constructor() {
    this.cargarDeStorage();
  }

  private cargarDeStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.items.set(JSON.parse(raw));
      }
    } catch {
      this.items.set([]);
    }
  }

  private guardarEnStorage(nuevos: ItemCarrito[]): void {
    this.items.set(nuevos);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevos));
      }
    } catch (e) {
      console.warn('No se pudo guardar el carrito en localStorage:', e);
    }
  }

  agregar(producto: ProductoResponse, cantidad: number = 1): void {
    if (!producto || !producto.id) return;
    const actual = [...this.items()];
    const index = actual.findIndex((i) => i.producto.id === producto.id);

    if (index >= 0) {
      actual[index] = {
        ...actual[index],
        cantidad: actual[index].cantidad + cantidad,
      };
    } else {
      actual.unshift({
        producto,
        cantidad: Math.max(1, cantidad),
      });
    }

    this.guardarEnStorage(actual);
    this.mostrarNotificacion(
      `"${producto.marca} ${producto.tipo}" se añadió al carrito de compras.`
    );
  }

  actualizarCantidad(productoId: string, delta: number): void {
    const actual = [...this.items()];
    const index = actual.findIndex((i) => i.producto.id === productoId);
    if (index < 0) return;

    const nuevaCantidad = actual[index].cantidad + delta;
    if (nuevaCantidad <= 0) {
      this.eliminar(productoId);
    } else {
      actual[index] = {
        ...actual[index],
        cantidad: nuevaCantidad,
      };
      this.guardarEnStorage(actual);
    }
  }

  eliminar(productoId: string): void {
    const itemEliminado = this.items().find((i) => i.producto.id === productoId);
    const nuevos = this.items().filter((i) => i.producto.id !== productoId);
    this.guardarEnStorage(nuevos);
    if (itemEliminado) {
      this.mostrarNotificacion(
        `"${itemEliminado.producto.marca} ${itemEliminado.producto.tipo}" eliminado del carrito.`
      );
    }
  }

  limpiar(): void {
    this.guardarEnStorage([]);
    this.mostrarNotificacion('El carrito de compras ha sido vaciado.');
  }

  abrirDrawer(): void {
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
  }

  toggleDrawer(): void {
    this.drawerAbierto.update((v) => !v);
  }

  private mostrarNotificacion(mensaje: string): void {
    this.notificacion.set(mensaje);
    setTimeout(() => {
      if (this.notificacion() === mensaje) {
        this.notificacion.set(null);
      }
    }, 3500);
  }
}
