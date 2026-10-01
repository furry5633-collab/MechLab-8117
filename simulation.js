// ============================================================================
// MechLab Simulator — Motor de simulación (pines, código, errores eléctricos)
// ============================================================================

class PinBus {
  constructor() {
    this.digital = {};   // pinId -> 0/1
    this.pwm = {};       // pinId -> 0-255
    this.analogIn = {};  // pinId -> 0-1023 (simulado por sensores/usuario)
    this.modes = {};     // pinId -> 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'
    this.listeners = [];
  }
  onChange(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach(fn => fn()); }
  setMode(pin, mode) { this.modes[pin] = mode; }
  write(pin, val) { this.digital[pin] = val ? 1 : 0; this.notify(); }
  read(pin) { return this.digital[pin] ? 1 : 0; }
  writePWM(pin, val) { this.pwm[pin] = Math.max(0, Math.min(255, val | 0)); this.notify(); }
  readAnalog(pin) { return this.analogIn[pin] || 0; }
  setAnalogIn(pin, val) { this.analogIn[pin] = val; this.notify(); }
  reset() { this.digital = {}; this.pwm = {}; this.modes = {}; this.notify(); }
}

// ----------------------------------------------------------------------------
// Transpiladores a JS (generadores, para soportar delay() sin bloquear el hilo)
// ----------------------------------------------------------------------------
const CodeTranspiler = {
  // --- C / C++ (estilo Arduino) ---
  transpileCpp(src) {
    let code = src;
    // quitar comentarios
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    code = code.replace(/\/\/.*$/gm, '');
    // void -> function (incluye setup/loop y funciones de usuario)
    code = code.replace(/\bvoid\s+/g, 'function* ');
    // tipos con const
    code = code.replace(/\bconst\s+(int|float|double|long|unsigned long|unsigned int|byte|char|bool|boolean|String)\s+/g, 'const ');
    // declaraciones de tipo -> let
    code = code.replace(/\b(int|float|double|long|unsigned long|unsigned int|byte|char|bool|boolean|String)\s+/g, 'let ');
    // constantes Arduino
    code = code.replace(/\bHIGH\b/g, '1').replace(/\bLOW\b/g, '0');
    code = code.replace(/\bINPUT_PULLUP\b/g, '2').replace(/\bOUTPUT\b/g, '1').replace(/\bINPUT\b/g, '0');
    // delay -> yield*
    code = code.replace(/\bdelay\s*\(/g, 'yield* __delay(');
    code = code.replace(/\bdelayMicroseconds\s*\(/g, 'yield* __delayMicros(');
    return code;
  },
  // --- MicroPython / Python (subconjunto simplificado basado en indentación) ---
  transpilePython(src) {
    const lines = src.replace(/\t/g, '    ').split('\n');
    const out = [];
    const stack = [0]; // pila de niveles de indentación
    for (let rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (/^(from\s+\S+\s+import|import\s+\S+)/.test(trimmed)) continue; // ignorar imports
      const indent = rawLine.match(/^ */)[0].length;
      let line = rawLine.trim();
      // cerrar bloques según indentación
      while (indent < stack[stack.length - 1]) { stack.pop(); out.push('}'); }
      if (indent > stack[stack.length - 1]) { stack.push(indent); }
      // traducciones de línea
      line = line.replace(/#.*/, '');
      line = line.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
      line = line.replace(/\belif\b/g, 'else if');
      line = line.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\s+/g, '!');

      let opensBlock = /:\s*$/.test(line);
      line = line.replace(/:\s*$/, '');

      // def func(args): -> function* func(args)
      let m;
      if ((m = line.match(/^def\s+(\w+)\s*\(([^)]*)\)$/))) {
        line = `function* ${m[1]}(${m[2]})`;
      } else if ((m = line.match(/^while\s+(.+)$/))) {
        line = `while (${m[1]})`;
      } else if ((m = line.match(/^if\s+(.+)$/))) {
        line = `if (${m[1]})`;
      } else if ((m = line.match(/^else$/))) {
        line = `else`;
      } else if ((m = line.match(/^else if\s*(.+)$/))) {
        line = `else if (${m[1]})`;
      } else if ((m = line.match(/^for\s+(\w+)\s+in\s+range\s*\(([^)]*)\)$/))) {
        const args = m[2].split(',').map(s => s.trim());
        let a0 = '0', a1, a2 = '1';
        if (args.length === 1) { a1 = args[0]; } else if (args.length === 2) { a0 = args[0]; a1 = args[1]; } else { a0 = args[0]; a1 = args[1]; a2 = args[2]; }
        line = `for (let ${m[1]} = ${a0}; ${m[1]} < ${a1}; ${m[1]} += ${a2})`;
      }

      // machine.Pin(n, Pin.OUT/IN) asignado a variable -> lo dejamos como objeto simulado
      line = line.replace(/Pin\s*\(\s*(\d+)\s*,\s*Pin\.(OUT|IN)\s*\)/g, '__makePin($1, "$2")');
      line = line.replace(/(\w+)\.value\s*\(\s*\)/g, '$1.value()');
      line = line.replace(/(\w+)\.value\s*\(\s*(\d+|True|False|true|false)\s*\)/g, '$1.value($2)');
      line = line.replace(/(\w+)\.on\s*\(\s*\)/g, '$1.value(1)');
      line = line.replace(/(\w+)\.off\s*\(\s*\)/g, '$1.value(0)');
      // RPi.GPIO style
      line = line.replace(/GPIO\.setmode\([^)]*\)/g, '/*gpio mode*/ 0');
      line = line.replace(/GPIO\.setup\s*\(\s*(\w+)\s*,\s*GPIO\.(OUT|IN)\s*\)/g, 'pinMode($1, "$2"==="OUT"?1:0)');
      line = line.replace(/GPIO\.output\s*\(\s*(\w+)\s*,\s*GPIO\.(HIGH|LOW)\s*\)/g, 'digitalWrite($1, $2==="HIGH"?1:0)');
      line = line.replace(/GPIO\.output\s*\(\s*(\w+)\s*,\s*(True|False|true|false)\s*\)/g, 'digitalWrite($1, $2)');
      line = line.replace(/GPIO\.input\s*\(\s*(\w+)\s*\)/g, 'digitalRead($1)');
      // time.sleep
      line = line.replace(/time\.sleep_ms\s*\(([^)]+)\)/g, 'yield* __delay($1)');
      line = line.replace(/time\.sleep\s*\(([^)]+)\)/g, 'yield* __delay(($1)*1000)');
      line = line.replace(/\bprint\s*\(/g, 'Serial.println(');

      out.push(line + (opensBlock ? ' {' : ';'));
    }
    while (stack.length > 1) { stack.pop(); out.push('}'); }
    let body = out.join('\n');
    const hasExplicitLoop = /^\s*function\*\s+loop\s*\(/m.test(body);
    if (!hasExplicitLoop) {
      // Script estilo MicroPython "plano": todo el cuerpo se convierte en loop()
      body = 'function* loop() {\n' + body + '\n}';
    }
    return body;
  },
};

// Pin helper object para modo MicroPython (machine.Pin style)
function makePinFactory(api) {
  return function __makePin(num, mode) {
    api.pinMode(num, mode === 'OUT' ? 1 : 0);
    return {
      value(v) {
        if (v === undefined) return api.digitalRead(num);
        api.digitalWrite(num, v);
        return undefined;
      }
    };
  };
}

// ----------------------------------------------------------------------------
// Runner: ejecuta setup()/loop() como generadores, con delay() cooperativo
// ----------------------------------------------------------------------------
class ProgramRunner {
  constructor(pinBus, logFn) {
    this.pinBus = pinBus;
    this.log = logFn || (() => {});
    this.virtualTime = 0;
    this.state = 'idle'; // idle | setup | loop | error | stopped
    this.loopGen = null;
    this.setupGen = null;
    this.pendingDelayUntil = 0;
    this.loopIterationsThisFrame = 0;
    this.maxLoopItersPerFrame = 2000;
    this.serialBuffer = [];
  }

  buildApi() {
    const bus = this.pinBus;
    const self = this;
    const api = {
      pinMode: (pin, mode) => { bus.setMode(pin, mode === 1 ? 'OUTPUT' : mode === 2 ? 'INPUT_PULLUP' : 'INPUT'); },
      digitalWrite: (pin, val) => { bus.write(pin, val); },
      digitalRead: (pin) => bus.read(pin),
      analogWrite: (pin, val) => { bus.writePWM(pin, val); },
      analogRead: (pin) => bus.readAnalog(pin),
      millis: () => Math.floor(self.virtualTime),
      micros: () => Math.floor(self.virtualTime * 1000),
      Serial: {
        begin: () => {},
        print: (...a) => self._serial(a.join(' '), false),
        println: (...a) => self._serial(a.join(' '), true),
      },
      __delay: function* (ms) {
        const target = self.virtualTime + Number(ms || 0);
        while (self.virtualTime < target) { yield; }
      },
      __delayMicros: function* (us) {
        const target = self.virtualTime + Number(us || 0) / 1000;
        while (self.virtualTime < target) { yield; }
      },
      map: (x, inMin, inMax, outMin, outMax) => (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin,
      constrain: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
      random: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : Math.floor(Math.random() * (b - a)) + a),
      abs: Math.abs, min: Math.min, max: Math.max,
    };
    api.__makePin = makePinFactory(api);
    return api;
  }

  _serial(text, newline) {
    this.serialBuffer.push(text);
    this.log({ type: 'serial', text });
  }

  compile(language, source) {
    this.api = this.buildApi();
    let jsCode;
    try {
      if (language === 'blocks') {
        jsCode = source; // ya viene como JS generado por el editor de bloques
      } else if (language === 'cpp') {
        jsCode = CodeTranspiler.transpileCpp(source);
      } else {
        jsCode = CodeTranspiler.transpilePython(source);
      }
    } catch (e) {
      throw new Error('Error de transpilación: ' + e.message);
    }
    const paramNames = Object.keys(this.api);
    const factoryBody = jsCode + '\nreturn { setup: (typeof setup!=="undefined"?setup:null), loop: (typeof loop!=="undefined"?loop:null) };';
    let factory;
    try {
      // eslint-disable-next-line no-new-func
      factory = new Function(...paramNames, factoryBody);
    } catch (e) {
      throw new SyntaxError('Error de sintaxis: ' + e.message);
    }
    let result;
    try {
      result = factory(...paramNames.map(k => this.api[k]));
    } catch (e) {
      throw new Error('Error al inicializar el programa: ' + e.message);
    }
    if (!result.loop) throw new Error('No se encontró la función loop() / bucle principal.');
    this.setupFn = result.setup;
    this.loopFn = result.loop;
    this.state = 'ready';
  }

  start() {
    this.virtualTime = 0;
    this.pinBus.reset();
    this.state = 'setup';
    this.setupGen = this.setupFn ? this.setupFn() : null;
    this.loopGen = null;
  }

  stop() {
    this.state = 'stopped';
    this.loopGen = null;
    this.setupGen = null;
  }

  // avanza deltaMs de tiempo virtual (según velocidad) y ejecuta el programa
  tick(deltaMs) {
    if (this.state === 'stopped' || this.state === 'idle' || this.state === 'error') return;
    this.virtualTime += deltaMs;
    try {
      if (this.state === 'setup') {
        if (this.setupGen) {
          let safety = 0;
          let res;
          do { res = this.setupGen.next(); safety++; } while (!res.done && safety < 5000);
          if (!res.done) return; // sigue en delay, se reintentará en el próximo tick
        }
        this.state = 'loop';
      }
      if (this.state === 'loop') {
        let iters = 0;
        while (iters < this.maxLoopItersPerFrame) {
          if (!this.loopGen) this.loopGen = this.loopFn();
          const res = this.loopGen.next();
          if (res.done) { this.loopGen = null; iters++; continue; }
          else break; // yield => esperando delay, continuará el próximo tick
        }
      }
    } catch (e) {
      this.state = 'error';
      this.log({ type: 'error', text: 'Error en ejecución: ' + e.message });
    }
  }
}

// ----------------------------------------------------------------------------
// Validación de errores de circuito
// ----------------------------------------------------------------------------
function validateCircuit(instances, connections) {
  const issues = []; // {level: 'error'|'warn'|'info', msg, fix, ids:[instanceIds]}
  const byId = new Map(instances.map(i => [i.instId, i]));

  function portInfo(instId, portId) {
    const inst = byId.get(instId);
    if (!inst) return null;
    const def = findComponentDef(inst.defId);
    const port = def.ports.find(p => p.id === portId);
    return { inst, def, port };
  }

  // helper: ¿este componente está conectado (por cualquier puerto) a otro de cierta categoría?
  function connectedDefIds(instId) {
    const result = [];
    connections.forEach(c => {
      if (c.a.inst === instId) result.push(byId.get(c.b.inst)?.defId);
      if (c.b.inst === instId) result.push(byId.get(c.a.inst)?.defId);
    });
    return result.filter(Boolean);
  }

  connections.forEach(c => {
    const a = portInfo(c.a.inst, c.a.port);
    const b = portInfo(c.b.inst, c.b.port);
    if (!a || !b) return;

    // 1. Motor directo a microcontrolador/placa (sin driver)
    const aIsMotor = MOTOR_IDS.has(a.inst.defId), bIsMotor = MOTOR_IDS.has(b.inst.defId);
    const aIsCtrl = CONTROLLER_IDS.has(a.inst.defId), bIsCtrl = CONTROLLER_IDS.has(b.inst.defId);
    if ((aIsMotor && bIsCtrl) || (bIsMotor && aIsCtrl)) {
      const motorInst = aIsMotor ? a.inst : b.inst;
      const ctrlInst = aIsCtrl ? a.inst : b.inst;
      issues.push({
        level: 'error',
        msg: `⚠️ Motor "${findComponentDef(motorInst.defId).name}" conectado directamente al controlador "${findComponentDef(ctrlInst.defId).name}".`,
        fix: 'Añade un driver de motor, puente H, MOSFET o relé entre el controlador y el motor. Un pin digital no puede suministrar la corriente que necesita un motor.',
        ids: [motorInst.instId, ctrlInst.instId],
      });
    }

    // 2. Cortocircuito: un "+' de fuente conectado directo a un '-'/GND sin ninguna carga de por medio
    if (a.port.type === 'power' && b.port.type === 'power') {
      const isPos = (p) => /\+/.test(p.port.id) || /\+/.test(p.port.label) || /vcc|v\+|5v|3v3|12v/i.test(p.port.label);
      const isNeg = (p) => /-/.test(p.port.id) || /gnd/i.test(p.port.id) || /gnd|-/i.test(p.port.label);
      const SOURCE_IDS = new Set(['cab_bateria', 'cab_fuente']);
      const LOAD_IDS = new Set([...MOTOR_IDS, 'el_led', 'el_resistencia', 'el_mosfet', 'el_rele', 'el_transistor']);
      const aIsSource = SOURCE_IDS.has(a.inst.defId), bIsSource = SOURCE_IDS.has(b.inst.defId);
      const aIsLoad = LOAD_IDS.has(a.inst.defId), bIsLoad = LOAD_IDS.has(b.inst.defId);
      const oppositePolarity = (isPos(a) && isNeg(b)) || (isNeg(a) && isPos(b));
      const sameComponentShort = a.inst.instId === b.inst.instId && oppositePolarity;
      const directSourceShort = (aIsSource || bIsSource) && oppositePolarity && !aIsLoad && !bIsLoad && a.inst.instId !== b.inst.instId;
      if (sameComponentShort || directSourceShort) {
        issues.push({
          level: 'error',
          msg: `🔥 Cortocircuito detectado entre "${a.def.name}" (${a.port.label}) y "${b.def.name}" (${b.port.label}).`,
          fix: 'Nunca unas directamente el positivo y el negativo de una fuente. Coloca siempre una carga (motor, LED+resistencia, etc.) entre ambos polos.',
          ids: [a.inst.instId, b.inst.instId],
        });
      }
    }

    // 2b. Incompatibilidad de voltaje entre fuente y carga
    const vA = parseVoltageSpec(a.def), vB = parseVoltageSpec(b.def);
    if (vA && vB && a.port.type === 'power' && b.port.type === 'power') {
      if (vB.max && vA.nominal && vA.nominal > vB.max * 1.15) {
        issues.push({ level: 'error', msg: `⚡ Voltaje incompatible: "${a.def.name}" entrega ~${vA.nominal}V pero "${b.def.name}" admite hasta ${vB.max}V.`, fix: 'Usa un regulador de voltaje o una fuente con el voltaje adecuado.', ids: [a.inst.instId, b.inst.instId] });
      } else if (vA.max && vB.nominal && vB.nominal > vA.max * 1.15) {
        issues.push({ level: 'error', msg: `⚡ Voltaje incompatible: "${b.def.name}" entrega ~${vB.nominal}V pero "${a.def.name}" admite hasta ${vA.max}V.`, fix: 'Usa un regulador de voltaje o una fuente con el voltaje adecuado.', ids: [a.inst.instId, b.inst.instId] });
      }
    }

    // 3. Polaridad invertida si el usuario lo marcó
    if (a.inst.reversed || b.inst.reversed) {
      issues.push({ level: 'warn', msg: `Posible polaridad invertida en "${findComponentDef((a.inst.reversed ? a : b).inst.defId).name}".`, fix: 'Revisa que + vaya a + y - vaya a -.', ids: [a.inst.instId, b.inst.instId] });
    }

    // 4. Tipos de puerto incompatibles (mecánico con eléctrico, neumático con hidráulico, etc.)
    const PORT_GROUPS = { electrical: 'elec', digital: 'elec', analog: 'elec', power: 'elec', comm: 'elec', mechanical: 'mech', pneumatic: 'pneu', hydraulic: 'hydr' };
    if (PORT_GROUPS[a.port.type] !== PORT_GROUPS[b.port.type]) {
      issues.push({ level: 'error', msg: `Puertos incompatibles: ${a.def.name} (${a.port.type}) ↔ ${b.def.name} (${b.port.type}).`, fix: 'Conecta puertos del mismo tipo de dominio (mecánico, eléctrico o de fluidos), o usa un adaptador/driver adecuado.', ids: [a.inst.instId, b.inst.instId] });
    }
  });

  // 5. Sensores sin conexión alguna
  instances.forEach(inst => {
    const def = findComponentDef(inst.defId);
    if (!def) return;
    const cat = COMPONENT_LIBRARY.find(c => c.items.includes(def));
    const hasAnyConn = connections.some(c => c.a.inst === inst.instId || c.b.inst === inst.instId);
    if (cat && cat.id === 'sensores' && !hasAnyConn) {
      issues.push({ level: 'warn', msg: `El sensor "${def.name}" no está conectado a nada.`, fix: 'Conecta su pin de señal a una entrada analógica/digital de un controlador.', ids: [inst.instId] });
    }
    // 6. Motor sin alimentación
    if (MOTOR_IDS.has(def.id) && !hasAnyConn) {
      issues.push({ level: 'warn', msg: `El motor "${def.name}" no tiene ninguna conexión.`, fix: 'Conéctalo a una fuente de alimentación (a través de un driver si va controlado).', ids: [inst.instId] });
    }
    // 7. Falta de acople en ejes con pieza mecánica cercana sin conexión
  });

  return issues;
}

function parseVoltageSpec(def) {
  const raw = (def.specs && (def.specs.voltage)) || (def.electrical && def.electrical.voltage) || (def.specs && def.specs.voltage_num) || (def.id === 'cab_bateria' || def.id === 'cab_fuente' ? def.specs && def.specs.voltage : null);
  if (def.specs && typeof def.specs.voltage === 'number') return { nominal: def.specs.voltage, max: def.specs.voltage };
  if (!raw || typeof raw !== 'string') return null;
  const nums = raw.match(/[\d.]+/g);
  if (!nums) return null;
  const vals = nums.map(Number);
  return { nominal: vals[vals.length - 1], max: Math.max(...vals), min: Math.min(...vals) };
}

// ----------------------------------------------------------------------------
// Resolución de enlaces pin ↔ sensor/motor/LED (para que el código real
// controle la escena 3D). Recorre el grafo de conexiones en anchura.
// ----------------------------------------------------------------------------
function extractPinNumber(port) {
  const m = String(port.id).match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function buildPinLinks(instances, connections) {
  const byId = new Map(instances.map(i => [i.instId, i]));
  const adj = new Map(); // instId -> [{toInst, toPort, viaPort}]
  connections.forEach(c => {
    if (!adj.has(c.a.inst)) adj.set(c.a.inst, []);
    if (!adj.has(c.b.inst)) adj.set(c.b.inst, []);
    adj.get(c.a.inst).push({ inst: c.b.inst, port: c.b.port, fromPort: c.a.port });
    adj.get(c.b.inst).push({ inst: c.a.inst, port: c.a.port, fromPort: c.b.port });
  });

  function findControllerPin(startInstId) {
    const visited = new Set([startInstId]);
    let queue = (adj.get(startInstId) || []).map(e => ({ ...e, depth: 1 }));
    while (queue.length) {
      const { inst: curInst, port: curPort, depth } = queue.shift();
      if (visited.has(curInst + ':' + curPort)) continue;
      visited.add(curInst + ':' + curPort);
      const inst = byId.get(curInst);
      if (inst && CONTROLLER_IDS.has(inst.defId)) {
        const def = findComponentDef(inst.defId);
        const portDef = def.ports.find(p => p.id === curPort);
        if (portDef && (portDef.type === 'digital' || portDef.type === 'analog')) {
          const pin = extractPinNumber(portDef);
          if (pin !== null) return { instId: curInst, pin, kind: portDef.type };
        }
      }
      if (depth < 5 && !visited.has(curInst)) {
        visited.add(curInst);
        (adj.get(curInst) || []).forEach(e => queue.push({ ...e, depth: depth + 1 }));
      }
    }
    return null;
  }

  const sensorLinks = new Map(); // instId -> {pin, kind}
  const actuatorLinks = new Map(); // instId -> {pin, kind}
  instances.forEach(inst => {
    const def = findComponentDef(inst.defId);
    if (!def) return;
    const cat = COMPONENT_LIBRARY.find(c => c.items.includes(def));
    if (!cat) return;
    if (cat.id === 'sensores') {
      const link = findControllerPin(inst.instId);
      if (link) sensorLinks.set(inst.instId, link);
    }
    if (MOTOR_IDS.has(def.id) || def.id === 'el_led') {
      const link = findControllerPin(inst.instId);
      if (link) actuatorLinks.set(inst.instId, link);
    }
  });
  return { sensorLinks, actuatorLinks };
}
