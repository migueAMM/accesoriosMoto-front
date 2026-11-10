import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  LoginRequest,
  RegistrarCompradorRequest,
  TokenResponse,
  UsuarioResponse,
  UsuarioSesion,
} from '../modelos/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/auth';
  private readonly tokenKey = 'accesorios_moto_token';
  private readonly userKey = 'accesorios_moto_user';

  private sesionSignal = signal<UsuarioSesion | null>(this.recuperarSesion());

  public sesion = computed(() => this.sesionSignal());
  public estaAutenticado = computed(() => !!this.sesionSignal()?.token);
  public esAdmin = computed(() => this.sesionSignal()?.rol === 'ADMINISTRADOR');
  public esComprador = computed(() => this.sesionSignal()?.rol === 'COMPRADOR');

  constructor(private http: HttpClient) {}

  login(credenciales: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credenciales).pipe(
      tap((resp) => {
        const sesion = this.construirSesion(resp.token, credenciales.correo);
        this.guardarSesion(sesion);
      })
    );
  }

  registro(datos: RegistrarCompradorRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/registro`, datos);
  }

  logout(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch {
      // Ignorar en caso de restricciones de almacenamiento
    }
    this.sesionSignal.set(null);
  }

  getToken(): string | null {
    const ses = this.sesionSignal();
    if (ses?.token && this.esTokenValido(ses.token)) {
      return ses.token;
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : null;
    if (token && this.esTokenValido(token)) {
      return token;
    }
    if (token) {
      this.logout();
    }
    return null;
  }

  getUsuarioActual(): UsuarioSesion | null {
    const ses = this.sesionSignal();
    if (ses && this.esTokenValido(ses.token)) {
      return ses;
    }
    return null;
  }

  esTokenValido(token?: string | null): boolean {
    if (!token || typeof token !== 'string') return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return true;
      // payload.exp está en segundos, se compara con Date.now() en ms
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private guardarSesion(sesion: UsuarioSesion): void {
    try {
      localStorage.setItem(this.tokenKey, sesion.token);
      localStorage.setItem(this.userKey, JSON.stringify(sesion));
    } catch {}
    this.sesionSignal.set(sesion);
  }

  private recuperarSesion(): UsuarioSesion | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const data = localStorage.getItem(this.userKey);
      if (!data) return null;
      const parsed = JSON.parse(data) as UsuarioSesion;
      if (!this.esTokenValido(parsed.token)) {
        this.logout();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private construirSesion(token: string, correoFallback: string): UsuarioSesion {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return {
        id: parsed.sub || '',
        correo: parsed.correo || correoFallback,
        rol: parsed.rol || '',
        token: token,
      };
    } catch {
      return {
        id: '',
        correo: correoFallback,
        rol: '',
        token: token,
      };
    }
  }
}
