import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  public authService = inject(AuthService);
  private router = inject(Router);

  esModoRegistro = signal<boolean>(false);
  cargando = signal<boolean>(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  // Campos de Login
  loginCorreo = '';
  loginClave = '';

  // Campos de Registro
  registroNombre = '';
  registroCorreo = '';
  registroClave = '';

  cambiarModo(registro: boolean): void {
    this.esModoRegistro.set(registro);
    this.error.set(null);
    this.mensaje.set(null);
  }

  iniciarSesion(): void {
    if (!this.loginCorreo || !this.loginClave) {
      this.error.set('Por favor completa todos los campos.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.authService
      .login({
        correo: this.loginCorreo,
        contrasena: this.loginClave,
      })
      .subscribe({
        next: (resp) => {
          this.cargando.set(false);
          this.mensaje.set('¡Inicio de sesión exitoso!');
          setTimeout(() => {
            this.router.navigate(['/catalogo']);
          }, 1000);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(
            err.error?.error ||
              err.error?.message ||
              'Credenciales inválidas o error de conexión con el backend'
          );
        },
      });
  }

  registrar(): void {
    if (!this.registroNombre || !this.registroCorreo || !this.registroClave) {
      this.error.set('Por favor completa todos los campos.');
      return;
    }

    if (this.registroClave.length < 8) {
      this.error.set('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.authService
      .registro({
        nombre: this.registroNombre,
        correo: this.registroCorreo,
        contrasena: this.registroClave,
      })
      .subscribe({
        next: (usuario) => {
          this.cargando.set(false);
          this.mensaje.set(
            `¡Usuario ${usuario.nombre} registrado con éxito! Ahora puedes iniciar sesión.`
          );
          this.loginCorreo = this.registroCorreo;
          this.loginClave = this.registroClave;
          this.esModoRegistro.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(
            err.error?.message || 'Error al registrar el comprador en el sistema.'
          );
        },
      });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.mensaje.set('Sesión finalizada.');
  }
}
