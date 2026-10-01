// ============================================================================
// MechLab Simulator — Biblioteca de componentes
// ============================================================================
// Cada item define: id, name, desc, shape3d, color, size, ports[], specs{}
// ports[]: {id, type, offset:[x,y,z], label}
// type ∈ mechanical | electrical | digital | analog | power | comm | pneumatic | hydraulic

const PORT_COLORS = {
  mechanical: '#9aa0a6',
  electrical: '#ff8a00',
  digital: '#3b82f6',
  analog: '#06b6d4',
  power: '#ff8a00',
  comm: '#a855f7',
  pneumatic: '#10b981',
  hydraulic: '#2563eb',
  ok: '#22c55e',
  warn: '#eab308',
  error: '#ef4444'
};

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

// ---------------------------------------------------------------------------
// MATERIALES Y ESTRUCTURAS
// ---------------------------------------------------------------------------
const MATERIALES = [
  { id: 'mat_acero', name: 'Acero', desc: 'Material estructural de alta resistencia, denso y rígido.', shape: 'box', color: '#8a8f98', size: [1, 0.2, 1], density: 7850, ports: [] },
  { id: 'mat_aluminio', name: 'Aluminio', desc: 'Ligero, buena relación resistencia/peso, usado en chasis.', shape: 'box', color: '#c7ccd1', size: [1, 0.2, 1], density: 2700, ports: [] },
  { id: 'mat_titanio', name: 'Titanio', desc: 'Muy resistente, ligero y resistente a la corrosión. Caro.', shape: 'box', color: '#9b9b93', size: [1, 0.2, 1], density: 4500, ports: [] },
  { id: 'mat_cobre', name: 'Cobre', desc: 'Excelente conductor eléctrico y térmico. Usado en cables y bobinas.', shape: 'box', color: '#b5651d', size: [1, 0.2, 1], density: 8960, ports: [] },
  { id: 'mat_laton', name: 'Latón', desc: 'Aleación de cobre y zinc, fácil mecanizado, usado en racores.', shape: 'box', color: '#d4af37', size: [1, 0.2, 1], density: 8500, ports: [] },
  { id: 'mat_plastico', name: 'Plástico (ABS/PLA)', desc: 'Ligero, aislante eléctrico, ideal para carcasas e impresión 3D.', shape: 'box', color: '#e8e8e8', size: [1, 0.2, 1], density: 1050, ports: [] },
  { id: 'mat_goma', name: 'Goma / Caucho', desc: 'Elástico, amortigua vibraciones, usado en juntas y neumáticos.', shape: 'box', color: '#222426', size: [1, 0.2, 1], density: 1200, ports: [] },
  { id: 'mat_madera', name: 'Madera', desc: 'Económica y fácil de trabajar, poca resistencia a humedad.', shape: 'box', color: '#8b5a2b', size: [1, 0.2, 1], density: 600, ports: [] },
  { id: 'mat_fibra_carbono', name: 'Fibra de carbono', desc: 'Extremadamente rígida y ligera, usada en drones y robótica de competición.', shape: 'box', color: '#1c1c1f', size: [1, 0.2, 1], density: 1600, ports: [] },
  { id: 'mat_ceramica', name: 'Cerámica', desc: 'Resistente al calor y al desgaste, frágil ante impactos.', shape: 'box', color: '#f1e9da', size: [1, 0.2, 1], density: 3900, ports: [] },
];

const ESTRUCTURAS = [
  { id: 'est_chasis', name: 'Chasis', desc: 'Estructura base que soporta todos los componentes de la máquina.', shape: 'chassis', color: '#6b7280', size: [2, 0.3, 1.2], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0.15, 0], label: 'Fijación' }] },
  { id: 'est_placa', name: 'Placa de montaje', desc: 'Placa plana perforada para fijar componentes.', shape: 'box', color: '#9ca3af', size: [1, 0.05, 1], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0.025, 0], label: 'Fijación' }] },
  { id: 'est_perfil', name: 'Perfil estructural', desc: 'Perfil de aluminio tipo ranurado (20x20) para bastidores modulares.', shape: 'beam', color: '#b0b6bd', size: [1.2, 0.08, 0.08], ports: [{ id: 'a', type: 'mechanical', offset: [-0.6, 0, 0], label: 'Extremo A' }, { id: 'b', type: 'mechanical', offset: [0.6, 0, 0], label: 'Extremo B' }] },
  { id: 'est_soporte', name: 'Soporte / Bracket', desc: 'Pieza en L para unir perfiles o fijar motores.', shape: 'bracket', color: '#a1a1aa', size: [0.3, 0.3, 0.1], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Fijación' }] },
  { id: 'est_carcasa', name: 'Carcasa / Housing', desc: 'Cubierta protectora para electrónica o mecanismos.', shape: 'box', color: '#374151', size: [0.6, 0.4, 0.6], ports: [{ id: 'm1', type: 'mechanical', offset: [0, -0.2, 0], label: 'Base' }] },
  { id: 'est_pieza', name: 'Pieza estructural genérica', desc: 'Pieza personalizable para diseños a medida.', shape: 'box', color: '#8a8f98', size: [0.4, 0.4, 0.4], ports: [{ id: 'm1', type: 'mechanical', offset: [0, -0.2, 0], label: 'Fijación' }] },
];

// ---------------------------------------------------------------------------
// PIEZAS MECÁNICAS
// ---------------------------------------------------------------------------
const MECANICA = [
  { id: 'mec_tornillo', name: 'Tornillo', desc: 'Elemento de fijación roscado.', shape: 'cylinder', color: '#71717a', size: [0.05, 0.2, 0.05], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0.1, 0], label: 'Cabeza' }] },
  { id: 'mec_tuerca', name: 'Tuerca', desc: 'Fija tornillos y ejes roscados.', shape: 'hex', color: '#71717a', size: [0.12, 0.08, 0.12], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Rosca' }] },
  { id: 'mec_eje', name: 'Eje', desc: 'Transmite rotación entre componentes mecánicos.', shape: 'cylinder', color: '#9ca3af', size: [0.06, 1, 0.06], ports: [{ id: 'a', type: 'mechanical', offset: [0, 0.5, 0], label: 'Extremo A' }, { id: 'b', type: 'mechanical', offset: [0, -0.5, 0], label: 'Extremo B' }] },
  { id: 'mec_rodamiento', name: 'Rodamiento', desc: 'Reduce la fricción en elementos rotativos.', shape: 'torus', color: '#52525b', size: [0.15, 0.04, 0.15], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Eje' }] },
  { id: 'mec_engranaje', name: 'Engranaje', desc: 'Transmite movimiento y par entre ejes mediante dientes.', shape: 'gear', color: '#a1a1aa', size: [0.4, 0.08, 0.4], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Eje' }] },
  { id: 'mec_polea', name: 'Polea', desc: 'Transmite movimiento mediante correas.', shape: 'cylinder', color: '#8a8f98', size: [0.3, 0.1, 0.3], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Eje' }] },
  { id: 'mec_correa', name: 'Correa', desc: 'Conecta poleas para transmitir movimiento.', shape: 'belt', color: '#1f2937', size: [1, 0.05, 0.05], ports: [{ id: 'a', type: 'mechanical', offset: [-0.5, 0, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0.5, 0, 0], label: 'B' }] },
  { id: 'mec_cadena', name: 'Cadena', desc: 'Transmite potencia entre ruedas dentadas (piñones).', shape: 'belt', color: '#3f3f46', size: [1, 0.05, 0.05], ports: [{ id: 'a', type: 'mechanical', offset: [-0.5, 0, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0.5, 0, 0], label: 'B' }] },
  { id: 'mec_resorte', name: 'Resorte', desc: 'Almacena energía mecánica y amortigua.', shape: 'spring', color: '#9ca3af', size: [0.1, 0.4, 0.1], ports: [{ id: 'a', type: 'mechanical', offset: [0, 0.2, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0, -0.2, 0], label: 'B' }] },
  { id: 'mec_guia', name: 'Guía lineal', desc: 'Permite desplazamiento lineal preciso.', shape: 'beam', color: '#9ca3af', size: [1, 0.06, 0.06], ports: [{ id: 'a', type: 'mechanical', offset: [-0.5, 0, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0.5, 0, 0], label: 'B' }] },
  { id: 'mec_husillo', name: 'Husillo', desc: 'Convierte rotación en movimiento lineal (husillo de bolas).', shape: 'cylinder', color: '#b0b6bd', size: [0.05, 1, 0.05], ports: [{ id: 'a', type: 'mechanical', offset: [0, 0.5, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0, -0.5, 0], label: 'B' }] },
  { id: 'mec_bisagra', name: 'Bisagra', desc: 'Permite rotación entre dos piezas unidas.', shape: 'hinge', color: '#71717a', size: [0.3, 0.1, 0.1], ports: [{ id: 'a', type: 'mechanical', offset: [-0.15, 0, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0.15, 0, 0], label: 'B' }] },
  { id: 'mec_leva', name: 'Leva', desc: 'Convierte rotación en movimiento alterno.', shape: 'cam', color: '#9ca3af', size: [0.3, 0.1, 0.3], ports: [{ id: 'm1', type: 'mechanical', offset: [0, 0, 0], label: 'Eje' }] },
  { id: 'mec_biela', name: 'Biela', desc: 'Transforma movimiento rotativo en lineal (mecanismo biela-manivela).', shape: 'beam', color: '#8a8f98', size: [0.6, 0.05, 0.05], ports: [{ id: 'a', type: 'mechanical', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'mec_acoplamiento', name: 'Acoplamiento', desc: 'Une dos ejes para transmitir rotación.', shape: 'cylinder', color: '#52525b', size: [0.1, 0.15, 0.1], ports: [{ id: 'a', type: 'mechanical', offset: [0, 0.075, 0], label: 'A' }, { id: 'b', type: 'mechanical', offset: [0, -0.075, 0], label: 'B' }] },
];

// ---------------------------------------------------------------------------
// MOTORES Y ACTUADORES
// ---------------------------------------------------------------------------
const MOTORES = [
  { id: 'mot_dc', name: 'Motor DC', desc: 'Motor de corriente continua, velocidad proporcional al voltaje.', shape: 'motor', color: '#2563eb', size: [0.2, 0.3, 0.2], electrical: { voltage: '3-12V', current: '0.2-2A' }, ports: [
      { id: 'power+', type: 'power', offset: [0.12, 0.1, 0], label: 'V+' },
      { id: 'power-', type: 'power', offset: [0.12, -0.1, 0], label: 'V-' },
      { id: 'shaft', type: 'mechanical', offset: [0, 0.2, 0], label: 'Eje' },
    ] },
  { id: 'mot_ac', name: 'Motor AC', desc: 'Motor de corriente alterna, usado en aplicaciones industriales de potencia.', shape: 'motor', color: '#1d4ed8', size: [0.25, 0.35, 0.25], electrical: { voltage: '110-400V AC', current: '1-20A' }, ports: [
      { id: 'power', type: 'power', offset: [0.14, 0.15, 0], label: 'L/N' },
      { id: 'shaft', type: 'mechanical', offset: [0, 0.22, 0], label: 'Eje' },
    ] },
  { id: 'mot_paso', name: 'Motor paso a paso', desc: 'Motor de posicionamiento preciso por pasos (NEMA17 típico).', shape: 'stepper', color: '#334155', size: [0.2, 0.2, 0.2], electrical: { voltage: '5-24V', current: '0.5-2A' }, ports: [
      { id: 'coilA', type: 'power', offset: [0.1, 0.05, 0.1], label: 'Bobina A' },
      { id: 'coilB', type: 'power', offset: [0.1, -0.05, 0.1], label: 'Bobina B' },
      { id: 'shaft', type: 'mechanical', offset: [0, 0.12, 0], label: 'Eje' },
    ] },
  { id: 'mot_servo', name: 'Servomotor', desc: 'Motor con control de posición angular mediante señal PWM.', shape: 'servo', color: '#0ea5e9', size: [0.2, 0.15, 0.1], electrical: { voltage: '4.8-6V', current: '0.1-1A' }, ports: [
      { id: 'pwm', type: 'digital', offset: [0.1, 0, 0.05], label: 'PWM' },
      { id: 'power+', type: 'power', offset: [0.1, 0, -0.05], label: 'V+' },
      { id: 'power-', type: 'power', offset: [0.1, 0, 0], label: 'GND' },
      { id: 'shaft', type: 'mechanical', offset: [0, 0.08, 0], label: 'Eje' },
    ] },
  { id: 'mot_brushless', name: 'Motor Brushless (BLDC)', desc: 'Motor sin escobillas, alta eficiencia, requiere ESC.', shape: 'motor', color: '#0f172a', size: [0.22, 0.22, 0.22], electrical: { voltage: '7-48V', current: '2-40A' }, ports: [
      { id: 'phaseA', type: 'power', offset: [0.11, 0.05, 0], label: 'Fase A' },
      { id: 'phaseB', type: 'power', offset: [0.11, 0, 0], label: 'Fase B' },
      { id: 'phaseC', type: 'power', offset: [0.11, -0.05, 0], label: 'Fase C' },
      { id: 'shaft', type: 'mechanical', offset: [0, 0.12, 0], label: 'Eje' },
    ] },
  { id: 'mot_reductor', name: 'Motorreductor', desc: 'Motor DC con caja reductora para más par y menos velocidad.', shape: 'gearmotor', color: '#1e3a8a', size: [0.25, 0.2, 0.2], electrical: { voltage: '6-24V', current: '0.3-3A' }, ports: [
      { id: 'power+', type: 'power', offset: [0.12, 0.05, 0], label: 'V+' },
      { id: 'power-', type: 'power', offset: [0.12, -0.05, 0], label: 'V-' },
      { id: 'shaft', type: 'mechanical', offset: [0.25, 0, 0], label: 'Eje' },
    ] },
  { id: 'act_solenoide', name: 'Solenoide', desc: 'Actuador electromagnético de empuje/tracción lineal rápida.', shape: 'cylinder', color: '#475569', size: [0.12, 0.2, 0.12], electrical: { voltage: '5-24V', current: '0.3-1.5A' }, ports: [{ id: 'power+', type: 'power', offset: [0.06, 0, 0], label: 'V+' }, { id: 'power-', type: 'power', offset: [-0.06, 0, 0], label: 'V-' }, { id: 'rod', type: 'mechanical', offset: [0, 0.15, 0], label: 'Vástago' }] },
  { id: 'act_lineal', name: 'Actuador lineal', desc: 'Convierte rotación de motor en desplazamiento lineal.', shape: 'actuator', color: '#64748b', size: [0.5, 0.1, 0.1], electrical: { voltage: '12-24V', current: '1-5A' }, ports: [{ id: 'power+', type: 'power', offset: [-0.25, 0, 0], label: 'V+' }, { id: 'power-', type: 'power', offset: [-0.25, -0.05, 0], label: 'V-' }, { id: 'rod', type: 'mechanical', offset: [0.3, 0, 0], label: 'Vástago' }] },
  { id: 'act_neumatico', name: 'Cilindro neumático', desc: 'Actuador lineal accionado por aire comprimido.', shape: 'cylinder', color: '#9ca3af', size: [0.15, 0.4, 0.15], ports: [{ id: 'in', type: 'pneumatic', offset: [-0.08, 0.15, 0], label: 'Entrada aire' },{ id: 'out', type: 'pneumatic', offset: [-0.08, -0.15, 0], label: 'Salida aire' }, { id: 'rod', type: 'mechanical', offset: [0, 0.3, 0], label: 'Vástago' }] },
  { id: 'act_hidraulico', name: 'Cilindro hidráulico', desc: 'Actuador lineal de gran fuerza accionado por fluido a presión.', shape: 'cylinder', color: '#475569', size: [0.18, 0.5, 0.18], ports: [{ id: 'in', type: 'hydraulic', offset: [-0.1, 0.2, 0], label: 'Entrada' },{ id: 'out', type: 'hydraulic', offset: [-0.1, -0.2, 0], label: 'Retorno' }, { id: 'rod', type: 'mechanical', offset: [0, 0.4, 0], label: 'Vástago' }] },
];

// ---------------------------------------------------------------------------
// CHIPS Y ELECTRÓNICA (con ficha técnica detallada)
// ---------------------------------------------------------------------------
function chipPorts(digital = [], analog = [], power = [], comm = []) {
  const ports = [];
  let x = -0.3;
  digital.forEach((label, i) => { ports.push({ id: 'D' + label, type: 'digital', offset: [x + i * 0.08, 0.05, 0.08], label: 'D' + label }); });
  analog.forEach((label, i) => { ports.push({ id: 'A' + label, type: 'analog', offset: [x + i * 0.08, 0.05, -0.08], label: 'A' + label }); });
  power.forEach((label, i) => { ports.push({ id: label, type: 'power', offset: [-0.35, -0.02, i * 0.08 - 0.04], label }); });
  comm.forEach((label, i) => { ports.push({ id: label, type: 'comm', offset: [0.35, -0.02, i * 0.08 - 0.04], label }); });
  return ports;
}

const ELECTRONICA_BASICA = [
  { id: 'el_resistencia', name: 'Resistencia', desc: 'Limita la corriente en un circuito.', shape: 'resistor', color: '#d6c08f', size: [0.3, 0.08, 0.08],
    specs: { usage: 'Limitar corriente y dividir tensión.', voltage: 'Según diseño', current: 'Hasta su potencia nominal (1/4W típico)', pins: 2, resistance: '1Ω - 10MΩ' },
    ports: [{ id: 'p1', type: 'electrical', offset: [-0.15, 0, 0], label: 'Pin 1' }, { id: 'p2', type: 'electrical', offset: [0.15, 0, 0], label: 'Pin 2' }] },
  { id: 'el_condensador', name: 'Condensador', desc: 'Almacena energía eléctrica y filtra señales.', shape: 'capacitor', color: '#3b82f6', size: [0.15, 0.2, 0.15],
    specs: { usage: 'Filtrado, desacoplo, temporización.', voltage: 'Según tipo (6.3V-450V)', current: 'N/A', pins: 2 },
    ports: [{ id: 'p1', type: 'electrical', offset: [-0.07, 0.1, 0], label: '+' }, { id: 'p2', type: 'electrical', offset: [0.07, 0.1, 0], label: '-' }] },
  { id: 'el_diodo', name: 'Diodo', desc: 'Permite el paso de corriente en un solo sentido.', shape: 'diode', color: '#1f2937', size: [0.2, 0.08, 0.08],
    specs: { usage: 'Rectificación, protección contra polaridad inversa.', voltage: 'Caída ~0.7V (Si) / 0.3V (Ge)', current: 'Según modelo (1N4007: 1A)', pins: 2 },
    ports: [{ id: 'anode', type: 'electrical', offset: [-0.1, 0, 0], label: 'Ánodo' }, { id: 'cathode', type: 'electrical', offset: [0.1, 0, 0], label: 'Cátodo' }] },
  { id: 'el_led', name: 'LED', desc: 'Diodo emisor de luz, indicador visual.', shape: 'led', color: '#ef4444', size: [0.08, 0.14, 0.08],
    specs: { usage: 'Indicación visual, iluminación de bajo consumo.', voltage: '1.8-3.3V', current: '10-20mA (requiere resistencia limitadora)', pins: 2 },
    ports: [{ id: 'anode', type: 'electrical', offset: [-0.03, 0.07, 0], label: 'Ánodo +' }, { id: 'cathode', type: 'electrical', offset: [0.03, 0.07, 0], label: 'Cátodo -' }] },
  { id: 'el_transistor', name: 'Transistor (BJT)', desc: 'Amplifica o conmuta señales eléctricas.', shape: 'transistor', color: '#111827', size: [0.15, 0.2, 0.1],
    specs: { usage: 'Amplificación y conmutación de señales de baja/media potencia.', voltage: 'Colector hasta ~40V', current: 'Hasta ~500mA-1A', pins: 3 },
    ports: [{ id: 'base', type: 'electrical', offset: [-0.08, 0.05, 0], label: 'Base' }, { id: 'collector', type: 'electrical', offset: [0, 0.1, 0], label: 'Colector' }, { id: 'emitter', type: 'electrical', offset: [0.08, 0.05, 0], label: 'Emisor' }] },
  { id: 'el_mosfet', name: 'MOSFET', desc: 'Transistor de efecto de campo para conmutación de potencia.', shape: 'transistor', color: '#1e293b', size: [0.18, 0.22, 0.12],
    specs: { usage: 'Conmutar cargas de potencia (motores, LEDs de alta corriente) con señal digital.', voltage: 'Hasta 60V típico', current: 'Hasta 30A típico (según modelo)', pins: 3 },
    ports: [{ id: 'gate', type: 'digital', offset: [-0.09, 0.08, 0], label: 'Gate' }, { id: 'drain', type: 'power', offset: [0, 0.12, 0], label: 'Drain' }, { id: 'source', type: 'power', offset: [0.09, 0.08, 0], label: 'Source' }] },
  { id: 'el_rele', name: 'Relé', desc: 'Interruptor electromecánico accionado por una bobina.', shape: 'relay', color: '#1d4ed8', size: [0.3, 0.2, 0.25],
    specs: { usage: 'Aislar y conmutar cargas de alto voltaje/corriente desde un microcontrolador.', voltage: 'Bobina 5-12V / Contactos hasta 250V AC', current: 'Contactos hasta 10A', pins: 5 },
    ports: [{ id: 'coil+', type: 'digital', offset: [-0.14, 0.1, 0.12], label: 'Bobina +' }, { id: 'coil-', type: 'power', offset: [-0.14, 0.1, -0.12], label: 'Bobina -' }, { id: 'com', type: 'power', offset: [0.14, 0.1, 0.12], label: 'COM' }, { id: 'no', type: 'power', offset: [0.14, 0.1, 0], label: 'NA' }, { id: 'nc', type: 'power', offset: [0.14, 0.1, -0.12], label: 'NC' }] },
  { id: 'el_regulador', name: 'Regulador de voltaje', desc: 'Estabiliza una tensión de salida fija (ej. 7805, AMS1117).', shape: 'tripin', color: '#374151', size: [0.15, 0.15, 0.08],
    specs: { usage: 'Reducir y estabilizar voltaje (ej. 12V→5V).', voltage: 'Entrada hasta 35V / Salida fija (3.3V, 5V...)', current: 'Hasta 1-1.5A típico', pins: 3 },
    ports: [{ id: 'vin', type: 'power', offset: [-0.07, 0.08, 0], label: 'VIN' }, { id: 'gnd', type: 'power', offset: [0, 0.08, 0], label: 'GND' }, { id: 'vout', type: 'power', offset: [0.07, 0.08, 0], label: 'VOUT' }] },
  { id: 'el_puente_h', name: 'Puente H', desc: 'Permite controlar sentido y velocidad de motores DC (ej. L298N).', shape: 'driver', color: '#15803d', size: [0.4, 0.15, 0.3],
    specs: { usage: 'Controlar dirección y velocidad de motores DC/paso a paso desde un microcontrolador.', controls: 'Motores DC, motores paso a paso', voltage: 'Lógica 5V / Motor hasta 35V', current: 'Hasta 2A por canal', pins: 'IN1-IN4, ENA, ENB, OUT1-4, VCC, GND',
      motorsCompatible: ['Motor DC', 'Motor paso a paso'], commonErrors: ['Olvidar GND común con el microcontrolador', 'Superar la corriente máxima por canal'] },
    ports: [{ id: 'in1', type: 'digital', offset: [-0.2, 0.08, 0.1], label: 'IN1' }, { id: 'in2', type: 'digital', offset: [-0.2, 0.08, -0.1], label: 'IN2' }, { id: 'out1+', type: 'power', offset: [0.2, 0.08, 0.1], label: 'OUT1+' }, { id: 'out1-', type: 'power', offset: [0.2, 0.08, -0.1], label: 'OUT1-' }, { id: 'vcc', type: 'power', offset: [0, 0.08, 0.15], label: 'VCC' }, { id: 'gnd', type: 'power', offset: [0, 0.08, -0.15], label: 'GND' }] },
  { id: 'el_driver_motor', name: 'Driver de motores', desc: 'Módulo dedicado a controlar motores paso a paso (ej. A4988, DRV8825).', shape: 'driver', color: '#166534', size: [0.2, 0.25, 0.12],
    specs: { usage: 'Controlar motores paso a paso con microstepping.', controls: 'Motores paso a paso', voltage: 'Lógica 3.3-5V / Motor hasta 35V', current: 'Hasta 2A por bobina', pins: 'STEP, DIR, EN, MS1-3, VMOT, GND',
      motorsCompatible: ['Motor paso a paso'], commonErrors: ['No usar disipador con corrientes altas', 'Conectar/desconectar el motor con alimentación activa'] },
    ports: [{ id: 'step', type: 'digital', offset: [-0.1, 0.12, 0.06], label: 'STEP' }, { id: 'dir', type: 'digital', offset: [-0.1, 0.12, -0.06], label: 'DIR' }, { id: 'vmot', type: 'power', offset: [0.1, 0.12, 0.06], label: 'VMOT' }, { id: 'gnd', type: 'power', offset: [0.1, 0.12, -0.06], label: 'GND' }] },
  { id: 'el_opamp', name: 'Amplificador operacional', desc: 'Amplifica señales analógicas (ej. LM358).', shape: 'chip8', color: '#334155', size: [0.25, 0.08, 0.15],
    specs: { usage: 'Amplificación, comparación y acondicionamiento de señales analógicas.', voltage: '±3-18V o single supply 3-32V', current: 'uA-mA (muy bajo)', pins: 8 },
    ports: chipPorts([], ['in+', 'in-', 'out'], ['v+', 'v-'], []) },
  { id: 'el_adc', name: 'Convertidor ADC', desc: 'Convierte señal analógica a digital (ej. ADS1115).', shape: 'chip8', color: '#0f766e', size: [0.2, 0.06, 0.15],
    specs: { usage: 'Leer sensores analógicos con alta resolución mediante I2C/SPI.', voltage: '2-5.5V', current: '~150uA', pins: 8, interfaces: ['I2C', 'SPI'] },
    ports: chipPorts([], ['AIN0', 'AIN1'], ['vcc', 'gnd'], ['SDA', 'SCL']) },
  { id: 'el_dac', name: 'Convertidor DAC', desc: 'Convierte señal digital a analógica (ej. MCP4725).', shape: 'chip8', color: '#0e7490', size: [0.2, 0.06, 0.15],
    specs: { usage: 'Generar señales analógicas precisas desde un microcontrolador.', voltage: '2.7-5.5V', current: '~0.2mA', pins: 6, interfaces: ['I2C'] },
    ports: chipPorts([], ['OUT'], ['vcc', 'gnd'], ['SDA', 'SCL']) },
  { id: 'el_memoria', name: 'Memoria EEPROM/Flash', desc: 'Almacenamiento no volátil de datos (ej. 24LC256).', shape: 'chip8', color: '#312e81', size: [0.2, 0.06, 0.12],
    specs: { usage: 'Guardar configuración y datos de forma persistente.', voltage: '1.8-5.5V', current: '~3mA en escritura', pins: 8, memory: '256Kbit - 1Mbit típico', interfaces: ['I2C', 'SPI'] },
    ports: chipPorts([], [], ['vcc', 'gnd'], ['SDA', 'SCL']) },
];

const CHIPS_CONTROL = [
  {
    id: 'chip_microcontrolador', name: 'Microcontrolador genérico', desc: 'Chip con CPU, memoria y periféricos integrados en un único circuito.', shape: 'mcu', color: '#1f2937', size: [0.3, 0.05, 0.3],
    specs: {
      usage: 'Ejecutar programas de control embebido de forma autónoma.',
      controls: 'LEDs, sensores, pequeños motores vía drivers, pantallas',
      voltage: '1.8-5V (según familia)', current: '~10-50mA en reposo', pins: '8-144 según modelo', memory: 'KB-MB Flash + KB RAM',
      interfaces: ['GPIO', 'UART', 'I2C', 'SPI', 'PWM', 'ADC'],
      sensorsCompatible: ['Cualquier sensor digital/analógico compatible con su voltaje'],
      motorsCompatible: ['Ninguno directamente — requiere driver/puente H'],
      exampleWiring: 'Sensor → pin digital/analógico. Motor → Driver → microcontrolador (nunca directo).',
      exampleCode: 'pinMode(2, INPUT);\npinMode(9, OUTPUT);\nif (digitalRead(2)) digitalWrite(9, HIGH);',
      commonErrors: ['Conectar un motor directamente a un pin (lo destruye)', 'No compartir GND con módulos externos', 'Alimentar con voltaje superior al soportado'],
    },
    ports: chipPorts([2, 9, 13], [0, 1], ['5V', 'GND'], []),
  },
  {
    id: 'chip_microprocesador', name: 'Microprocesador', desc: 'Unidad de procesamiento central sin periféricos integrados, requiere chips externos (RAM, I/O).', shape: 'mcu', color: '#111827', size: [0.3, 0.05, 0.3],
    specs: {
      usage: 'Procesamiento de alto rendimiento (ej. sistemas operativos embebidos complejos).',
      controls: 'A través de chipset externo / periféricos conectados por bus',
      voltage: '0.8-1.8V núcleo (con reguladores externos)', current: 'Cientos de mA a varios A', pins: '200-2000+ (BGA)', memory: 'Depende de RAM externa',
      interfaces: ['PCIe', 'DDR', 'USB', 'Ethernet (vía chipset)'],
      sensorsCompatible: ['Vía placa base / controladores externos'],
      motorsCompatible: ['Ninguno directo'],
      exampleWiring: 'Requiere placa base con RAM, almacenamiento y fuente regulada.',
      exampleCode: '// Se programa a nivel de sistema operativo, no con pinMode/digitalWrite',
      commonErrors: ['Subestimar la complejidad del diseño de la placa', 'No gestionar la disipación térmica'],
    },
    ports: chipPorts([], [], ['VCORE', 'GND'], ['PCIe']),
  },
  {
    id: 'chip_fpga', name: 'FPGA', desc: 'Circuito lógico programable y reconfigurable a nivel de hardware.', shape: 'mcu', color: '#4c1d95', size: [0.3, 0.05, 0.3],
    specs: {
      usage: 'Lógica digital de altísima velocidad y paralelismo real (procesamiento de señales, control de alta velocidad).',
      controls: 'Cualquier periférico digital definido por el diseñador en HDL',
      voltage: '1.0-3.3V (múltiples rieles)', current: 'Variable según diseño (cientos de mA)', pins: '100-1000+', memory: 'Bloques RAM internos (BRAM)',
      interfaces: ['GPIO', 'SPI', 'I2C', 'LVDS', 'Ethernet (con IP core)'],
      sensorsCompatible: ['Cualquiera, mediante lógica personalizada'],
      motorsCompatible: ['Mediante drivers externos, igual que un microcontrolador'],
      exampleWiring: 'Se programa con VHDL/Verilog, no con C tradicional.',
      exampleCode: '-- Verilog\nalways @(posedge clk) led <= sensor;',
      commonErrors: ['Errores de timing/sincronización', 'Alto consumo si el diseño no está optimizado'],
    },
    ports: chipPorts([0, 1, 2], [], ['VCCIO', 'GND'], []),
  },
  {
    id: 'chip_plc', name: 'PLC (Autómata industrial)', desc: 'Controlador lógico programable para automatización industrial robusta.', shape: 'plc', color: '#0f172a', size: [0.5, 0.3, 0.2],
    specs: {
      usage: 'Automatizar procesos industriales (líneas de producción, maquinaria).',
      controls: 'Contactores, relés, electroválvulas, motores (vía variadores), sensores industriales',
      voltage: 'Alimentación 24V DC / 110-240V AC, E/S 24V DC', current: 'Según módulo de E/S (cientos de mA por salida)', pins: 'Entradas/salidas modulares (8-128+)',
      memory: 'KB-MB para programa de usuario',
      interfaces: ['Modbus', 'PROFINET', 'EtherCAT', 'RS-485', 'Ethernet/IP'],
      sensorsCompatible: ['Finales de carrera', 'Sensores inductivos/capacitivos', 'Encoders', 'Presión', 'Temperatura'],
      motorsCompatible: ['Motores AC (vía variador/contactor)', 'Servomotores industriales'],
      exampleWiring: 'Sensor 24V → Entrada digital PLC. Salida PLC → Contactor → Motor AC.',
      exampleCode: '// Ladder (pseudocódigo)\nIF Entrada_I0.0 THEN Salida_Q0.0 := TRUE;',
      commonErrors: ['No aislar correctamente E/S industriales', 'Mezclar tierras de potencia y señal', 'No usar relés de protección en bobinas inductivas'],
    },
    ports: chipPorts(['I0.0', 'Q0.0'], [], ['24V', 'GND'], ['RS485']),
  },
  {
    id: 'chip_arduino', name: 'Arduino (UNO)', desc: 'Placa de desarrollo con microcontrolador AVR, ideal para prototipado educativo.', shape: 'board', color: '#00979d', size: [0.5, 0.05, 0.4],
    specs: {
      usage: 'Prototipado rápido de electrónica y robótica. Leer sensores y controlar actuadores de baja potencia.',
      controls: 'LEDs, servos, sensores, drivers de motores pequeños',
      voltage: 'Alimentación 7-12V (jack) / Lógica 5V', current: 'Máx. ~40mA por pin, 200mA total recomendado', pins: '14 digitales (6 PWM) + 6 analógicas', memory: '32KB Flash, 2KB RAM, 1KB EEPROM',
      interfaces: ['UART', 'I2C', 'SPI'],
      sensorsCompatible: ['DHT11/22', 'Ultrasonido HC-SR04', 'Fotorresistencia', 'Potenciómetro', 'PIR'],
      motorsCompatible: ['Servomotor directo (1-2)', 'Motor DC/paso a paso vía puente H o driver'],
      exampleWiring: 'Sensor digital → pin 2. Motor → L298N → pin 9 (PWM).',
      exampleCode: 'const int sensor = 2;\nconst int motor = 9;\n\nvoid setup() {\n  pinMode(sensor, INPUT);\n  pinMode(motor, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(sensor) == HIGH) {\n    analogWrite(motor, 180);\n  } else {\n    analogWrite(motor, 0);\n  }\n}',
      commonErrors: ['No debe alimentar directamente motores grandes', 'Confundir pines PWM (~) con pines digitales normales', 'Alimentar con más de 12V por el jack'],
    },
    ports: chipPorts([2, 3, 9, 10, 11, 13], [0, 1], ['5V', '3V3', 'GND'], []),
  },
  {
    id: 'chip_esp32', name: 'ESP32', desc: 'Microcontrolador con Wi-Fi y Bluetooth integrados.', shape: 'board', color: '#e7352c', size: [0.45, 0.05, 0.28],
    specs: {
      usage: 'Sirve para leer sensores, controlar drivers y comunicarse con otros dispositivos (IoT).',
      controls: 'Sensores, relés, drivers de motores, pantallas, módulos de comunicación',
      voltage: 'Alimentación 5V (USB) / Lógica 3.3V', current: 'Hasta 40mA por pin, picos de 500mA+ con Wi-Fi activo', pins: '~34 GPIO (algunos solo entrada)', memory: '4MB Flash típico, 520KB SRAM',
      interfaces: ['Wi-Fi', 'Bluetooth', 'UART', 'I2C', 'SPI', 'PWM', 'ADC/DAC'],
      sensorsCompatible: ['DHT11/22', 'BMP280', 'MPU6050', 'HC-SR04', 'Cámaras (ESP32-CAM)'],
      motorsCompatible: ['Servomotor directo', 'Motores DC/paso a paso vía driver (nunca directo)'],
      exampleWiring: 'Sensor → GPIO4. Driver de motor → GPIO18/19 (PWM + dirección).',
      exampleCode: 'const int sensor = 4;\nconst int motor = 18;\n\nvoid setup() {\n  pinMode(sensor, INPUT);\n  pinMode(motor, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(sensor) == HIGH) {\n    digitalWrite(motor, HIGH);\n  } else {\n    digitalWrite(motor, LOW);\n  }\n}',
      commonErrors: ['No debe alimentar directamente motores grandes', 'Pines de solo-entrada (34-39) no pueden usarse como salida', 'Picos de corriente del Wi-Fi pueden resetear la placa si la fuente es débil'],
    },
    ports: chipPorts([2, 4, 18, 19], [0], ['5V', '3V3', 'GND'], ['WiFi', 'BT']),
  },
  {
    id: 'chip_stm32', name: 'STM32', desc: 'Microcontrolador ARM Cortex-M de alto rendimiento para aplicaciones profesionales.', shape: 'board', color: '#03234b', size: [0.45, 0.05, 0.28],
    specs: {
      usage: 'Control industrial y robótica avanzada con alta velocidad y precisión (temporizadores avanzados).',
      controls: 'Motores paso a paso de alta velocidad, ESCs, comunicación industrial',
      voltage: '1.8-3.6V (placas Nucleo con 5V USB)', current: '~20mA en reposo, picos según periférico', pins: '32-144 según modelo', memory: '16KB-2MB Flash, hasta 640KB RAM',
      interfaces: ['UART', 'I2C', 'SPI', 'CAN', 'USB', 'Ethernet (algunos modelos)'],
      sensorsCompatible: ['IMUs', 'Encoders de alta resolución', 'Sensores industriales analógicos'],
      motorsCompatible: ['Motores paso a paso/BLDC vía driver dedicado'],
      exampleWiring: 'Encoder → Timer de entrada. Driver BLDC → Timers PWM avanzados.',
      exampleCode: 'void setup(){ pinMode(PA5, OUTPUT); }\nvoid loop(){ digitalWrite(PA5, !digitalRead(PA5)); delay(200); }',
      commonErrors: ['Confundir niveles lógicos 3.3V con periféricos de 5V', 'No usar bootloader/ST-Link correctamente', 'Mal uso del reloj (clock tree) en proyectos avanzados'],
    },
    ports: chipPorts(['A5', 'A6', 'B0'], ['A0'], ['5V', '3V3', 'GND'], ['CAN']),
  },
  {
    id: 'chip_rpi', name: 'Raspberry Pi', desc: 'Ordenador de placa reducida (SBC) capaz de correr Linux.', shape: 'board', color: '#9c1a67', size: [0.55, 0.05, 0.35],
    specs: {
      usage: 'Visión por computador, control de alto nivel, servidores IoT, interfaces gráficas.',
      controls: 'Cámaras, pantallas, motores vía drivers, otros microcontroladores por serie/USB',
      voltage: 'Alimentación 5V (USB-C) / GPIO lógica 3.3V', current: '~600mA-1.2A en uso normal', pins: '40 GPIO', memory: '1-8GB RAM + almacenamiento microSD',
      interfaces: ['Wi-Fi', 'Bluetooth', 'Ethernet', 'USB', 'I2C', 'SPI', 'UART', 'CSI (cámara)'],
      sensorsCompatible: ['Cámaras CSI', 'Sensores I2C (BME280, etc.)', 'LiDAR por USB/UART'],
      motorsCompatible: ['Ninguno directo — requiere HAT driver o microcontrolador auxiliar'],
      exampleWiring: 'GPIO no debe conectarse nunca directamente a un motor; usar un HAT con driver.',
      exampleCode: 'import RPi.GPIO as GPIO\nimport time\nGPIO.setmode(GPIO.BCM)\nGPIO.setup(17, GPIO.OUT)\nwhile True:\n    GPIO.output(17, True)\n    time.sleep(1)\n    GPIO.output(17, False)\n    time.sleep(1)',
      commonErrors: ['GPIO no tolera 5V (solo 3.3V)', 'No apagar correctamente (corrupción de SD)', 'Conectar motores directamente a GPIO'],
    },
    ports: chipPorts([17, 27], [], ['5V', '3V3', 'GND'], ['WiFi', 'BT', 'ETH']),
  },
  {
    id: 'chip_rp2040', name: 'RP2040 (Raspberry Pi Pico)', desc: 'Microcontrolador dual-core de Raspberry Pi, económico y versátil.', shape: 'board', color: '#f2c200', size: [0.3, 0.05, 0.15],
    specs: {
      usage: 'Control embebido de bajo coste con buen rendimiento (PIO para protocolos personalizados).',
      controls: 'Sensores, LEDs, pequeños motores vía driver, protocolos personalizados con PIO',
      voltage: 'Alimentación 5V (USB) / Lógica 3.3V', current: '~20mA en reposo', pins: '26 GPIO multifunción', memory: '2MB Flash, 264KB RAM',
      interfaces: ['UART', 'I2C', 'SPI', 'PIO (programable)', 'USB'],
      sensorsCompatible: ['DHT11/22', 'HC-SR04', 'Sensores I2C/SPI estándar'],
      motorsCompatible: ['Servomotor directo', 'Motores vía driver externo'],
      exampleWiring: 'Sensor → GP15. Driver de motor → GP16 (PWM).',
      exampleCode: 'const int sensor = 15;\nconst int motor = 16;\nvoid setup(){ pinMode(sensor, INPUT); pinMode(motor, OUTPUT); }\nvoid loop(){ digitalWrite(motor, digitalRead(sensor)); }',
      commonErrors: ['No debe alimentar directamente motores grandes', 'Confundir numeración GP con la física de la placa'],
    },
    ports: chipPorts([15, 16], [26], ['5V', '3V3', 'GND'], []),
  },
];

// ---------------------------------------------------------------------------
// CABLES Y ELECTRICIDAD
// ---------------------------------------------------------------------------
const CABLES = [
  { id: 'cab_potencia', name: 'Cable de potencia', desc: 'Conduce corrientes altas entre fuente y actuadores.', shape: 'wire', color: '#dc2626', size: [0.6, 0.04, 0.04],
    specs: { maxCurrent: 10, resistancePerM: 0.02 }, ports: [{ id: 'a', type: 'power', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'power', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'cab_senal', name: 'Cable de señal', desc: 'Transporta señales digitales/analógicas de bajo amperaje.', shape: 'wire', color: '#3b82f6', size: [0.6, 0.02, 0.02],
    specs: { maxCurrent: 1, resistancePerM: 0.05 }, ports: [{ id: 'a', type: 'digital', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'digital', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'cab_apantallado', name: 'Cable apantallado', desc: 'Protege señales contra interferencias electromagnéticas.', shape: 'wire', color: '#6b7280', size: [0.6, 0.03, 0.03],
    specs: { maxCurrent: 2, resistancePerM: 0.04 }, ports: [{ id: 'a', type: 'comm', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'comm', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'cab_conector', name: 'Conector', desc: 'Permite unir o desconectar cables de forma segura.', shape: 'box', color: '#111827', size: [0.1, 0.1, 0.1], ports: [{ id: 'a', type: 'electrical', offset: [-0.05, 0, 0], label: 'A' }, { id: 'b', type: 'electrical', offset: [0.05, 0, 0], label: 'B' }] },
  { id: 'cab_borne', name: 'Borne / Terminal', desc: 'Punto de conexión atornillable para cables.', shape: 'box', color: '#374151', size: [0.12, 0.1, 0.08], ports: [{ id: 'a', type: 'electrical', offset: [0, 0.05, 0], label: 'Terminal' }] },
  { id: 'cab_protoboard', name: 'Protoboard', desc: 'Placa de pruebas sin soldadura para prototipos.', shape: 'box', color: '#f8fafc', size: [0.6, 0.02, 0.4], ports: [{ id: 'bus+', type: 'power', offset: [-0.28, 0.01, 0.17], label: 'Bus +' }, { id: 'bus-', type: 'power', offset: [-0.28, 0.01, -0.17], label: 'Bus -' }, { id: 'row1', type: 'electrical', offset: [0, 0.01, 0], label: 'Fila' }] },
  { id: 'cab_pcb', name: 'PCB', desc: 'Placa de circuito impreso para montaje permanente.', shape: 'box', color: '#166534', size: [0.6, 0.015, 0.4], ports: [{ id: 'pad1', type: 'electrical', offset: [0, 0.01, 0], label: 'Pad' }] },
  { id: 'cab_bateria', name: 'Batería', desc: 'Fuente de energía portátil (LiPo, 18650, etc.).', shape: 'battery', color: '#16a34a', size: [0.3, 0.15, 0.15],
    specs: { voltage: 12, maxCurrent: 20, type: 'LiPo' }, ports: [{ id: '+', type: 'power', offset: [0.15, 0.05, 0], label: '+' }, { id: '-', type: 'power', offset: [-0.15, 0.05, 0], label: '-' }] },
  { id: 'cab_fuente', name: 'Fuente de alimentación', desc: 'Convierte AC de red en DC regulado.', shape: 'box', color: '#1f2937', size: [0.4, 0.2, 0.3],
    specs: { voltage: 12, maxCurrent: 15 }, ports: [{ id: '+', type: 'power', offset: [0.2, 0.1, 0.05], label: '+' }, { id: '-', type: 'power', offset: [0.2, 0.1, -0.05], label: '-' }, { id: 'ac', type: 'power', offset: [-0.2, 0.1, 0], label: 'AC IN' }] },
  { id: 'cab_transformador', name: 'Transformador', desc: 'Cambia el nivel de voltaje AC mediante inducción electromagnética.', shape: 'cylinder', color: '#374151', size: [0.2, 0.2, 0.2], ports: [{ id: 'prim', type: 'power', offset: [-0.1, 0, 0], label: 'Primario' }, { id: 'sec', type: 'power', offset: [0.1, 0, 0], label: 'Secundario' }] },
  { id: 'cab_fusible', name: 'Fusible', desc: 'Protege el circuito interrumpiéndose ante sobrecorriente.', shape: 'cylinder', color: '#fbbf24', size: [0.06, 0.2, 0.06],
    specs: { maxCurrent: 5 }, ports: [{ id: 'a', type: 'power', offset: [0, 0.1, 0], label: 'A' }, { id: 'b', type: 'power', offset: [0, -0.1, 0], label: 'B' }] },
  { id: 'cab_interruptor', name: 'Interruptor', desc: 'Abre o cierra manualmente un circuito.', shape: 'switch', color: '#52525b', size: [0.15, 0.1, 0.1], ports: [{ id: 'a', type: 'power', offset: [-0.07, 0.05, 0], label: 'A' }, { id: 'b', type: 'power', offset: [0.07, 0.05, 0], label: 'B' }] },
  { id: 'cab_contactor', name: 'Contactor', desc: 'Relé de potencia para arrancar motores industriales.', shape: 'relay', color: '#1e3a8a', size: [0.25, 0.25, 0.2],
    specs: { maxCurrent: 40 }, ports: [{ id: 'coil', type: 'power', offset: [-0.1, 0.12, 0], label: 'Bobina' }, { id: 'l1', type: 'power', offset: [0.1, 0.12, 0.08], label: 'L1' }, { id: 't1', type: 'power', offset: [0.1, -0.12, 0.08], label: 'T1' }] },
  { id: 'cab_tierra', name: 'Puesta a tierra', desc: 'Conexión de protección para derivar corrientes de fuga.', shape: 'ground', color: '#166534', size: [0.1, 0.1, 0.1], ports: [{ id: 'gnd', type: 'power', offset: [0, 0, 0], label: 'GND' }] },
];

// ---------------------------------------------------------------------------
// SENSORES
// ---------------------------------------------------------------------------
function sensor(id, name, desc, color, extra) {
  return Object.assign({ id, name, desc, shape: 'sensor', color, size: [0.15, 0.1, 0.15],
    ports: [{ id: 'signal', type: 'analog', offset: [0, 0.06, 0.08], label: 'Señal' }, { id: 'vcc', type: 'power', offset: [-0.05, 0.06, -0.08], label: 'VCC' }, { id: 'gnd', type: 'power', offset: [0.05, 0.06, -0.08], label: 'GND' }] }, extra);
}
const SENSORES = [
  sensor('sen_temp', 'Sensor de temperatura', 'Mide temperatura ambiente o de un objeto (ej. DHT22, DS18B20).', '#ef4444', {}),
  sensor('sen_hum', 'Sensor de humedad', 'Mide humedad relativa del ambiente.', '#06b6d4', {}),
  sensor('sen_luz', 'Sensor de luz (LDR)', 'Mide la intensidad lumínica.', '#eab308', {}),
  sensor('sen_dist', 'Sensor de distancia', 'Mide distancia a un objeto (infrarrojo/láser).', '#8b5cf6', {}),
  sensor('sen_ultra', 'Sensor ultrasónico', 'Mide distancia mediante ultrasonidos (ej. HC-SR04).', '#6366f1', {}),
  sensor('sen_ir', 'Sensor infrarrojo', 'Detecta objetos o líneas por reflexión IR.', '#f97316', {}),
  sensor('sen_prox', 'Sensor de proximidad', 'Detecta presencia de objetos cercanos (inductivo/capacitivo).', '#0ea5e9', {}),
  sensor('sen_presion', 'Sensor de presión', 'Mide presión de fluidos o gases.', '#14b8a6', {}),
  sensor('sen_fuerza', 'Sensor de fuerza', 'Mide fuerza aplicada (celda de carga).', '#f43f5e', {}),
  sensor('sen_par', 'Sensor de par (torque)', 'Mide el par motor en un eje.', '#a855f7', {}),
  sensor('sen_encoder', 'Encoder', 'Mide posición o velocidad angular de un eje.', '#64748b', {}),
  sensor('sen_acel', 'Acelerómetro', 'Mide aceleración lineal en 3 ejes.', '#22c55e', {}),
  sensor('sen_giro', 'Giroscopio', 'Mide velocidad angular / orientación.', '#16a34a', {}),
  sensor('sen_camara', 'Cámara', 'Captura imágenes para visión artificial.', '#1f2937', {}),
  sensor('sen_lidar', 'LiDAR', 'Mide distancias mediante láser para mapeo 3D.', '#7c3aed', {}),
  sensor('sen_nivel', 'Sensor de nivel', 'Mide el nivel de un líquido en un depósito.', '#0284c7', {}),
  sensor('sen_caudal', 'Sensor de caudal', 'Mide el flujo volumétrico de un fluido.', '#0891b2', {}),
  sensor('sen_vibracion', 'Sensor de vibración', 'Detecta vibraciones mecánicas anómalas.', '#ca8a04', {}),
  sensor('sen_gas', 'Sensor de gas', 'Detecta concentración de gases (ej. MQ-2).', '#65a30d', {}),
  sensor('sen_color', 'Sensor de color', 'Identifica el color de un objeto (ej. TCS3200).', '#db2777', {}),
];

// ---------------------------------------------------------------------------
// NEUMÁTICA E HIDRÁULICA
// ---------------------------------------------------------------------------
const NEUMATICA = [
  { id: 'neu_compresor', name: 'Compresor', desc: 'Genera aire comprimido para el sistema neumático.', shape: 'box', color: '#1d4ed8', size: [0.4, 0.4, 0.3], ports: [{ id: 'out', type: 'pneumatic', offset: [0.2, 0.1, 0], label: 'Salida' }] },
  { id: 'neu_bomba', name: 'Bomba hidráulica', desc: 'Impulsa fluido a presión en un circuito hidráulico.', shape: 'box', color: '#1e40af', size: [0.35, 0.3, 0.3], ports: [{ id: 'out', type: 'hydraulic', offset: [0.17, 0.1, 0], label: 'Salida' }, { id: 'in', type: 'hydraulic', offset: [-0.17, 0.1, 0], label: 'Entrada' }] },
  { id: 'neu_deposito', name: 'Depósito', desc: 'Almacena aire o fluido a presión.', shape: 'cylinder', color: '#64748b', size: [0.25, 0.5, 0.25], ports: [{ id: 'p1', type: 'pneumatic', offset: [0, 0.25, 0], label: 'Puerto' }] },
  { id: 'neu_filtro', name: 'Filtro', desc: 'Elimina partículas e impurezas del fluido o aire.', shape: 'cylinder', color: '#94a3b8', size: [0.15, 0.25, 0.15], ports: [{ id: 'in', type: 'pneumatic', offset: [-0.08, 0, 0], label: 'In' }, { id: 'out', type: 'pneumatic', offset: [0.08, 0, 0], label: 'Out' }] },
  { id: 'neu_regulador', name: 'Regulador de presión', desc: 'Ajusta y estabiliza la presión del circuito.', shape: 'cylinder', color: '#2563eb', size: [0.15, 0.2, 0.15], ports: [{ id: 'in', type: 'pneumatic', offset: [-0.08, 0, 0], label: 'In' }, { id: 'out', type: 'pneumatic', offset: [0.08, 0, 0], label: 'Out' }] },
  { id: 'neu_valvula', name: 'Válvula', desc: 'Controla el paso del fluido/aire manualmente.', shape: 'valve', color: '#f97316', size: [0.15, 0.15, 0.15], ports: [{ id: 'in', type: 'pneumatic', offset: [-0.08, 0, 0], label: 'In' }, { id: 'out', type: 'pneumatic', offset: [0.08, 0, 0], label: 'Out' }] },
  { id: 'neu_electrovalvula', name: 'Electroválvula', desc: 'Válvula accionada eléctricamente (ej. solenoide 5/2).', shape: 'valve', color: '#ea580c', size: [0.18, 0.15, 0.15], ports: [{ id: 'sig', type: 'digital', offset: [0, 0.1, 0], label: 'Señal' }, { id: 'in', type: 'pneumatic', offset: [-0.09, 0, 0], label: 'In' }, { id: 'out', type: 'pneumatic', offset: [0.09, 0, 0], label: 'Out' }] },
  { id: 'neu_cilindro', name: 'Cilindro', desc: 'Actuador lineal neumático/hidráulico (ver también en motores).', shape: 'cylinder', color: '#9ca3af', size: [0.15, 0.4, 0.15], ports: [{ id: 'in', type: 'pneumatic', offset: [-0.08, 0.15, 0], label: 'In' }, { id: 'rod', type: 'mechanical', offset: [0, 0.3, 0], label: 'Vástago' }] },
  { id: 'neu_tubo', name: 'Tubo rígido', desc: 'Conduce aire o fluido a presión.', shape: 'wire', color: '#60a5fa', size: [0.6, 0.04, 0.04], ports: [{ id: 'a', type: 'pneumatic', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'pneumatic', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'neu_manguera', name: 'Manguera flexible', desc: 'Tubo flexible para conexiones móviles.', shape: 'wire', color: '#334155', size: [0.6, 0.04, 0.04], ports: [{ id: 'a', type: 'hydraulic', offset: [-0.3, 0, 0], label: 'A' }, { id: 'b', type: 'hydraulic', offset: [0.3, 0, 0], label: 'B' }] },
  { id: 'neu_sensor_presion', name: 'Sensor de presión (neumático)', desc: 'Mide la presión del circuito neumático/hidráulico.', shape: 'sensor', color: '#0ea5e9', size: [0.12, 0.1, 0.12], ports: [{ id: 'p', type: 'pneumatic', offset: [0, 0.05, 0], label: 'Puerto' }, { id: 'sig', type: 'analog', offset: [0, 0.05, 0.06], label: 'Señal' }] },
  { id: 'neu_manometro', name: 'Manómetro', desc: 'Indicador visual de presión del sistema.', shape: 'gauge', color: '#e5e7eb', size: [0.15, 0.15, 0.08], ports: [{ id: 'p', type: 'pneumatic', offset: [0, -0.07, 0], label: 'Puerto' }] },
];

// ---------------------------------------------------------------------------
// COMUNICACIÓN INDUSTRIAL
// ---------------------------------------------------------------------------
const COMUNICACION = [
  { id: 'com_uart', name: 'UART', desc: 'Comunicación serie asíncrona punto a punto (TX/RX).', shape: 'module', color: '#a855f7', size: [0.15, 0.08, 0.1], specs: { speed: '9600-115200 baudios' }, ports: [{ id: 'tx', type: 'comm', offset: [-0.05, 0.04, 0], label: 'TX' }, { id: 'rx', type: 'comm', offset: [0.05, 0.04, 0], label: 'RX' }] },
  { id: 'com_i2c', name: 'I2C', desc: 'Bus serie síncrono de 2 hilos (SDA/SCL), multi-dispositivo.', shape: 'module', color: '#9333ea', size: [0.15, 0.08, 0.1], specs: { speed: '100kHz-3.4MHz' }, ports: [{ id: 'sda', type: 'comm', offset: [-0.05, 0.04, 0], label: 'SDA' }, { id: 'scl', type: 'comm', offset: [0.05, 0.04, 0], label: 'SCL' }] },
  { id: 'com_spi', name: 'SPI', desc: 'Bus serie síncrono de alta velocidad (MOSI/MISO/SCK/CS).', shape: 'module', color: '#7e22ce', size: [0.15, 0.08, 0.1], specs: { speed: 'Hasta decenas de MHz' }, ports: [{ id: 'mosi', type: 'comm', offset: [-0.06, 0.04, 0.03], label: 'MOSI' }, { id: 'miso', type: 'comm', offset: [0.06, 0.04, 0.03], label: 'MISO' }, { id: 'sck', type: 'comm', offset: [0, 0.04, -0.03], label: 'SCK' }] },
  { id: 'com_can', name: 'CAN', desc: 'Bus robusto para comunicación entre ECUs en entornos industriales/automotrices.', shape: 'module', color: '#6b21a8', size: [0.15, 0.08, 0.1], specs: { speed: 'Hasta 1Mbps' }, ports: [{ id: 'h', type: 'comm', offset: [-0.05, 0.04, 0], label: 'CAN_H' }, { id: 'l', type: 'comm', offset: [0.05, 0.04, 0], label: 'CAN_L' }] },
  { id: 'com_rs232', name: 'RS-232', desc: 'Comunicación serie punto a punto de largo alcance moderado.', shape: 'module', color: '#581c87', size: [0.15, 0.08, 0.1], ports: [{ id: 'tx', type: 'comm', offset: [-0.05, 0.04, 0], label: 'TX' }, { id: 'rx', type: 'comm', offset: [0.05, 0.04, 0], label: 'RX' }] },
  { id: 'com_rs485', name: 'RS-485', desc: 'Bus diferencial multipunto robusto para largas distancias industriales.', shape: 'module', color: '#4c1d95', size: [0.15, 0.08, 0.1], specs: { speed: 'Hasta 10Mbps, 1200m' }, ports: [{ id: 'a', type: 'comm', offset: [-0.05, 0.04, 0], label: 'A' }, { id: 'b', type: 'comm', offset: [0.05, 0.04, 0], label: 'B' }] },
  { id: 'com_modbus', name: 'Modbus', desc: 'Protocolo estándar de automatización industrial (sobre RS-485/TCP).', shape: 'module', color: '#312e81', size: [0.15, 0.08, 0.1], ports: [{ id: 'bus', type: 'comm', offset: [0, 0.04, 0], label: 'Bus' }] },
  { id: 'com_ethernet', name: 'Ethernet', desc: 'Red cableada de alta velocidad.', shape: 'module', color: '#1e3a8a', size: [0.15, 0.08, 0.1], specs: { speed: '100M-10Gbps' }, ports: [{ id: 'eth', type: 'comm', offset: [0, 0.04, 0], label: 'RJ45' }] },
  { id: 'com_wifi', name: 'Wi-Fi', desc: 'Comunicación inalámbrica de red local.', shape: 'module', color: '#0369a1', size: [0.12, 0.06, 0.1], ports: [{ id: 'ant', type: 'comm', offset: [0, 0.03, 0], label: 'Antena' }] },
  { id: 'com_bt', name: 'Bluetooth', desc: 'Comunicación inalámbrica de corto alcance.', shape: 'module', color: '#1d4ed8', size: [0.12, 0.06, 0.1], ports: [{ id: 'ant', type: 'comm', offset: [0, 0.03, 0], label: 'Antena' }] },
  { id: 'com_mqtt', name: 'MQTT', desc: 'Protocolo IoT ligero de publicación/suscripción sobre TCP/IP.', shape: 'module', color: '#0f766e', size: [0.12, 0.06, 0.1], ports: [{ id: 'net', type: 'comm', offset: [0, 0.03, 0], label: 'Red' }] },
  { id: 'com_ethercat', name: 'EtherCAT', desc: 'Bus de campo Ethernet determinista de muy alta velocidad.', shape: 'module', color: '#065f46', size: [0.15, 0.08, 0.1], ports: [{ id: 'eth', type: 'comm', offset: [0, 0.04, 0], label: 'Puerto' }] },
  { id: 'com_profinet', name: 'PROFINET', desc: 'Estándar Ethernet industrial de Siemens para automatización.', shape: 'module', color: '#047857', size: [0.15, 0.08, 0.1], ports: [{ id: 'eth', type: 'comm', offset: [0, 0.04, 0], label: 'Puerto' }] },
];

// ---------------------------------------------------------------------------
// CATEGORÍAS COMPLETAS
// ---------------------------------------------------------------------------
const COMPONENT_LIBRARY = [
  { id: 'materiales', label: 'Materiales', icon: '🧱', items: MATERIALES },
  { id: 'estructuras', label: 'Estructuras', icon: '🏗️', items: ESTRUCTURAS },
  { id: 'mecanica', label: 'Piezas mecánicas', icon: '⚙️', items: MECANICA },
  { id: 'motores', label: 'Motores y actuadores', icon: '🔧', items: MOTORES },
  { id: 'electronica', label: 'Electrónica básica', icon: '💡', items: ELECTRONICA_BASICA },
  { id: 'chips', label: 'Chips y controladores', icon: '🧠', items: CHIPS_CONTROL },
  { id: 'cables', label: 'Cables y electricidad', icon: '🔌', items: CABLES },
  { id: 'sensores', label: 'Sensores', icon: '📡', items: SENSORES },
  { id: 'neumatica', label: 'Neumática e hidráulica', icon: '💨', items: NEUMATICA },
  { id: 'comunicacion', label: 'Comunicación industrial', icon: '📶', items: COMUNICACION },
];

// Set para saber qué ids son "controladores" (microcontrolador/placa) a efectos de validación
const CONTROLLER_IDS = new Set(['chip_microcontrolador', 'chip_arduino', 'chip_esp32', 'chip_stm32', 'chip_rpi', 'chip_rp2040', 'chip_microprocesador', 'chip_fpga', 'chip_plc']);
const DRIVER_IDS = new Set(['el_puente_h', 'el_driver_motor', 'el_mosfet', 'el_rele', 'el_transistor']);
const MOTOR_IDS = new Set(MOTORES.map(m => m.id));

function findComponentDef(id) {
  for (const cat of COMPONENT_LIBRARY) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}
