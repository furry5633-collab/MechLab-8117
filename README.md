# MechLab Simulator

Simulador 3D de ingeniería, electrónica, mecánica, robótica y automatización.
Construye máquinas virtualmente, conéctalas, prográmalas y pulsa **Play** para
comprobar si funcionan antes de comprar materiales.

## Cómo usar

1. **Biblioteca (izquierda):** despliega una categoría y toca/arrastra un
   componente para añadirlo al visor 3D.
2. **Visor 3D (centro):** selecciona, mueve, gira y escala piezas con los
   botones "Mover/Girar/Escalar". Cambia de vista (Iso/Sup./Front./Lat.),
   activa/desactiva rejilla, ejes y modo alambre.
3. **Conexiones:** haz clic en un puerto de color (del objeto 3D o desde el
   panel de "Puertos y conexiones") y luego en el puerto destino para crear un
   cable. Pulsa "✓ Validar" para detectar errores (cortocircuitos, motores sin
   driver, voltajes incompatibles, sensores sueltos...), con explicación y
   solución para cada uno.
4. **Código (pestaña superior del centro):** programa en C/C++ (Arduino),
   MicroPython/Python o con bloques visuales. Autocompletado con Ctrl+Espacio,
   comprobación de errores en vivo y ejemplos precargados.
5. **Play / Pausa / Reiniciar / Velocidad:** ejecuta tu programa real contra
   los componentes conectados: los sensores (panel de propiedades) alimentan
   `digitalRead`/`analogRead`, y tu código mueve motores, LEDs, etc. en
   tiempo real dentro del visor 3D.
6. **Consola inferior:** pestañas de Consola, Errores (con badge) y Monitor
   serie (`Serial.println`).
7. **Tema claro/oscuro** y diseño adaptable a móvil, tablet y ordenador
   (menús desplegables en pantallas pequeñas).

## Ejecutar localmente

```
cd mechlab
python3 -m http.server 8080
```

Abre `http://localhost:8080` en el navegador (requiere conexión a internet
para cargar Three.js y CodeMirror desde CDN).

## Estructura

- `index.html` — estructura de la interfaz.
- `css/style.css` — estilos y diseño responsive (variables para tema claro/oscuro).
- `js/data.js` — biblioteca de componentes (materiales, mecánica, motores,
  electrónica, chips con ficha técnica, cables, sensores, neumática/hidráulica,
  comunicación industrial).
- `js/scene3d.js` — visor 3D con Three.js (instancias, puertos, cables, cámara).
- `js/simulation.js` — bus de pines, transpiladores C++/Python → JS,
  ejecución cooperativa (generadores) y validación de errores de circuito.
- `js/blocks.js` — editor de bloques visual para principiantes.
- `js/examples.js` — ejemplos de código precargados.
- `js/main.js` — orquestador: UI, eventos, bucle de simulación.
