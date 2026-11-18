import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { ComprasService } from '../../servicios/compras';
import { WishlistService } from '../../servicios/wishlist';
import { CarritoService } from '../../servicios/carrito';
import { ImagenesProductoService } from '../../servicios/imagenes-producto';
import { AvisosService } from '../../servicios/avisos';
import { ProductoResponse, TipoCompatibilidad } from '../../modelos/catalogo';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit, OnDestroy {
  private catalogoService = inject(CatalogoService);
  public authService = inject(AuthService);
  public wishlistService = inject(WishlistService);
  public carritoService = inject(CarritoService);
  public imagenesService = inject(ImagenesProductoService);
  public avisosService = inject(AvisosService);
  private comprasService = inject(ComprasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Productos de la página activa que se muestran en la cuadrícula
  productos = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  // Categoría seleccionada
  categoriaActiva = signal<string>('TODOS');

  // Paginación delegada al backend (Sección 2.5 de la Rúbrica)
  pagina = signal<number>(0);
  tamano = signal<number>(9);
  totalPaginas = signal<number>(1);
  totalElementos = signal<number>(0);
  readonly tamanosDisponibles = [9, 18, 27];

  // Filtros reactivos
  busquedaTexto = '';
  filtroMarca = '';
  filtroColor = '';
  precioMin: number | null = null;
  precioMax: number | null = null;
  compatibilidadTipo: '' | TipoCompatibilidad = '';
  compatibilidadModelo = '';

  // Subject para búsqueda reactiva con Debounce (Extra 1)
  private busquedaSubject = new Subject<string>();
  private subscripcionBusqueda?: Subscription;

  // Lista de marcas disponibles
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

  // --- MODAL Y FORMULARIO REACTIVO DE CREACIÓN DE PRODUCTOS (Sección 2.2 de la Rúbrica) ---
  modalCrearAbierto = signal<boolean>(false);
  guardandoProducto = signal<boolean>(false);
  productoForm!: FormGroup;

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

  // Clave de almacenamiento local para productos despublicados (asegura visibilidad exclusiva para el admin)
  private readonly STORAGE_DESPUBLICADOS = 'accesorios_admin_despublicados';

  constructor() {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.productoForm = this.fb.group({
      tipo: ['Casco', Validators.required],
      marcaNombre: ['', [Validators.required, Validators.minLength(2)]],
      color: ['', Validators.required],
      precioMonto: [650000, [Validators.required, Validators.min(1000)]],
      modelo: ['K3 SV Racing'],
      talla: ['M'],
      material: ['POLICARBONATO'],
      proteccion: ['NIVEL_3'],
      certificacionSeguridad: ['ECE 22.06'],
      capacidadLitros: [45],
      dimensiones: ['40x35x30 cm'],
      capacidadMaximaCarga: [10],
      alcanceMetros: [1200],
      autonomiaHoras: [13],
      bluetooth: [true],
      tipoSujecion: ['Manubrio'],
      tipoVisor: ['Transparente Antirrayas Pinlock Ready'],
      modoImagen: ['preset'],
      imagenUrl: ['/productos/casco-agv-k3-negro.jpg'],
      previewImagen: ['/productos/casco-agv-k3-negro.jpg'],
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.productoForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

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
    // Suscripción al Debounce de búsqueda reactiva (Extra 1)
    this.subscripcionBusqueda = this.busquedaSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((query) => {
        this.busquedaTexto = query;
        this.cargarProductos(0);
      });

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

  ngOnDestroy(): void {
    this.subscripcionBusqueda?.unsubscribe();
  }

  onBusquedaInput(valor: string): void {
    this.busquedaSubject.next(valor);
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

  /**
   * Carga los productos delegando la paginación de forma estricta al Backend.
   * Criterio 2.5 de la Rúbrica: Angular envía page y size; el backend retorna PageResponse.
   */
  cargarProductos(numPagina: number = 0): void {
    this.cargando.set(true);
    this.error.set(null);

    const queryTexto = this.busquedaTexto.trim();
    const cat = this.categoriaActiva();
    const tam = this.tamano();

    let peticion$;

    if (queryTexto) {
      peticion$ = this.catalogoService.buscarPorTexto({
        texto: queryTexto,
        pagina: numPagina,
        tamano: tam,
        precioMinimo: this.precioMin || undefined,
        precioMaximo: this.precioMax || undefined,
      });
    } else if (cat === 'CASCOS') {
      peticion$ = this.catalogoService.buscarPorTexto({
        texto: 'Casco',
        pagina: numPagina,
        tamano: tam,
        precioMinimo: this.precioMin || undefined,
        precioMaximo: this.precioMax || undefined,
      });
    } else if (cat === 'REPUESTOS') {
      peticion$ = this.catalogoService.buscarPorTexto({
        texto: 'Visor',
        pagina: numPagina,
        tamano: tam,
        precioMinimo: this.precioMin || undefined,
        precioMaximo: this.precioMax || undefined,
      });
    } else if (cat === 'OUTLET') {
      peticion$ = this.catalogoService.listar({
        precioMaximo: 300000,
        pagina: numPagina,
        tamano: tam,
      });
    } else {
      peticion$ = this.catalogoService.listar({
        pagina: numPagina,
        tamano: tam,
        marca: this.filtroMarca || undefined,
        color: this.filtroColor || undefined,
        precioMinimo: this.precioMin || undefined,
        precioMaximo: this.precioMax || undefined,
        tipoCompatibilidad: this.compatibilidadTipo || undefined,
        modeloCompatibilidad: this.compatibilidadModelo || undefined,
      });
    }

    peticion$.subscribe({
      next: (resp) => {
        let items = resp.content || [];

        // 1. Filtrar visibilidad según el rol del usuario:
        if (this.authService.esAdmin()) {
          const despubMap = this.obtenerDespublicadosLocales();
          items = items.map((p) => {
            if (despubMap[p.id]) {
              return { ...p, estadoPublicacion: 'NO_PUBLICADO' };
            }
            return p;
          });
        } else {
          // Para CLIENTES / VISITANTES: los productos despublicados son estrictamente invisibles
          items = items.filter((p) => p.estadoPublicacion === 'PUBLICADO');
        }

        this.productos.set(items);
        this.pagina.set(resp.number ?? numPagina);
        this.totalPaginas.set(Math.max(1, resp.totalPages ?? 1));
        this.totalElementos.set(resp.totalElements ?? items.length);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        const mensaje = this.avisosService.traducirErrorHttp(
          err.status,
          err.error?.mensaje || err.message
        );
        this.error.set(mensaje);
      },
    });
  }

  cambiarPagina(num: number): void {
    if (num < 0 || num >= this.totalPaginas() || num === this.pagina()) return;
    this.cargarProductos(num);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  }

  cambiarTamano(nuevoTamano: number): void {
    this.tamano.set(nuevoTamano);
    this.cargarProductos(0);
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

  seleccionarMarca(marca: string): void {
    this.filtroMarca = this.filtroMarca === marca ? '' : marca;
    this.dropdownMarcasAbierto.set(false);
    this.cargarProductos(0);
  }

  seleccionarColor(color: string): void {
    this.filtroColor = this.filtroColor === color ? '' : color;
    this.dropdownColoresAbierto.set(false);
    this.cargarProductos(0);
  }

  aplicarFiltros(): void {
    this.cerrarDropdowns();
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
    this.cerrarDropdowns();
  }

  comprar(producto: ProductoResponse): void {
    this.carritoService.agregar(producto, 1);
    this.avisosService.exito(`¡"${producto.marca} ${producto.tipo}" agregado al carrito!`, 3000);
  }

  togglePublicacion(producto: ProductoResponse): void {
    if (producto.estadoPublicacion === 'PUBLICADO') {
      this.catalogoService.despublicar(producto.id).subscribe({
        next: () => {
          this.guardarDespublicadoLocal(producto);
          this.avisosService.info(`Producto "${producto.marca} ${producto.tipo}" despublicado (oculto para clientes).`);
          this.productos.update((lista) =>
            lista.map((p) => (p.id === producto.id ? { ...p, estadoPublicacion: 'NO_PUBLICADO' } : p))
          );
        },
        error: (err) => {
          const msg = this.avisosService.traducirErrorHttp(err.status, err.error?.mensaje);
          this.avisosService.error(msg);
        },
      });
    } else {
      this.catalogoService.publicar(producto.id).subscribe({
        next: () => {
          this.removerDespublicadoLocal(producto.id);
          this.avisosService.exito(`Producto "${producto.marca} ${producto.tipo}" vuelto a poner disponible en la tienda.`);
          this.productos.update((lista) =>
            lista.map((p) => (p.id === producto.id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p))
          );
        },
        error: (err) => {
          const msg = this.avisosService.traducirErrorHttp(err.status, err.error?.mensaje);
          this.avisosService.error(msg);
        },
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
        this.avisosService.exito(`Producto "${producto.marca} ${producto.tipo}" eliminado del catálogo.`);
        this.cargarProductos(this.pagina());
      },
      error: (err) => {
        this.cargando.set(false);
        const detalle = this.avisosService.traducirErrorHttp(err.status, err.error?.mensaje);
        this.avisosService.error(detalle);
      },
    });
  }

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

  abrirModalCrear(): void {
    this.inicializarFormulario();
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  onTipoProductoChange(): void {
    const tipo = this.productoForm.get('tipo')?.value;
    if (tipo === 'Casco') {
      this.productoForm.patchValue({
        talla: 'M',
        proteccion: 'NIVEL_3',
        material: 'POLICARBONATO',
        certificacionSeguridad: 'ECE 22.06',
      });
      this.seleccionarPreset('/productos/casco-agv-k3-negro.jpg');
    } else if (tipo === 'Chaqueta') {
      this.productoForm.patchValue({
        talla: 'L',
        proteccion: 'NIVEL_2',
        material: 'CUERO',
      });
      this.seleccionarPreset('/productos/chaqueta-alpinestars-cuero.jpg');
    } else if (tipo === 'Guantes') {
      this.productoForm.patchValue({
        talla: 'M',
        proteccion: 'NIVEL_2',
        material: 'CUERO',
      });
      this.seleccionarPreset('/productos/guantes-dainese-negro.jpg');
    } else if (tipo === 'Impermeable') {
      this.productoForm.patchValue({
        talla: 'L',
        material: 'PVC',
      });
      this.seleccionarPreset('/productos/impermeable-rainwear-azul.jpg');
    } else if (tipo === 'Baul') {
      this.productoForm.patchValue({
        material: 'ALUMINIO',
        capacidadLitros: 45,
        capacidadMaximaCarga: 10,
        dimensiones: '45x40x32 cm',
      });
      this.seleccionarPreset('/productos/baul-givi-negro.jpg');
    } else if (tipo === 'Intercomunicador') {
      this.productoForm.patchValue({
        alcanceMetros: 1200,
        autonomiaHoras: 13,
        bluetooth: true,
      });
      this.seleccionarPreset('/productos/intercomunicador-cardo-gris.jpg');
    } else if (tipo === 'SoporteCelular') {
      this.productoForm.patchValue({
        tipoSujecion: 'Manubrio',
      });
      this.seleccionarPreset('/productos/soporte-quadlock-negro.jpg');
    } else if (tipo === 'Visor') {
      this.productoForm.patchValue({
        tipoVisor: 'Transparente Antirrayas Pinlock Ready',
      });
      this.seleccionarPreset('/productos/visor-agv-transparente.jpg');
    }
  }

  seleccionarPreset(url: string): void {
    this.productoForm.patchValue({
      imagenUrl: url,
      previewImagen: url,
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const fileNameLower = file.name.toLowerCase();

      let url = '/productos/casco-agv-k3-negro.jpg';
      if (fileNameLower.includes('scorpion')) {
        url = '/productos/casco-scorpion-exo.jpg';
      } else if (fileNameLower.includes('agv') || fileNameLower.includes('k3')) {
        url = '/productos/casco-agv-k3-negro.jpg';
      } else if (fileNameLower.includes('ls2')) {
        url = '/productos/casco-ls2-blanco.jpg';
      } else if (fileNameLower.includes('alpinestar') || fileNameLower.includes('chaqueta')) {
        url = '/productos/chaqueta-alpinestars-cuero.jpg';
      } else if (fileNameLower.includes('guante') || fileNameLower.includes('dainese')) {
        url = '/productos/guantes-dainese-negro.jpg';
      } else if (fileNameLower.includes('impermeable')) {
        url = '/productos/impermeable-rainwear-azul.jpg';
      } else if (fileNameLower.includes('cardo') || fileNameLower.includes('intercom')) {
        url = '/productos/intercomunicador-cardo-gris.jpg';
      } else if (fileNameLower.includes('baul') || fileNameLower.includes('givi')) {
        url = '/productos/baul-givi-negro.jpg';
      } else if (fileNameLower.includes('soporte') || fileNameLower.includes('quad')) {
        url = '/productos/soporte-quadlock-negro.jpg';
      } else if (fileNameLower.includes('visor')) {
        url = '/productos/visor-agv-transparente.jpg';
      } else {
        url = this.obtenerPresetPorTipo(this.productoForm.get('tipo')?.value);
      }

      this.productoForm.patchValue({
        imagenUrl: url,
        previewImagen: url,
      });
    }
  }

  obtenerPresetPorTipo(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('casco')) return '/productos/casco-agv-k3-negro.jpg';
    if (t.includes('chaqueta')) return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (t.includes('guante')) return '/productos/guantes-dainese-negro.jpg';
    if (t.includes('impermeable')) return '/productos/impermeable-rainwear-azul.jpg';
    if (t.includes('baul')) return '/productos/baul-givi-negro.jpg';
    if (t.includes('intercom')) return '/productos/intercomunicador-cardo-gris.jpg';
    if (t.includes('soporte')) return '/productos/soporte-quadlock-negro.jpg';
    if (t.includes('visor')) return '/productos/visor-agv-transparente.jpg';
    return '/productos/casco-agv-k3-negro.jpg';
  }

  guardarNuevoProducto(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.avisosService.advertencia('Por favor completa los campos obligatorios del formulario.');
      return;
    }

    const p = this.productoForm.value;
    const marcaId = 'marca-' + p.marcaNombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const precioMoneda = 'COP';
    const imagenFinal = p.imagenUrl || p.previewImagen || this.obtenerPresetPorTipo(p.tipo);

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
        modelo: p.modelo?.trim() || 'Modelo Estándar',
        color: p.color.trim(),
        talla: p.talla || 'M',
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        proteccion: p.proteccion || 'NIVEL_3',
        certificacionSeguridad: p.certificacionSeguridad?.trim() || 'ECE 22.06',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Chaqueta') {
      obs = this.catalogoService.crearChaqueta({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla || 'L',
        material: p.material || 'CUERO',
        proteccion: p.proteccion || 'NIVEL_2',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Guantes') {
      obs = this.catalogoService.crearGuantes({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla || 'M',
        material: p.material || 'CUERO',
        proteccion: p.proteccion || 'NIVEL_2',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Impermeable') {
      obs = this.catalogoService.crearImpermeable({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla || 'L',
        material: p.material || 'PVC',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Baul') {
      obs = this.catalogoService.crearBaul({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        material: p.material || 'ALUMINIO',
        capacidadLitros: Number(p.capacidadLitros || 45),
        dimensiones: p.dimensiones?.trim() || '40x35x30 cm',
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        capacidadMaximaCarga: Number(p.capacidadMaximaCarga || 10),
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
        alcanceMetros: Math.round(Number(p.alcanceMetros || 1200)),
        autonomiaHoras: Math.round(Number(p.autonomiaHoras || 13)),
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
        tipoSujecion: p.tipoSujecion?.trim() || 'Manubrio',
        imagenUrl: imagenParaBackend,
      });
    } else {
      obs = this.catalogoService.crearVisor({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        tipoVisor: p.tipoVisor?.trim() || 'Transparente',
        modelosCascoCompatibles: ['AGV K3', 'AGV K1', 'LS2 Stream'],
        imagenUrl: imagenParaBackend,
      });
    }

    obs.subscribe({
      next: (creado) => {
        const imagenGuardada = p.imagenUrl || imagenFinal;
        this.imagenesService.guardarImagen(creado.id, imagenGuardada);

        // PUBLICACIÓN AUTOMÁTICA INMEDIATA en backend
        this.catalogoService.publicar(creado.id).subscribe({
          next: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.avisosService.exito(`¡Producto "${p.marcaNombre} ${p.tipo}" creado y disponible en catálogo!`);
            this.cargarProductos(0);
          },
          error: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.avisosService.exito(`¡Producto "${p.marcaNombre} ${p.tipo}" creado exitosamente!`);
            this.cargarProductos(0);
          },
        });
      },
      error: (err) => {
        this.guardandoProducto.set(false);
        const detalle = this.avisosService.traducirErrorHttp(
          err.status,
          err.error?.mensaje || err.error?.message || err.message
        );
        this.avisosService.error('Error al crear producto: ' + detalle);
      },
    });
  }
}
