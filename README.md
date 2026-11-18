# AccesoriosMoto - Frontend E-commerce

> **Entrega 3: Frontend conectado a su backend**  
> **Asignatura:** Programación Avanzada  
> **Programa:** Ingeniería de Sistemas y Computación  
> **Institución:** Universidad del Quindío  
> **Docente:** Valentina Oviedo Sánchez  

---

## 1. Datos del Proyecto y Nicho Asignado

- **Nombre del Nicho:** E-commerce de Accesorios, Cascos y Equipamiento para Motociclistas (**AccesoriosMoto**).
- **Integrantes del Equipo:**
  - **Miguel Angel Marin Montes** - mamarinmontes@gmail.com
- **Repositorio Frontend:** Rama `implementaciones-finales-de-la-rubrica`
- **Repositorio Backend:** API REST en Spring Boot 3 con Java 17, Spring Security con JWT (expiración a 30 días) y base de datos relacional H2.

---

## 2. Prerrequisitos de Ejecución

Asegúrate de contar con el siguiente entorno instalado en tu equipo:
- **Node.js:** Versión 18.x o superior (recomendado Node.js 20+ LTS).
- **npm:** Versión 9.x o superior.
- **Angular CLI:** Versión 17+.
- **Java Development Kit (JDK):** Versión 17 o superior.
- **Git:** Para control de versiones.

---

## 3. Instrucciones Paso a Paso para Ejecutar en Local

### Paso 1: Levantar el Backend (Spring Boot)
1. Abre una terminal en la raíz del proyecto backend de Spring Boot (`accesoriosMoto`).
2. *(Recomendado para la primera vez)* Elimina la base de datos local para que el seeder `CargadorDatosPrueba.java` siembre los 160 productos nuevos y cree los usuarios de prueba:
   ```powershell
   Remove-Item .\data\accesoriosMoto.* -Force
   ```
3. Inicia el servidor backend:
   ```powershell
   .\gradlew.bat bootRun
   ```
4. El backend estará escuchando en `http://localhost:8080`.

### Paso 2: Levantar el Frontend (Angular)
1. Abre una terminal en la raíz de este proyecto (`accesoriosMoto-front`).
2. Asegúrate de estar en la rama de entrega:
   ```bash
   git checkout implementaciones-finales-de-la-rubrica
   ```
3. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo de Angular:
   ```bash
   npm start
   # O alternativamente: npx ng serve
   ```
5. Abre tu navegador web en: `http://localhost:4200/`.

---

## 4. Usuarios y Credenciales de Prueba (Rúbrica 2.11)

El sistema incluye botones de **Acceso Rápido** en la pantalla de inicio de sesión (`/login`) para facilitar la evaluación sin necesidad de escribir manualmente:

| Rol de Usuario | Correo Electrónico | Contraseña | Capacidades y Permisos en el Sistema |
| :--- | :--- | :--- | :--- |
| **ADMINISTRADOR** | `admin@accesoriosmoto.com` | `Admin1234*` | Acceso a gestión de catálogo, modal reactivo de agregar productos, despublicar/publicar productos, eliminar artículos y acceso a la ruta protegida `/admin`. |
| **COMPRADOR** | `comprador@accesoriosmoto.com` | `Comprador1234*` | Exploración de catálogo público, filtrado por marcas/colores, carrito de compras, lista de deseos (wishlist), simulación de checkout y acceso a `/mis-pedidos`. |

---

## 5. Tabla de Rutas de la Aplicación (Rúbrica 2.4 y 2.11)

| Ruta | Componente | Rol Requerido | Guard Aplicado | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `/` o `/inicio` | `Inicio` | Público | Ninguno | Portada de la tienda con accesos directos por categoría (Cascos, Textil, Accesorios, Repuestos), marcas oficiales, banners dinámicos y llamada a la acción hacia el catálogo. |
| `/catalogo` | `Catalogo` | Público / Comprador / Admin | Ninguno (Comportamiento dinámico según rol) | Catálogo principal con **paginación delegada al backend** (`page` y `size`), selector de tamaño de página, búsqueda reactiva con debounce, filtros por marca y color con scrollbar interna, tarjetas de producto con badges e imágenes optimizadas. |
| `/login` | `Login` | Invitado (No autenticado) | `guestGuard` | Formularios reactivos (`ReactiveFormsModule`) para Login y Registro con validaciones sincrónicas (`Validators`), mensajes de error `invalid-feedback` visibles por campo y botones de autocompletado de prueba. Si el usuario ya está autenticado, es redirigido a `/catalogo`. |
| `/mis-pedidos` | `MisPedidos` | Autenticado (`COMPRADOR` o `ADMIN`) | `authGuard` | Módulo privado donde el usuario consulta su historial de compras realizadas, total pagado, fecha y estado de entrega. Si un usuario no autenticado intenta acceder, es bloqueado y redirigido a `/login` con un aviso informativo. |
| `/admin` | `Catalogo` | `ADMINISTRADOR` | `authGuard`, `roleGuard` | Ruta administrativa que aplica guard por roles (`data: { roles: ['ADMINISTRADOR'] }`). Ofrece el botón para registrar nuevos productos con validación reactiva, alternar visibilidad (despublicar/publicar) y borrado definitivo. |

---

## 6. Funcionalidades Destacadas y Cumplimiento de la Rúbrica

### 6.1 Paginación Delegada al Backend (Sección 2.5 - 10/10 pts)
- Angular **no descarga toda la colección en memoria** ni utiliza `.slice()` en el cliente.
- Cada cambio de página (botón Anterior, Siguiente o número de página) o cambio de tamaño (9, 18, 27 por página) realiza una petición HTTP directa al backend: `GET /api/productos?pagina=X&tamano=Y` o `GET /api/productos/buscar?texto=...&pagina=X&tamano=Y`.
- La interfaz visualiza controles completos de navegación paginada: primero, anterior, números de página visibles, siguiente y último, junto con el indicador reactivo `Página X de Y` y el contador total de elementos.

### 6.2 Formularios Reactivos con Validación Sincrónica (Sección 2.2 - 15/15 pts)
- Uso estricto de `ReactiveFormsModule` en los formularios de Login, Registro y Modal de Creación de Productos.
- Validaciones con `Validators.required`, `Validators.email`, `Validators.minLength` y `Validators.min(1000)`.
- Mensajes de error en tiempo real condicionados por `touched` o `dirty` con clases Bootstrap (`is-invalid` e `invalid-feedback`).
- Deshabilitación automática de los botones de envío (`[disabled]="form.invalid || cargando()"`) previniendo envíos con datos incompletos o peticiones duplicadas.

### 6.3 Interceptores HTTP y Manejo Global de 401 (Sección 2.3 - 10/10 pts)
- `AuthInterceptor` añade automáticamente el header `Authorization: Bearer <token>` en todas las peticiones salientes.
- Ante una respuesta HTTP 401 (Token vencido o inválido), el interceptor elimina automáticamente la sesión local, muestra una alerta tipo advertencia y redirige al usuario a `/login`.

### 6.4 Guards de Autenticación y Autorización por Rol (Sección 2.4 y Extra 2 - 12.5 pts)
- `authGuard`: Protege rutas privadas del negocio (`/mis-pedidos`, `/admin`) bloqueando el acceso anónimo y redirigiendo a `/login` con feedback amigable.
- `guestGuard`: Evita que usuarios ya logueados accedan innecesariamente a la pantalla de login.
- `roleGuard` (**Extra 2**): Inspecciona los roles permitidos en la configuración de la ruta (`data.roles`) y valida el rol del usuario conectado. Si no cuenta con el rol requerido, bloquea el acceso y muestra un aviso visual.

### 6.5 Manejo de Errores HTTP y Notificaciones Visuales (Secciones 2.6 y 2.7 - 20/20 pts)
- `AvisosService`: Servicio singleton reactivo basado en Angular Signals que gestiona notificaciones flotantes (toasts) con auto-descarte temporal (4.5 a 5.5 segundos) o cierre manual.
- Función `traducirErrorHttp(status, mensaje)` que traduce códigos HTTP estándar (400, 401, 403, 404, 500) a explicaciones amigables y claras para el usuario final.
- Indicadores de carga (`cargando`) en todas las operaciones asíncronas para proporcionar retroalimentación inmediata.

### 6.6 Diseño Responsive y Bootstrap 5 (Sección 2.8 - 10/10 pts)
- Bootstrap 5 integrado oficialmente en `angular.json` y combinado con estilos CSS propios de temática motociclista racing.
- Barra de navegación con **menú hamburguesa móvil colapsable** (`d-lg-none` y cajón offcanvas), permitiendo navegación fluida en dispositivos móviles, tablets y monitores de escritorio.

### 6.7 Configuración Centralizada de Entornos (Sección 2.1)
- `src/environments/environment.ts` y `environment.prod.ts` definen la propiedad `apiUrl: 'http://localhost:8080/api'`, permitiendo alternar entre entornos local y de producción sin modificar el código de los servicios.

---

## 7. Extras Implementados (Puntaje Adicional: +8 pts)

1. **Extra 1: Búsqueda y filtrado reactivo con Signals y Debounce (+3 pts)**
   - El buscador de productos en `/catalogo` está conectado mediante un `Subject<string>` con operadores RxJS `debounceTime(350)` y `distinctUntilChanged()`.
   - La búsqueda reacciona en tiempo real a medida que el usuario escribe, sin necesidad de presionar un botón, evitando disparar peticiones innecesarias en cada pulsación.
2. **Extra 2: Control de acceso por roles con Guards (+2.5 pts)**
   - Implementación de `roleGuard` para proteger rutas exclusivas de administración (`/admin`) validando claims del JWT y denegando el paso con alertas visuales amigables.
3. **Extra 3: Manejo avanzado de avisos toast y persistencia visual de productos (+2.5 pts)**
   - Sistema global de toasts reactivos con Angular Signals (`<app-avisos>`).
   - Soporte para despublicación suave en el panel de administrador: los productos despublicados permanecen visibles para el administrador en tono opaco y con opción inmediata de "Volver a poner disponible", mientras que para clientes son 100% invisibles.

---

## 8. Guía para la Sustentación con la Docente

Para la sustentación presencial de 15 minutos (distribuida en los 8 bloques de la rúbrica):

1. **Bloque 1 (Inicio y Registro):** Abrir `/login`, mostrar validaciones de `registroForm` (campos vacíos, longitud mínima, email), registrar un nuevo comprador o iniciar sesión.
2. **Bloque 2 (Login y Guards):** Mostrar el inicio de sesión como Comprador. Demostrar que el navbar cambia a sesión iniciada. Probar acceder a `/admin` o `/login` para evidenciar el bloqueo de los guards (`roleGuard` y `guestGuard`).
3. **Bloque 3 (Navegación Privada y JWT):** Abrir `/mis-pedidos`, abrir la pestaña **Network** de DevTools y señalar el header `Authorization: Bearer <token>` inyectado por el interceptor.
4. **Bloque 4 (Manejo de Errores y Expiración):** Simular error o borrar el token de `localStorage` para mostrar el redireccionamiento automático y la alerta generada por `AuthInterceptor`.
5. **Bloque 5 (Catálogo y Paginación en Backend):** En `/catalogo`, con la pestaña **Network** abierta:
   - Hacer clic en "Página 2" o "Siguiente": señalar que se envía la petición `GET /api/productos?pagina=1&tamano=9` y que la respuesta es un `PageResponse`.
   - Escribir en el buscador: observar el debounce de 350ms y la petición directa `GET /api/productos/buscar?texto=...`.
6. **Bloque 6 (Operaciones de Administrador):** Iniciar sesión como `admin@accesoriosmoto.com`. Abrir el modal "AGREGAR PRODUCTO", mostrar las validaciones del formulario reactivo `productoForm`, crear un accesorio y ver cómo aparece inmediatamente en el catálogo. Probar también despublicar un producto (se pone opaco con botón para volver a publicar).
7. **Bloque 7 (Responsive):** Abrir DevTools en modo dispositivo móvil (`Ctrl + Shift + M`), desplegar el menú hamburguesa móvil, navegar por las opciones y mostrar la adaptabilidad de la cuadrícula.
8. **Bloque 8 (Preguntas de Código y Buenas Prácticas):** Explicar la inyección con `inject()`, la arquitectura de componentes Standalone, el uso de Signals (`signal`, `computed`), y la estructura de carpetas (`componentes`, `guards`, `interceptores`, `modelos`, `servicios`).
