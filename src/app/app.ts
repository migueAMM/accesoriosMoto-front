import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './servicios/auth';
import { WishlistService } from './servicios/wishlist';
import { CarritoService } from './servicios/carrito';
import { ComprasService } from './servicios/compras';
import { ImagenesProductoService } from './servicios/imagenes-producto';
import { AvisosService } from './servicios/avisos';
import { Avisos } from './componentes/avisos/avisos';
import { ProductoResponse } from './modelos/catalogo';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Avisos],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public authService = inject(AuthService);
  public wishlistService = inject(WishlistService);
  public carritoService = inject(CarritoService);
  public comprasService = inject(ComprasService);
  public imagenesService = inject(ImagenesProductoService);
  public avisosService = inject(AvisosService);
  private router = inject(Router);

  // Control del Mega Menú de escritorio
  menuAbierto = signal<string | null>(null);

  // Control del Menú Móvil Hamburguesa (Sección 2.8 de la rúbrica)
  menuMovilAbierto = signal<boolean>(false);

  // Buscador integrado en el header
  busquedaHeader = '';
  buscadorVisible = signal<boolean>(false);

  // Estado del proceso de compra
  procesandoPedido = signal<boolean>(false);
  mensajePedido = signal<string | null>(null);
  errorPedido = signal<string | null>(null);

  toggleMenuMovil(): void {
    this.menuMovilAbierto.update((v) => !v);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  abrirMenu(menu: string): void {
    this.menuAbierto.set(menu);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(null);
  }

  toggleBuscador(): void {
    this.buscadorVisible.update((v) => !v);
  }

  buscar(): void {
    if (this.busquedaHeader.trim()) {
      const q = this.busquedaHeader.trim();
      this.busquedaHeader = '';
      this.buscadorVisible.set(false);
      this.cerrarMenu();
      this.router.navigate(['/catalogo'], { queryParams: { q } });
    }
  }

  navegarACatalogo(params: Record<string, string>): void {
    this.cerrarMenu();
    this.router.navigate(['/catalogo'], { queryParams: params });
  }

  toggleWishlistDrawer(): void {
    if (this.wishlistService.drawerAbierto()) {
      this.wishlistService.cerrarDrawer();
    } else {
      this.carritoService.cerrarDrawer();
      this.wishlistService.abrirDrawer();
    }
  }

  toggleCarritoDrawer(): void {
    if (this.carritoService.drawerAbierto()) {
      this.carritoService.cerrarDrawer();
    } else {
      this.wishlistService.cerrarDrawer();
      this.carritoService.abrirDrawer();
    }
  }

  eliminarDeWishlist(id: string): void {
    this.wishlistService.eliminar(id);
  }

  limpiarWishlist(): void {
    this.wishlistService.limpiar();
  }

  eliminarDelCarrito(id: string): void {
    this.carritoService.eliminar(id);
  }

  actualizarCantidadCarrito(id: string, delta: number): void {
    this.carritoService.actualizarCantidad(id, delta);
  }

  limpiarCarrito(): void {
    this.carritoService.limpiar();
  }

  finalizarCompra(): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario || !usuario.id) {
      const msg = 'Inicia sesión con tu cuenta de comprador para finalizar tu pedido.';
      this.errorPedido.set(msg);
      this.avisosService.advertencia(msg);
      setTimeout(() => {
        this.carritoService.cerrarDrawer();
        this.router.navigate(['/login']);
        this.errorPedido.set(null);
      }, 2200);
      return;
    }

    if (usuario.rol === 'ADMINISTRADOR') {
      const msg = 'La cuenta activa es Administrador. Inicia sesión con cuenta Comprador para ordenar.';
      this.errorPedido.set(msg);
      this.avisosService.advertencia(msg);
      return;
    }

    const items = this.carritoService.items().map((i) => ({
      productoId: i.producto.id,
      cantidad: i.cantidad,
    }));

    if (items.length === 0) return;

    this.procesandoPedido.set(true);
    this.errorPedido.set(null);

    this.comprasService
      .crearPedido({
        compradorId: usuario.id,
        items,
      })
      .subscribe({
        next: (pedido) => {
          this.procesandoPedido.set(false);
          const exitoMsg = `¡Pedido #${pedido.id.substring(0, 8)} confirmado con éxito!`;
          this.mensajePedido.set(exitoMsg);
          this.avisosService.exito(exitoMsg);
          this.carritoService.limpiar();
          setTimeout(() => {
            this.mensajePedido.set(null);
            this.carritoService.cerrarDrawer();
          }, 3500);
        },
        error: (err) => {
          this.procesandoPedido.set(false);
          const msg = this.avisosService.traducirErrorHttp(
            err.status,
            'Error al procesar el pedido con el backend.'
          );
          this.errorPedido.set(msg);
          this.avisosService.error(msg);
        },
      });
  }

  obtenerImagen(prod: ProductoResponse): string {
    return this.imagenesService.obtenerImagen(prod);
  }

  irAProducto(prod: ProductoResponse): void {
    this.wishlistService.cerrarDrawer();
    this.carritoService.cerrarDrawer();
    this.router.navigate(['/catalogo'], { queryParams: { q: prod.marca || prod.tipo } });
  }

  irACatalogo(): void {
    this.wishlistService.cerrarDrawer();
    this.carritoService.cerrarDrawer();
    this.router.navigate(['/catalogo']);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
