import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { WishlistService } from '../../servicios/wishlist';
import { CarritoService } from '../../servicios/carrito';
import { ImagenesProductoService } from '../../servicios/imagenes-producto';
import { ProductoResponse } from '../../modelos/catalogo';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private catalogoService = inject(CatalogoService);
  public authService = inject(AuthService);
  public wishlistService = inject(WishlistService);
  public carritoService = inject(CarritoService);
  public imagenesService = inject(ImagenesProductoService);

  destacados = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);

  marcas = [
    'AGV',
    'LS2',
    'Shoei',
    'HJC',
    'Bell',
    'Shark',
    'Alpinestars',
    'Dainese',
    'Revit',
    'Givi',
    'Shad',
    'Kappa',
    'Cardo',
    'Sena',
    'FreedConn',
    'Quad Lock',
    'RAM Mounts',
    'Motowolf',
    'Rainwear',
    'Cyclone',
  ];

  ngOnInit(): void {
    this.cargando.set(true);
    // Cargamos productos de la BD (solo productos activos y publicados)
    this.catalogoService.listar({ pagina: 0, tamano: 10 }).subscribe({
      next: (resp) => {
        const publicados = resp.content.filter((p) => p.estadoPublicacion === 'PUBLICADO').slice(0, 4);
        this.destacados.set(publicados);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  toggleWishlist(prod: ProductoResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.wishlistService.toggle(prod);
  }

  obtenerImagen(prod: ProductoResponse): string {
    return this.imagenesService.obtenerImagen(prod);
  }

  agregarAlCarrito(prod: ProductoResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.carritoService.agregar(prod, 1);
  }
}
