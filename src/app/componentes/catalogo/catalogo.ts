import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { ComprasService } from '../../servicios/compras';
import { ProductoResponse, TipoCompatibilidad } from '../../modelos/catalogo';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private catalogoService = inject(CatalogoService);
  public authService = inject(AuthService);
  private comprasService = inject(ComprasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  productos = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  // Categoría activa desde las pestañas
  categoriaActiva = signal<string>('TODOS');

  // Paginación
  pagina = signal<number>(0);
  tamano = signal<number>(12);
  totalPaginas = signal<number>(0);
  totalElementos = signal<number>(0);

  // Filtros
  busquedaTexto = '';
  filtroMarca = '';
  filtroColor = '';
  precioMin: number | null = null;
  precioMax: number | null = null;
  compatibilidadTipo: '' | TipoCompatibilidad = '';
  compatibilidadModelo = '';

  marcasDisponibles = ['AGV', 'LS2', 'Alpinestars', 'Dainese', 'Givi', 'Cardo', 'Quad Lock'];
  coloresDisponibles = ['Negro', 'Blanco', 'Azul', 'Gris', 'Transparente'];

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['tipo']) {
        this.busquedaTexto = params['tipo'];
        this.categoriaActiva.set(params['tipo'].toUpperCase());
      } else if (params['categoria']) {
        const cat = params['categoria'].toUpperCase();
        this.categoriaActiva.set(cat);
        this.aplicarFiltroPorCategoria(cat, false);
      } else if (params['outlet']) {
        this.categoriaActiva.set('OUTLET');
        this.precioMax = 300000;
      } else {
        this.categoriaActiva.set('TODOS');
      }
      this.cargarProductos(0);
    });
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActiva.set(categoria);
    this.limpiarFiltrosInternos();
    this.aplicarFiltroPorCategoria(categoria, true);
    this.cargarProductos(0);
  }

  private aplicarFiltroPorCategoria(cat: string, actualizarUrl: boolean): void {
    if (cat === 'CASCOS') {
      this.busquedaTexto = 'Casco';
    } else if (cat === 'TEXTIL') {
      this.busquedaTexto = '';
      // Filtrará productos que sean chaqueta, guantes o impermeable
    } else if (cat === 'ACCESORIOS') {
      this.busquedaTexto = '';
    } else if (cat === 'REPUESTOS') {
      this.busquedaTexto = 'Visor';
    } else if (cat === 'OUTLET') {
      this.precioMax = 300000;
    } else {
      this.busquedaTexto = '';
    }

    if (actualizarUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: cat === 'TODOS' ? {} : { categoria: cat.toLowerCase() },
      });
    }
  }

  cargarProductos(numPagina: number = 0): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(numPagina);

    if (this.busquedaTexto.trim()) {
      this.catalogoService
        .buscarPorTexto({
          texto: this.busquedaTexto.trim(),
          precioMinimo: this.precioMin ?? undefined,
          precioMaximo: this.precioMax ?? undefined,
          pagina: numPagina,
          tamano: this.tamano(),
        })
        .subscribe({
          next: (resp) => {
            let items = resp.content;
            items = this.filtrarPorCategoriaLocal(items);
            this.productos.set(items);
            this.totalPaginas.set(resp.totalPages);
            this.totalElementos.set(resp.totalElements);
            this.cargando.set(false);
          },
          error: (err) => {
            this.error.set('No se pudo cargar el catálogo: ' + (err.error?.message || err.message));
            this.cargando.set(false);
          },
        });
    } else {
      this.catalogoService
        .listar({
          marca: this.filtroMarca.trim() || undefined,
          color: this.filtroColor.trim() || undefined,
          precioMinimo: this.precioMin ?? undefined,
          precioMaximo: this.precioMax ?? undefined,
          tipoCompatibilidad: this.compatibilidadTipo || undefined,
          modeloCompatibilidad: this.compatibilidadModelo.trim() || undefined,
          pagina: numPagina,
          tamano: this.tamano(),
        })
        .subscribe({
          next: (resp) => {
            let items = resp.content;
            items = this.filtrarPorCategoriaLocal(items);
            this.productos.set(items);
            this.totalPaginas.set(resp.totalPages);
            this.totalElementos.set(resp.totalElements);
            this.cargando.set(false);
          },
          error: (err) => {
            this.error.set('No se pudo cargar el catálogo: ' + (err.error?.message || err.message));
            this.cargando.set(false);
          },
        });
    }
  }

  private filtrarPorCategoriaLocal(items: ProductoResponse[]): ProductoResponse[] {
    const cat = this.categoriaActiva();
    if (cat === 'TEXTIL') {
      return items.filter((p) => {
        const t = p.tipo.toLowerCase();
        return t.includes('chaqueta') || t.includes('guante') || t.includes('impermeable');
      });
    }
    if (cat === 'ACCESORIOS') {
      return items.filter((p) => {
        const t = p.tipo.toLowerCase();
        return t.includes('intercom') || t.includes('soporte') || t.includes('baul');
      });
    }
    if (cat === 'CASCOS') {
      return items.filter((p) => p.tipo.toLowerCase().includes('casco'));
    }
    if (cat === 'REPUESTOS') {
      return items.filter((p) => p.tipo.toLowerCase().includes('visor') || p.tipo.toLowerCase().includes('soporte'));
    }
    return items;
  }

  seleccionarMarca(marca: string): void {
    this.filtroMarca = this.filtroMarca === marca ? '' : marca;
    this.cargarProductos(0);
  }

  seleccionarColor(color: string): void {
    this.filtroColor = this.filtroColor === color ? '' : color;
    this.cargarProductos(0);
  }

  aplicarFiltros(): void {
    this.cargarProductos(0);
  }

  limpiarFiltros(): void {
    this.limpiarFiltrosInternos();
    this.categoriaActiva.set('TODOS');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.cargarProductos(0);
  }

  private limpiarFiltrosInternos(): void {
    this.busquedaTexto = '';
    this.filtroMarca = '';
    this.filtroColor = '';
    this.precioMin = null;
    this.precioMax = null;
    this.compatibilidadTipo = '';
    this.compatibilidadModelo = '';
  }

  comprar(producto: ProductoResponse): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario || !usuario.id) {
      this.error.set('Inicia sesión como comprador para registrar tu pedido.');
      return;
    }

    if (usuario.rol !== 'COMPRADOR') {
      this.error.set('La cuenta actual tiene perfil Administrador. Usa una cuenta Comprador para ordenar.');
      return;
    }

    this.cargando.set(true);
    this.comprasService
      .crearPedido({
        compradorId: usuario.id,
        items: [{ productoId: producto.id, cantidad: 1 }],
      })
      .subscribe({
        next: (pedido) => {
          this.mensaje.set(`Pedido registrado exitosamente. Código: ${pedido.id.substring(0, 8)}`);
          this.cargando.set(false);
          setTimeout(() => this.mensaje.set(null), 4000);
        },
        error: (err) => {
          this.error.set('Error al procesar el pedido: ' + (err.error?.message || err.statusText));
          this.cargando.set(false);
        },
      });
  }

  togglePublicacion(producto: ProductoResponse): void {
    if (producto.estadoPublicacion === 'PUBLICADO') {
      this.catalogoService.despublicar(producto.id).subscribe({
        next: () => {
          this.mensaje.set(`Producto ${producto.id} despublicado`);
          this.cargarProductos(this.pagina());
        },
        error: (err) => this.error.set('Error: ' + err.message),
      });
    } else {
      this.catalogoService.publicar(producto.id).subscribe({
        next: () => {
          this.mensaje.set(`Producto ${producto.id} publicado`);
          this.cargarProductos(this.pagina());
        },
        error: (err) => this.error.set('Error: ' + err.message),
      });
    }
  }

  eliminar(producto: ProductoResponse): void {
    if (!confirm(`¿Eliminar producto ${producto.id}?`)) return;
    this.catalogoService.eliminar(producto.id).subscribe({
      next: () => {
        this.mensaje.set('Producto eliminado.');
        this.cargarProductos(this.pagina());
      },
      error: (err) => this.error.set('Error: ' + err.message),
    });
  }

  obtenerImagen(prod: ProductoResponse): string {
    const tipo = prod.tipo?.toLowerCase() || '';
    if (tipo.includes('casco')) {
      return prod.color?.toLowerCase().includes('blanco')
        ? 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('chaqueta')) {
      return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('guantes')) {
      return 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('impermeable')) {
      return 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('intercomunicador')) {
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('soporte')) {
      return 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('baul')) {
      return 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('visor')) {
      return 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80';
  }

  obtenerBadge(prod: ProductoResponse): string {
    const t = prod.tipo?.toLowerCase() || '';
    if (t.includes('casco')) return 'ECE 22.06';
    if (t.includes('chaqueta')) return 'NIVEL 3';
    if (prod.precioMonto > 500000) return 'PREMIUM';
    return 'NUEVO';
  }
}
