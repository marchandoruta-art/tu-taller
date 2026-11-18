import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';

/** Devuelve `next` solo si es una ruta relativa de esta misma app. */
function destinoSeguro(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

/**
 * Entrar o registrarse. Con sesión abierta no tiene sentido verlo: se manda
 * al dashboard, o a `?next=` si venía de una pantalla concreta.
 * `?registro` abre directamente la pestaña de crear cuenta.
 */
export default function Entrar() {
  const { user, loading } = useAuth();
  const [parametros] = useSearchParams();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to={destinoSeguro(parametros.get('next'))} replace />;

  return <AuthForm pestanaInicial={parametros.has('registro') ? 'signup' : 'signin'} />;
}
