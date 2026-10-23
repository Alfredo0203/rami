import React from 'react';

/**
 * Última red de seguridad de la app.
 *
 * Si algo falla mientras se dibuja una pantalla, React desmonta todo el árbol y
 * deja la página en blanco. Con esta barrera, en vez de una pantalla vacía se
 * muestra un aviso con lo que falló y un botón para recargar, así la app nunca
 * se queda inservible.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder revisarlo
    console.error('App render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const detail = String(this.state.error?.message || this.state.error || 'Error desconocido');

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-bold text-foreground">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          La página se detuvo antes de terminar de cargar. Recarga para continuar.
        </p>
        <code className="text-[11px] leading-relaxed text-destructive bg-destructive/10 rounded-lg px-3 py-2 max-w-sm break-words">
          {detail}
        </code>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold"
        >
          Recargar
        </button>
      </div>
    );
  }
}