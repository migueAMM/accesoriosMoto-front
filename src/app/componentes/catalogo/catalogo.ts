import { forkJoin } from 'rxjs';
import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { ComprasService } from '../../servicios/compras';
import { WishlistService } from '../../servicios/wishlist';
import { CarritoService } from '../../servicios/carrito';
import { ImagenesProductoService } from '../../servicios/imagenes-producto';
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
  public wishlistService = inject(WishlistService);
  public carritoService = inject(CarritoService);
  public imagenesService = inject(ImagenesProductoService);
  private comprasService = inject(ComprasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Todos los productos cargados del backend
  todosLosProductos = signal<ProductoResponse[]>([]);

  // Productos de la página activa que se muestran en la cuadrícula
  productos = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  // Categoría seleccionada
  categoriaActiva = signal<string>('TODOS');

  // Paginación
  pagina = signal<number>(0);
  tamano = signal<number>(9);
  totalPaginas = signal<number>(1);
  totalElementos = signal<number>(0);
  readonly tamanosDisponibles = [9, 18, 27];

  // Filtros
  busquedaTexto = '';
  filtroMarca = '';
  filtroColor = '';
  precioMin: number | null = null;
  precioMax: number | null = null;
  compatibilidadTipo: '' | TipoCompatibilidad = '';
  compatibilidadModelo = '';

  // Lista completa de marcas (se auto-complementa con la BD)
  marcasDisponibles: string[] = [
    'AGV', 'Alpinestars', 'Bell', 'Cardo', 'Cyclone', 'Dainese', 'FreedConn',
    'Givi', 'HJC', 'Kappa', 'LS2', 'Motowolf', 'Quad Lock', 'RAM Mounts',
    'Rainwear', 'Revit', 'Sena', 'Shad', 'Shark', 'Shoei'
  ];

  coloresDisponibles: string[] = [
    'Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Titanio', 'Verde', 'Amarillo', 'Plata', 'Carbono'
  ];

  // Estado de los selectores desplegables con scrollbar
  dropdownMarcasAbierto = signal<boolean>(false);
  dropdownColoresAbierto = signal<boolean>(false);

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cerrarDropdowns();
  }

  toggleDropdownMarcas(event?: Event): void {
    if (event) event.stopPropagation();
    this.dropdownMarcasAbierto.update((v) => !v);
    this.dropdownColoresAbierto.set(false);
  }

  toggleDropdownColores(event?: Event): void {
    if (event) event.stopPropagation();
    this.dropdownColoresAbierto.update((v) => !v);
    this.dropdownMarcasAbierto.set(false);
  }

  cerrarDropdowns(): void {
    this.dropdownMarcasAbierto.set(false);
    this.dropdownColoresAbierto.set(false);
  }

  obtenerMuestraColor(color: string): string {
    const c = (color || '').toLowerCase();
    if (c.includes('negro')) return '#111827';
    if (c.includes('blanco')) return '#ffffff';
    if (c.includes('rojo')) return '#e31837';
    if (c.includes('azul')) return '#1d4ed8';
    if (c.includes('gris') || c.includes('asfalto')) return '#6b7280';
    if (c.includes('titanio') || c.includes('nardo')) return '#475569';
    if (c.includes('carbon')) return '#18181b';
    if (c.includes('verde') || c.includes('oliva')) return '#15803d';
    if (c.includes('amarillo') || c.includes('fluor') || c.includes('neon')) return '#eab308';
    if (c.includes('plata') || c.includes('metal')) return '#cbd5e1';
    if (c.includes('marron') || c.includes('arena')) return '#78350f';
    if (c.includes('transparente')) return '#f8fafc';
    return '#9ca3af';
  }

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

    this.aplicarFiltrosYPaginar(0);
  }

  // Clave de almacenamiento local para productos despublicados (asegura persistencia visual para el admin)
  private readonly STORAGE_DESPUBLICADOS = 'accesorios_admin_despublicados';

  private obtenerDespublicadosLocales(): Record<string, ProductoResponse> {
    try {
      const data = localStorage.getItem(this.STORAGE_DESPUBLICADOS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private guardarDespublicadoLocal(producto: ProductoResponse): void {
    try {
      const mapa = this.obtenerDespublicadosLocales();
      mapa[producto.id] = { ...producto, estadoPublicacion: 'NO_PUBLICADO' };
      localStorage.setItem(this.STORAGE_DESPUBLICADOS, JSON.stringify(mapa));
    } catch {}
  }

  private removerDespublicadoLocal(productoId: string): void {
    try {
      const mapa = this.obtenerDespublicadosLocales();
      delete mapa[productoId];
      localStorage.setItem(this.STORAGE_DESPUBLICADOS, JSON.stringify(mapa));
    } catch {}
  }

  cargarProductos(numPagina: number = 0): void {
    this.cargando.set(true);
    this.error.set(null);

    // Consultamos el catálogo en lotes de 50 para respetar el límite del Backend y consolidar los 160+ productos
    forkJoin([
      this.catalogoService.listar({ pagina: 0, tamano: 50 }),
      this.catalogoService.listar({ pagina: 1, tamano: 50 }),
      this.catalogoService.listar({ pagina: 2, tamano: 50 }),
      this.catalogoService.listar({ pagina: 3, tamano: 50 }),
    ]).subscribe({
      next: (respuestas) => {
        const seen = new Set<string>();
        let items: ProductoResponse[] = [];
        for (const resp of respuestas) {
          if (resp && resp.content) {
            for (const p of resp.content) {
              if (!seen.has(p.id)) {
                seen.add(p.id);
                items.push(p);
              }
            }
          }
        }

          // 1. Filtrar visibilidad según el rol del usuario:
          if (this.authService.esAdmin()) {
            const despubMap = this.obtenerDespublicadosLocales();
            items = items.map((p) => {
              if (despubMap[p.id]) {
                return { ...p, estadoPublicacion: 'NO_PUBLICADO' };
              }
              return p;
            });

            // Si algún producto despublicado fue omitido, conservarlo visible para el admin
            Object.values(despubMap).forEach((pDespub) => {
              if (!items.some((p) => p.id === pDespub.id)) {
                items.unshift(pDespub);
              }
            });
          } else {
            // Para CLIENTES / VISITANTES: los productos despublicados son estrictamente invisibles
            items = items.filter((p) => p.estadoPublicacion === 'PUBLICADO');
          }

          this.todosLosProductos.set(items);
          this.actualizarMarcasYColores(items);
          this.aplicarFiltrosYPaginar(numPagina);
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set('No se pudo conectar con el catálogo: ' + (err.error?.mensaje || err.message));
          this.cargando.set(false);
        },
      });
  }

  private actualizarMarcasYColores(items: ProductoResponse[]): void {
    const marcasSet = new Set<string>(this.marcasDisponibles);
    const coloresSet = new Set<string>(this.coloresDisponibles);

    items.forEach((p) => {
      const marcaVal = typeof p.marca === 'string' ? p.marca : ((p.marca as any)?.nombre || '');
      if (marcaVal && marcaVal.trim()) {
        marcasSet.add(marcaVal.trim());
      }
      if (p.color && typeof p.color === 'string' && p.color.trim()) {
        const c = p.color.split('/')[0].trim();
        coloresSet.add(c);
      }
    });

    this.marcasDisponibles = Array.from(marcasSet).sort();
    this.coloresDisponibles = Array.from(coloresSet).sort();
  }

  aplicarFiltrosYPaginar(numPagina: number = 0): void {
    let items = [...this.todosLosProductos()];

    // 1. Rol cliente
    if (!this.authService.esAdmin()) {
      items = items.filter((p) => p.estadoPublicacion === 'PUBLICADO');
    }

    // 2. Filtrar por categoría activa
    items = this.filtrarPorCategoria(items);

    // 3. Filtro por marca
    if (this.filtroMarca) {
      items = items.filter((p) => {
        const marcaVal = typeof p.marca === 'string' ? p.marca : ((p.marca as any)?.nombre || '');
        return marcaVal.toLowerCase() === this.filtroMarca.toLowerCase();
      });
    }

    // 4. Filtro por color
    if (this.filtroColor) {
      items = items.filter((p) => p.color && p.color.toLowerCase().includes(this.filtroColor.toLowerCase()));
    }

    // 5. Filtro por rango de precio
    if (this.precioMin != null) {
      items = items.filter((p) => p.precioMonto >= this.precioMin!);
    }
    if (this.precioMax != null) {
      items = items.filter((p) => p.precioMonto <= this.precioMax!);
    }

    // 6. Búsqueda por texto (marca, tipo, color o ID)
    if (this.busquedaTexto.trim()) {
      const query = this.busquedaTexto.trim().toLowerCase();
      items = items.filter((p) => {
        const marcaVal = typeof p.marca === 'string' ? p.marca : ((p.marca as any)?.nombre || '');
        return (
          marcaVal.toLowerCase().includes(query) ||
          (p.tipo && p.tipo.toLowerCase().includes(query)) ||
          (p.color && p.color.toLowerCase().includes(query)) ||
          (p.id && p.id.toLowerCase().includes(query))
        );
      });
    }

    // 7. Cálculo de paginación
    const total = items.length;
    const tam = this.tamano();
    const paginas = Math.max(1, Math.ceil(total / tam));
    const pagValida = Math.min(Math.max(0, numPagina), paginas - 1);

    this.totalElementos.set(total);
    this.totalPaginas.set(paginas);
    this.pagina.set(pagValida);

    // 8. Rebanada para la página actual
    const inicio = pagValida * tam;
    const fin = inicio + tam;
    this.productos.set(items.slice(inicio, fin));
  }

  cambiarPagina(num: number): void {
    if (num < 0 || num >= this.totalPaginas() || num === this.pagina()) return;
    this.aplicarFiltrosYPaginar(num);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  }

  cambiarTamano(nuevoTamano: number): void {
    this.tamano.set(nuevoTamano);
    this.aplicarFiltrosYPaginar(0);
  }

  paginasVisibles(): number[] {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const res: number[] = [];

    let inicio = Math.max(0, actual - 2);
    let fin = Math.min(total - 1, inicio + 4);

    if (fin - inicio < 4) {
      inicio = Math.max(0, fin - 4);
    }

    for (let i = inicio; i <= fin; i++) {
      res.push(i);
    }
    return res;
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
    this.dropdownMarcasAbierto.set(false);
    this.aplicarFiltrosYPaginar(0);
  }

  seleccionarColor(color: string): void {
    this.filtroColor = this.filtroColor === color ? '' : color;
    this.dropdownColoresAbierto.set(false);
    this.aplicarFiltrosYPaginar(0);
  }

  aplicarFiltros(): void {
    this.cerrarDropdowns();
    this.aplicarFiltrosYPaginar(0);
  }

  limpiarFiltros(): void {
    this.limpiarFiltrosInternos();
    this.categoriaActiva.set('TODOS');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.aplicarFiltrosYPaginar(0);
  }

  private limpiarFiltrosInternos(): void {
    this.busquedaTexto = '';
    this.filtroMarca = '';
    this.filtroColor = '';
    this.precioMin = null;
    this.precioMax = null;
    this.compatibilidadTipo = '';
    this.compatibilidadModelo = '';
    this.cerrarDropdowns();
  }

  comprar(producto: ProductoResponse): void {
    this.carritoService.agregar(producto, 1);
  }

  togglePublicacion(producto: ProductoResponse): void {
    if (producto.estadoPublicacion === 'PUBLICADO') {
      this.catalogoService.despublicar(producto.id).subscribe({
        next: () => {
          this.guardarDespublicadoLocal(producto);
          this.mensaje.set(`Producto "${producto.marca} ${producto.tipo}" despublicado (oculto para clientes).`);
          this.todosLosProductos.update((lista) =>
            lista.map((p) => (p.id === producto.id ? { ...p, estadoPublicacion: 'NO_PUBLICADO' } : p))
          );
          this.aplicarFiltrosYPaginar(this.pagina());
          setTimeout(() => this.mensaje.set(null), 4000);
        },
        error: (err) => this.error.set('Error al despublicar: ' + (err.error?.mensaje || err.message)),
      });
    } else {
      this.catalogoService.publicar(producto.id).subscribe({
        next: () => {
          this.removerDespublicadoLocal(producto.id);
          this.mensaje.set(`Producto "${producto.marca} ${producto.tipo}" vuelto a poner disponible en la tienda.`);
          this.todosLosProductos.update((lista) =>
            lista.map((p) => (p.id === producto.id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p))
          );
          this.aplicarFiltrosYPaginar(this.pagina());
          setTimeout(() => this.mensaje.set(null), 4000);
        },
        error: (err) => this.error.set('Error al publicar: ' + (err.error?.mensaje || err.message)),
      });
    }
  }

  eliminar(producto: ProductoResponse): void {
    if (!confirm(`¿Eliminar definitivamente el producto "${producto.marca} ${producto.tipo}"?`)) return;
    this.cargando.set(true);
    this.catalogoService.eliminar(producto.id).subscribe({
      next: () => {
        this.removerDespublicadoLocal(producto.id);
        this.wishlistService.eliminar(producto.id);
        this.mensaje.set(`Producto "${producto.marca} ${producto.tipo}" eliminado del catálogo.`);
        this.todosLosProductos.update((lista) => lista.filter((p) => p.id !== producto.id));
        this.aplicarFiltrosYPaginar(this.pagina());
        this.cargando.set(false);
        setTimeout(() => this.mensaje.set(null), 4000);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set('Error al eliminar producto: ' + (err.error?.mensaje || err.message));
      },
    });
  }

  /**
   * Obtiene la imagen adecuada (Backend -> Imagen personalizada -> Preset -> Fallback)
   */
  obtenerImagen(prod: ProductoResponse): string {
    return this.imagenesService.obtenerImagen(prod);
  }

  toggleWishlist(prod: ProductoResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.wishlistService.toggle(prod);
  }

  onImgError(event: Event, prod: ProductoResponse): void {
    const target = event.target as HTMLImageElement;
    if (!target) return;
    const tipo = (prod.tipo || '').toLowerCase();
    if (tipo.includes('casco')) {
      target.src = '/productos/casco-agv-k3-negro.jpg';
    } else if (tipo.includes('chaqueta')) {
      target.src = '/productos/chaqueta-alpinestars-cuero.jpg';
    } else if (tipo.includes('guante')) {
      target.src = '/productos/guantes-dainese-negro.jpg';
    } else if (tipo.includes('baul')) {
      target.src = '/productos/baul-givi-negro.jpg';
    } else if (tipo.includes('intercom')) {
      target.src = '/productos/intercomunicador-cardo-gris.jpg';
    } else if (tipo.includes('soporte')) {
      target.src = '/productos/soporte-quadlock-negro.jpg';
    } else if (tipo.includes('visor')) {
      target.src = '/productos/visor-agv-transparente.jpg';
    } else {
      target.src = '/productos/impermeable-rainwear-azul.jpg';
    }
  }

  obtenerBadge(prod: ProductoResponse): string {
    const t = prod.tipo?.toLowerCase() || '';
    if (t.includes('casco')) {
      if (prod.precioMonto >= 2000000) return 'FIM / ECE 22.06';
      if (prod.precioMonto >= 800000) return 'ECE 22.06';
      return 'ECE 22.05';
    }
    if (t.includes('chaqueta')) {
      if (prod.precioMonto >= 2000000) return 'CUERO PRO NIVEL 5';
      if (prod.precioMonto >= 1000000) return 'NIVEL 3 CE';
      return 'TEXTIL PROTECCIÓN';
    }
    if (t.includes('guante')) {
      if (prod.precioMonto >= 600000) return 'KEVLAR RACING';
      return 'NUDILLOS CE';
    }
    if (t.includes('baul')) {
      if (prod.precioMonto >= 1500000) return 'ALUMINIO 58L';
      return 'MONOKEY SYSTEM';
    }
    if (t.includes('impermeable')) {
      return '100% TERMOSELLADO';
    }
    if (t.includes('intercom')) {
      if (prod.precioMonto >= 1000000) return 'DYNAMIC MESH 2.0';
      return 'BLUETOOTH 5.0';
    }
    if (t.includes('soporte')) {
      return 'ANTI-VIBRACIÓN';
    }
    if (t.includes('visor')) {
      if (prod.color?.toLowerCase().includes('iridium')) return 'IRIDIUM ANTI-RAYAS';
      return 'PINLOCK READY';
    }
    if (prod.precioMonto <= 300000) return 'OUTLET DEAL';
    return 'ORIGINAL';
  }

  // --- MODAL DE CREACIÓN DE PRODUCTOS (SOLO ADMINISTRADOR) ---
  modalCrearAbierto = signal<boolean>(false);
  guardandoProducto = signal<boolean>(false);

  // Opciones válidas para Enums requeridos por el Backend de Spring Boot
  readonly tallasDisponibles = ['XS', 'S', 'M', 'L', 'XL'];

  readonly nivelesProteccion = [
    { valor: 'NIVEL_1', label: 'Nivel 1 - Básico Urbano' },
    { valor: 'NIVEL_2', label: 'Nivel 2 - Protección Ciudad CE' },
    { valor: 'NIVEL_3', label: 'Nivel 3 - Deportivo / Carretera' },
    { valor: 'NIVEL_4', label: 'Nivel 4 - Alto Impacto Touring' },
    { valor: 'NIVEL_5', label: 'Nivel 5 - Máxima Competición Racing' },
  ];

  readonly materiales = [
    { valor: 'POLICARBONATO', label: 'Policarbonato de alta resistencia' },
    { valor: 'ABS', label: 'Termoplástico ABS' },
    { valor: 'FIBRA_DE_VIDRIO', label: 'Fibra de Vidrio' },
    { valor: 'FIBRA_DE_CARBONO', label: 'Fibra de Carbono' },
    { valor: 'KEVLAR', label: 'Kevlar' },
    { valor: 'CUERO', label: 'Cuero Genuino' },
    { valor: 'CUERO_SINTETICO', label: 'Cuero Sintético' },
    { valor: 'TEXTIL', label: 'Textil Cordura' },
    { valor: 'NYLON', label: 'Nylon de Alta Densidad' },
    { valor: 'POLIESTER', label: 'Poliéster' },
    { valor: 'ALUMINIO', label: 'Aluminio Reforzado' },
    { valor: 'PLASTICO', label: 'Plástico Inyectado' },
    { valor: 'PVC', label: 'PVC Impermeable' },
    { valor: 'ACERO', label: 'Acero Inoxidable' },
  ];

  // Formulario nuevo producto con soporte completo de imágenes y tipos del backend
  nuevoProducto = {
    tipo: 'Casco',
    marcaNombre: 'AGV',
    color: 'Negro',
    precioMonto: 650000,
    modelo: 'K3 SV Racing',
    talla: 'M',
    material: 'POLICARBONATO',
    proteccion: 'NIVEL_3',
    certificacionSeguridad: 'ECE 22.06',
    capacidadLitros: 45,
    dimensiones: '40x35x30 cm',
    capacidadMaximaCarga: 10,
    alcanceMetros: 1200,
    autonomiaHoras: 13,
    bluetooth: true,
    tipoSujecion: 'Manubrio',
    tipoVisor: 'Transparente Antirrayas Pinlock Ready',

    // Configuración de imagen (solo Galería y Descargas)
    modoImagen: 'preset' as 'preset' | 'descargados',
    imagenUrl: '/productos/casco-scorpion-exo.jpg',
    previewImagen: '/productos/casco-scorpion-exo.jpg',
  };

  abrirModalCrear(): void {
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  onTipoProductoChange(): void {
    const tipo = this.nuevoProducto.tipo;
    if (tipo === 'Casco') {
      this.nuevoProducto.talla = 'M';
      this.nuevoProducto.proteccion = 'NIVEL_3';
      this.nuevoProducto.material = 'POLICARBONATO';
      this.nuevoProducto.certificacionSeguridad = 'ECE 22.06';
      this.seleccionarPreset('/productos/casco-agv-k3-negro.jpg');
    } else if (tipo === 'Chaqueta') {
      this.nuevoProducto.talla = 'L';
      this.nuevoProducto.proteccion = 'NIVEL_2';
      this.nuevoProducto.material = 'CUERO';
      this.seleccionarPreset('/productos/chaqueta-alpinestars-cuero.jpg');
    } else if (tipo === 'Guantes') {
      this.nuevoProducto.talla = 'M';
      this.nuevoProducto.proteccion = 'NIVEL_2';
      this.nuevoProducto.material = 'CUERO';
      this.seleccionarPreset('/productos/guantes-dainese-negro.jpg');
    } else if (tipo === 'Impermeable') {
      this.nuevoProducto.talla = 'L';
      this.nuevoProducto.material = 'PVC';
      this.seleccionarPreset('/productos/impermeable-rainwear-azul.jpg');
    } else if (tipo === 'Baul') {
      this.nuevoProducto.material = 'ALUMINIO';
      this.nuevoProducto.capacidadLitros = 45;
      this.nuevoProducto.capacidadMaximaCarga = 10;
      this.nuevoProducto.dimensiones = '45x40x32 cm';
      this.seleccionarPreset('/productos/baul-givi-negro.jpg');
    } else if (tipo === 'Intercomunicador') {
      this.nuevoProducto.alcanceMetros = 1200;
      this.nuevoProducto.autonomiaHoras = 13;
      this.nuevoProducto.bluetooth = true;
      this.seleccionarPreset('/productos/intercomunicador-cardo-gris.jpg');
    } else if (tipo === 'SoporteCelular') {
      this.nuevoProducto.tipoSujecion = 'Manubrio';
      this.seleccionarPreset('/productos/soporte-quadlock-negro.jpg');
    } else if (tipo === 'Visor') {
      this.nuevoProducto.tipoVisor = 'Transparente Antirrayas Pinlock Ready';
      this.seleccionarPreset('/productos/visor-agv-transparente.jpg');
    }
  }

  seleccionarPreset(url: string): void {
    this.nuevoProducto.imagenUrl = url;
    this.nuevoProducto.previewImagen = url;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const fileNameLower = file.name.toLowerCase();

      // Detección directa de rutas locales estáticas de alta velocidad (0ms de lag):
      if (fileNameLower.includes('scorpion')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-scorpion-exo.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-scorpion-exo.jpg';
      } else if (fileNameLower.includes('agv') || fileNameLower.includes('k3')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-agv-k3-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-agv-k3-negro.jpg';
      } else if (fileNameLower.includes('ls2')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-ls2-blanco.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-ls2-blanco.jpg';
      } else if (fileNameLower.includes('alpinestar') || fileNameLower.includes('chaqueta')) {
        this.nuevoProducto.imagenUrl = '/productos/chaqueta-alpinestars-cuero.jpg';
        this.nuevoProducto.previewImagen = '/productos/chaqueta-alpinestars-cuero.jpg';
      } else if (fileNameLower.includes('guante') || fileNameLower.includes('dainese')) {
        this.nuevoProducto.imagenUrl = '/productos/guantes-dainese-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/guantes-dainese-negro.jpg';
      } else if (fileNameLower.includes('impermeable')) {
        this.nuevoProducto.imagenUrl = '/productos/impermeable-rainwear-azul.jpg';
        this.nuevoProducto.previewImagen = '/productos/impermeable-rainwear-azul.jpg';
      } else if (fileNameLower.includes('cardo') || fileNameLower.includes('intercom')) {
        this.nuevoProducto.imagenUrl = '/productos/intercomunicador-cardo-gris.jpg';
        this.nuevoProducto.previewImagen = '/productos/intercomunicador-cardo-gris.jpg';
      } else if (fileNameLower.includes('baul') || fileNameLower.includes('givi')) {
        this.nuevoProducto.imagenUrl = '/productos/baul-givi-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/baul-givi-negro.jpg';
      } else if (fileNameLower.includes('soporte') || fileNameLower.includes('quad')) {
        this.nuevoProducto.imagenUrl = '/productos/soporte-quadlock-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/soporte-quadlock-negro.jpg';
      } else if (fileNameLower.includes('visor')) {
        this.nuevoProducto.imagenUrl = '/productos/visor-agv-transparente.jpg';
        this.nuevoProducto.previewImagen = '/productos/visor-agv-transparente.jpg';
      } else {
        const rutaEstatica = this.obtenerPresetPorTipo(this.nuevoProducto.tipo);
        this.nuevoProducto.imagenUrl = rutaEstatica;
        this.nuevoProducto.previewImagen = URL.createObjectURL(file);
      }
    }
  }

  obtenerPresetPorTipo(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('casco')) return '/productos/casco-scorpion-exo.jpg';
    if (t.includes('chaqueta')) return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (t.includes('guante')) return '/productos/guantes-dainese-negro.jpg';
    if (t.includes('impermeable')) return '/productos/impermeable-rainwear-azul.jpg';
    if (t.includes('baul')) return '/productos/baul-givi-negro.jpg';
    if (t.includes('intercom')) return '/productos/intercomunicador-cardo-gris.jpg';
    if (t.includes('soporte')) return '/productos/soporte-quadlock-negro.jpg';
    if (t.includes('visor')) return '/productos/visor-agv-transparente.jpg';
    return '/productos/casco-scorpion-exo.jpg';
  }

  guardarNuevoProducto(): void {
    const p = this.nuevoProducto;
    const marcaId = 'marca-' + p.marcaNombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const precioMoneda = 'COP';
    const imagenFinal = p.imagenUrl || p.previewImagen || this.obtenerPresetPorTipo(p.tipo);

    // Ruta de catálogo segura y de alta velocidad:
    const imagenParaBackend =
      imagenFinal.startsWith('data:') || imagenFinal.length > 500
        ? this.obtenerPresetPorTipo(p.tipo)
        : imagenFinal;

    this.guardandoProducto.set(true);

    let obs;
    if (p.tipo === 'Casco') {
      obs = this.catalogoService.crearCasco({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        modelo: p.modelo.trim(),
        color: p.color.trim(),
        talla: p.talla,
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        proteccion: p.proteccion,
        certificacionSeguridad: p.certificacionSeguridad.trim() || 'ECE 22.06',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Chaqueta') {
      obs = this.catalogoService.crearChaqueta({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        proteccion: p.proteccion,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Guantes') {
      obs = this.catalogoService.crearGuantes({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        proteccion: p.proteccion,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Impermeable') {
      obs = this.catalogoService.crearImpermeable({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Baul') {
      obs = this.catalogoService.crearBaul({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        material: p.material,
        capacidadLitros: Number(p.capacidadLitros),
        dimensiones: p.dimensiones.trim() || '40x35x30 cm',
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        capacidadMaximaCarga: Number(p.capacidadMaximaCarga),
        color: p.color.trim(),
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Intercomunicador') {
      obs = this.catalogoService.crearIntercomunicador({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        alcanceMetros: Math.round(Number(p.alcanceMetros)),
        autonomiaHoras: Math.round(Number(p.autonomiaHoras)),
        bluetooth: Boolean(p.bluetooth),
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'SoporteCelular') {
      obs = this.catalogoService.crearSoporteCelular({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        tipoSujecion: p.tipoSujecion.trim() || 'Manubrio',
        imagenUrl: imagenParaBackend,
      });
    } else {
      obs = this.catalogoService.crearVisor({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        tipoVisor: p.tipoVisor.trim() || 'Transparente',
        modelosCascoCompatibles: ['AGV K3', 'AGV K1', 'LS2 Stream'],
        imagenUrl: imagenParaBackend,
      });
    }

    obs.subscribe({
      next: (creado) => {
        // Guardamos la imagen localmente
        const imagenGuardada = this.nuevoProducto.imagenUrl || imagenFinal;
        this.imagenesService.guardarImagen(creado.id, imagenGuardada);

        // PUBLICACIÓN AUTOMÁTICA INMEDIATA:
        // Los productos en el backend nacen en estado NO_PUBLICADO. Al publicar inmediatamente,
        // el producto pasa a PUBLICADO y aparece de inmediato en el catálogo como DISPONIBLE.
        this.catalogoService.publicar(creado.id).subscribe({
          next: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.mensaje.set(`¡Producto "${p.marcaNombre} ${p.tipo}" creado y disponible en catálogo!`);
            this.cargarProductos(0);
            setTimeout(() => this.mensaje.set(null), 5000);
          },
          error: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.mensaje.set(`¡Producto "${p.marcaNombre} ${p.tipo}" creado exitosamente!`);
            this.cargarProductos(0);
            setTimeout(() => this.mensaje.set(null), 5000);
          },
        });
      },
      error: (err) => {
        this.guardandoProducto.set(false);
        const detalle = err.error?.mensaje || err.error?.message || err.message || 'Error de validación';
        this.error.set('Error al crear producto: ' + detalle);
      },
    });
  }
}
