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

  // Lista de productos
  productos = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  // Categoría seleccionada
  categoriaActiva = signal<string>('TODOS');

  // Paginación
  pagina = signal<number>(0);
  tamano = signal<number>(12);
  totalPaginas = signal<number>(1);
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
      if (params['categoria']) {
        const cat = params['categoria'].toUpperCase();
        this.categoriaActiva.set(cat);
      } else if (params['tipo']) {
        const t = params['tipo'].toUpperCase();
        this.categoriaActiva.set(t.includes('CASCO') ? 'CASCOS' : t);
      } else if (params['outlet']) {
        this.categoriaActiva.set('OUTLET');
      } else {
        this.categoriaActiva.set('TODOS');
      }

      if (params['q']) {
        this.busquedaTexto = params['q'];
      }
      if (params['marca']) {
        this.filtroMarca = params['marca'];
      }
      if (params['color']) {
        this.filtroColor = params['color'];
      }

      this.cargarProductos(0);
    });
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActiva.set(categoria);
    this.limpiarFiltrosInternos();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: categoria === 'TODOS' ? {} : { categoria: categoria.toLowerCase() },
    });

    this.cargarProductos(0);
  }

  cargarProductos(numPagina: number = 0): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(numPagina);

    // Llamamos siempre a listar enviando moneda 'COP' si hay filtros de precio para cumplir con la regla del backend
    this.catalogoService
      .listar({
        marca: this.filtroMarca.trim() || undefined,
        color: this.filtroColor.trim() || undefined,
        precioMinimo: this.precioMin ?? undefined,
        precioMaximo: this.precioMax ?? undefined,
        moneda: this.precioMin != null || this.precioMax != null ? 'COP' : undefined,
        tipoCompatibilidad: this.compatibilidadTipo || undefined,
        modeloCompatibilidad: this.compatibilidadModelo.trim() || undefined,
        pagina: numPagina,
        tamano: this.tamano(),
      })
      .subscribe({
        next: (resp) => {
          let items = resp.content;

          // 1. Filtrar según la pestaña activa (CASCOS, TEXTIL, ACCESORIOS, REPUESTOS, OUTLET)
          items = this.filtrarPorCategoria(items);

          // 2. Búsqueda local por texto en marca, tipo, color o ID
          if (this.busquedaTexto.trim()) {
            const query = this.busquedaTexto.trim().toLowerCase();
            items = items.filter(
              (p) =>
                (p.marca && p.marca.toLowerCase().includes(query)) ||
                (p.tipo && p.tipo.toLowerCase().includes(query)) ||
                (p.color && p.color.toLowerCase().includes(query)) ||
                (p.id && p.id.toLowerCase().includes(query))
            );
          }

          this.productos.set(items);
          this.totalElementos.set(items.length);
          this.totalPaginas.set(Math.max(1, Math.ceil(items.length / this.tamano())));
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set('No se pudo cargar el catálogo: ' + (err.error?.mensaje || err.message));
          this.cargando.set(false);
        },
      });
  }

  private filtrarPorCategoria(items: ProductoResponse[]): ProductoResponse[] {
    const cat = this.categoriaActiva();
    if (cat === 'CASCOS') {
      return items.filter((p) => p.tipo?.toLowerCase().includes('casco'));
    }
    if (cat === 'TEXTIL') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('chaqueta') || t.includes('guante') || t.includes('impermeable');
      });
    }
    if (cat === 'ACCESORIOS') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('baul') || t.includes('soporte') || t.includes('intercom');
      });
    }
    if (cat === 'REPUESTOS') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('visor');
      });
    }
    if (cat === 'OUTLET') {
      return items.filter((p) => p.precioMonto <= 300000);
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

  /**
   * Ruta absoluta con "/" al inicio para que el navegador cargue desde la raíz del dominio
   */
  obtenerImagen(prod: ProductoResponse): string {
    const id = prod.id || '';
    const tipo = (prod.tipo || '').toLowerCase();
    const color = (prod.color || '').toLowerCase();

    // Mapeo por ID de los registros reales de la base de datos
    if (id === 'seed-casco-1') return '/productos/casco-agv-k3-negro.jpg';
    if (id === 'seed-casco-2') return '/productos/casco-ls2-blanco.jpg';
    if (id === 'seed-chaqueta-1') return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (id === 'seed-guantes-1') return '/productos/guantes-dainese-negro.jpg';
    if (id === 'seed-impermeable-1') return '/productos/impermeable-rainwear-azul.jpg';
    if (id === 'seed-intercom-1') return '/productos/intercomunicador-cardo-gris.jpg';
    if (id === 'seed-soporte-1') return '/productos/soporte-quadlock-negro.jpg';
    if (id === 'seed-baul-1') return '/productos/baul-givi-negro.jpg';
    if (id === 'seed-visor-1') return '/productos/visor-agv-transparente.jpg';

    // Mapeo genérico con ruta absoluta
    if (tipo.includes('casco')) {
      return color.includes('blanco')
        ? '/productos/casco-ls2-blanco.jpg'
        : '/productos/casco-agv-k3-negro.jpg';
    }
    if (tipo.includes('chaqueta')) return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (tipo.includes('guante')) return '/productos/guantes-dainese-negro.jpg';
    if (tipo.includes('impermeable')) return '/productos/impermeable-rainwear-azul.jpg';
    if (tipo.includes('intercom')) return '/productos/intercomunicador-cardo-gris.jpg';
    if (tipo.includes('soporte')) return '/productos/soporte-quadlock-negro.jpg';
    if (tipo.includes('baul')) return '/productos/baul-givi-negro.jpg';
    if (tipo.includes('visor')) return '/productos/visor-agv-transparente.jpg';

    return '/productos/casco-agv-k3-negro.jpg';
  }

  onImgError(event: Event, prod: ProductoResponse): void {
    const target = event.target as HTMLImageElement;
    if (!target) return;
    const tipo = (prod.tipo || '').toLowerCase();
    if (tipo.includes('casco')) {
      target.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=85';
    } else if (tipo.includes('chaqueta')) {
      target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85';
    } else if (tipo.includes('guante')) {
      target.src = 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=85';
    } else {
      target.src = 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=85';
    }
  }

  obtenerBadge(prod: ProductoResponse): string {
    const t = prod.tipo?.toLowerCase() || '';
    if (t.includes('casco')) return 'ECE 22.06';
    if (t.includes('chaqueta')) return 'NIVEL 3';
    if (prod.precioMonto > 500000) return 'PREMIUM';
    return 'ORIGINAL';
  }
}
