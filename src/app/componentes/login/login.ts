import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth';
import { AvisosService } from '../../servicios/avisos';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  public authService = inject(AuthService);
  private router = inject(Router);
  private avisosService = inject(AvisosService);

  esModoRegistro = signal<boolean>(false);
  cargando = signal<boolean>(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  // Formulario Reactivo de Login (Sección 2.2 de la rúbrica)
  loginForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    contrasena: new FormControl('', [Validators.required, Validators.minLength(4)]),
  });

  // Formulario Reactivo de Registro de Comprador
  registroForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.minLength(3)]),
    correo: new FormControl('', [Validators.required, Validators.email]),
    contrasena: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  cambiarModo(registro: boolean): void {
    this.esModoRegistro.set(registro);
    this.error.set(null);
    this.mensaje.set(null);
  }

  llenarCredenciales(tipo: 'admin' | 'comprador'): void {
    this.esModoRegistro.set(false);
    this.error.set(null);
    if (tipo === 'admin') {
      this.loginForm.patchValue({
        correo: 'admin@accesoriosmoto.com',
        contrasena: 'Admin1234*',
      });
    } else {
      this.loginForm.patchValue({
        correo: 'comprador@accesoriosmoto.com',
        contrasena: 'Comprador1234*',
      });
    }
    this.loginForm.markAsDirty();
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Por favor completa los campos obligatorios con un formato válido.');
      return;
    }

    const { correo, contrasena } = this.loginForm.value;
    if (!correo || !contrasena) return;

    this.cargando.set(true);
    this.error.set(null);

    this.authService
      .login({
        correo: correo.trim(),
        contrasena,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          const rol = this.authService.sesion()?.rol || 'USUARIO';
          const exitoMsg = `¡Bienvenido! Sesión iniciada como ${rol}.`;
          this.mensaje.set(exitoMsg);
          this.avisosService.exito(exitoMsg);

          setTimeout(() => {
            this.router.navigate(['/catalogo']);
          }, 800);
        },
        error: (err) => {
          this.cargando.set(false);
          const mensajeError =
            err.status === 401 || err.status === 403
              ? 'Correo o contraseña incorrectos. Revisa tus credenciales.'
              : this.avisosService.traducirErrorHttp(
                  err.status,
                  'Credenciales inválidas o error de conexión con el backend.'
                );
          this.error.set(mensajeError);
          this.avisosService.error(mensajeError);
        },
      });
  }

  registrar(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      this.error.set('Por favor completa todos los campos con los requerimientos mínimos.');
      return;
    }

    const { nombre, correo, contrasena } = this.registroForm.value;
    if (!nombre || !correo || !contrasena) return;

    this.cargando.set(true);
    this.error.set(null);

    this.authService
      .registro({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
      })
      .subscribe({
        next: (usuario) => {
          const nombreMostrado = usuario?.nombre || nombre || 'comprador';
          const regMsg = `¡Cuenta de "${nombreMostrado}" creada con éxito! Iniciando sesión...`;
          this.mensaje.set(regMsg);
          this.avisosService.exito(regMsg);

          // Inicio de sesión automático y persistencia en localStorage
          this.authService
            .login({
              correo: correo.trim(),
              contrasena,
            })
            .subscribe({
              next: () => {
                this.cargando.set(false);
                setTimeout(() => {
                  this.router.navigate(['/catalogo']);
                }, 900);
              },
              error: () => {
                this.cargando.set(false);
                this.esModoRegistro.set(false);
                this.loginForm.patchValue({ correo, contrasena });
              },
            });
        },
        error: (err) => {
          this.cargando.set(false);
          const msg = this.avisosService.traducirErrorHttp(
            err.status,
            'Error al registrar el comprador. Verifica que el correo no esté ya registrado.'
          );
          this.error.set(msg);
          this.avisosService.error(msg);
        },
      });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.mensaje.set('Sesión finalizada.');
    this.avisosService.info('Has cerrado sesión correctamente.');
  }
}
