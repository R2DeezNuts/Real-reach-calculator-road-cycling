# Contribuir a Real Reach

Los cambios deben ayudar a comparar montajes con claridad. Mantén las dependencias de ejecución web en cero y explica cualquier ampliación del modelo antes de implementarla.

## Antes de enviar un cambio

1. Usa un servidor estático local como indica el README.
2. Ejecuta `node --test` y `python -m unittest discover -s tests -p "test_*.py" -v`.
3. Si cambia la geometría, añade un caso con un resultado analítico en `tests/fixtures/geometry.json`. Ambas implementaciones deben coincidir.
4. Si cambia el estado guardado o compartido, conserva la compatibilidad o introduce una versión explícita. No aceptes entradas sin validarlas.
5. Si cambia la interfaz, revisa escritorio y 390 px, navegación con Tab, zoom al 200 % y movimiento reducido.

## Comprobación manual de interfaz

- Modifica cada medida: el diagrama, la tabla y los deltas deben actualizarse juntos.
- Deja un número vacío o fuera de rango: debe aparecer un error y bloquearse compartir/exportar. Corrígelo y verifica que se recupera.
- Duplica hasta cuatro montajes, renombra con caracteres acentuados y cambia de referencia. El montaje de referencia debe tener delta cero.
- Elimina un montaje de referencia: otro montaje debe asumir la referencia. No debe poder eliminarse el último.
- Recarga y verifica el guardado. Abre un enlace compartido y comprueba todos sus datos.
- Abre un enlace mal formado: no debe ejecutar contenido ni romper la calculadora.
- Exporta CSV y SVG; comprueba que se descargan, incluyen los montajes y que los nombres se conservan como texto.
- Abre la ayuda, recórrela con teclado y ciérrala con Escape. Comprueba que el foco vuelve al botón.
- En móvil, comprueba que la página no se desborda horizontalmente. La tabla puede desplazarse dentro de su contenedor.

## Pull requests

Explica el problema, el comportamiento final y cómo lo has verificado. Adjunta una captura si cambia la UI. No incluyas `__pycache__`, entornos virtuales, capturas temporales ni artefactos generados por pruebas.
