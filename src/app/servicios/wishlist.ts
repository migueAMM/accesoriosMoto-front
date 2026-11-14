import { Injectable, signal, computed } from '@angular/core';
import { ProductoResponse } from '../modelos/catalogo';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly STORAGE_KEY = 'accesoriosmoto_wishlist';

  // Lista reactiva de favoritos con Signals
  public items = signal<ProductoResponse[]>([]);

  // Contador computado de favoritos para los badges del navbar y cards
  public cantidad = computed(() => this.items().length);

  // Notificación reactiva (ej. "Agregado a favoritos")
  public notificacion = signal<string | null>(null);

  // Control para abrir/cerrar el drawer/modal de Wishlist desde cualquier componente
  public drawerAbierto = signal<boolean>(false);

  constructor() {
    this.cargarDeStorage();
  }

  private cargarDeStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.items.set(JSON.parse(data));
      }
    } catch {
      this.items.set([]);
    }
  }

  private guardarEnStorage(nuevos: ProductoResponse[]): void {
    this.items.set(nuevos);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevos));
    } catch (e) {
      console.warn('Error al guardar wishlist en localStorage:', e);
    }
  }

  estaEnWishlist(productoId: string): boolean {
    if (!productoId) return false;
    return this.items().some((p) => p.id === productoId);
  }

  toggle(producto: ProductoResponse): boolean {
    if (!producto || !producto.id) return false;

    const existe = this.estaEnWishlist(producto.id);
    if (existe) {
      this.eliminar(producto.id);
      this.mostrarNotificacion(`"${producto.marca} ${producto.tipo}" eliminado de tu lista de deseos.`);
      return false;
    } else {
      this.agregar(producto);
      this.mostrarNotificacion(`"${producto.marca} ${producto.tipo}" añadido a tu lista de deseos.`);
      return true;
    }
  }

  agregar(producto: ProductoResponse): void {
    if (!producto || !producto.id || this.estaEnWishlist(producto.id)) return;
    const nuevos = [producto, ...this.items()];
    this.guardarEnStorage(nuevos);
  }

  eliminar(productoId: string): void {
    const nuevos = this.items().filter((p) => p.id !== productoId);
    this.guardarEnStorage(nuevos);
  }

  limpiar(): void {
    this.guardarEnStorage([]);
    this.mostrarNotificacion('Has vaciado tu lista de deseos.');
  }

  abrirDrawer(): void {
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
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
