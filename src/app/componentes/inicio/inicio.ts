import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { WishlistService } from '../../servicios/wishlist';
import { CarritoService } from '../../servicios/carrito';
import { ImagenesProductoService } from '../../servicios/imagenes-producto';
import { ProductoResponse } from '../../modelos/catalogo';

export interface TipoCascoItem {
  id: string;
  nombre: string;
  tag: string;
  svgPath: string;
  queryParams: Record<string, string>;
}

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

  // Tipos de casco reales basados en la silueta de inducascos.com
  tiposCasco: TipoCascoItem[] = [
    {
      id: 'integral',
      nombre: 'INTEGRAL',
      tag: 'Pista & Racing',
      svgPath: 'M 18,52 C 14,36 22,14 48,10 C 74,6 88,24 88,44 C 88,58 84,68 76,78 C 66,88 48,90 34,88 C 22,86 16,74 18,52 Z M 32,32 L 80,34 C 82,46 78,54 62,55 L 34,55 C 28,52 28,40 32,32 Z',
      queryParams: { categoria: 'cascos' },
    },
    {
      id: 'abatible',
      nombre: 'ABATIBLE',
      tag: 'Modular Touring',
      svgPath: 'M 18,50 C 14,34 22,14 48,10 C 74,6 88,22 88,44 C 88,60 82,72 74,80 C 64,88 46,90 34,88 C 22,86 16,72 18,50 Z M 30,30 L 78,32 C 80,44 76,50 64,52 L 32,52 Z M 26,62 L 58,62 C 60,68 58,74 50,76 L 28,74 Z',
      queryParams: { categoria: 'cascos' },
    },
    {
      id: 'abierto',
      nombre: 'ABIERTO',
      tag: 'Jet Urbano',
      svgPath: 'M 22,46 C 18,32 26,14 50,10 C 74,6 86,22 86,42 C 86,56 80,66 74,72 C 64,80 52,82 46,82 C 40,82 34,70 34,60 M 34,28 L 80,30 C 82,48 76,64 64,68 L 38,62',
      queryParams: { categoria: 'cascos' },
    },
    {
      id: 'multiproposito',
      nombre: 'MULTIPROPÓSITO',
      tag: 'Dual Adventure',
      svgPath: 'M 16,48 C 12,34 22,16 46,12 C 70,8 86,24 86,44 C 86,60 80,72 72,80 C 60,88 44,88 32,86 Z M 8,16 L 54,8 L 62,14 L 18,22 Z M 32,34 L 80,36 C 82,48 76,54 62,56 L 34,56 Z',
      queryParams: { categoria: 'cascos' },
    },
    {
      id: 'cross',
      nombre: 'CROSS',
      tag: 'Enduro & Off-Road',
      svgPath: 'M 14,50 C 10,36 20,18 44,14 C 68,10 84,26 84,46 C 84,62 76,74 68,82 C 54,92 36,92 24,88 Z M 4,12 L 58,6 L 66,12 L 14,20 Z M 26,60 L 12,68 L 22,76 L 38,70 Z',
      queryParams: { categoria: 'cascos' },
    },
    {
      id: 'retro',
      nombre: 'RETRO',
      tag: 'Cafe Racer & Custom',
      svgPath: 'M 20,48 C 16,34 24,14 50,10 C 76,6 88,24 88,46 C 88,62 82,74 74,82 C 62,90 46,90 32,88 C 22,86 18,70 20,48 Z M 32,32 L 80,34 C 82,44 78,50 66,52 L 34,52 Z',
      queryParams: { categoria: 'cascos' },
    },
  ];

  marcas = ['AGV', 'LS2', 'ALPINESTARS', 'DAINESE', 'GIVI', 'CARDO', 'QUAD LOCK', 'SHAFT', 'HRO'];

  ngOnInit(): void {
    this.cargando.set(true);
    // Cargamos productos de la BD
    this.catalogoService.listar({ pagina: 0, tamano: 4 }).subscribe({
      next: (resp) => {
        this.destacados.set(resp.content);
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
