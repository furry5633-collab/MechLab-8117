// ============================================================================
// MechLab Simulator — main.js (orquestador de la aplicación)
// ============================================================================
import * as THREE from 'three';
import { Scene3D } from './scene3d.js';

// ---------------------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------------------
const state = {
  dark: true,
  speed: 1,
  running: false,          // rAF de simulación activo
  activeLang: 'cpp',
  codeState: {
    cpp: CODE_EXAMPLES.cpp[0].code,
    python: CODE_EXAMPLES.python[0].code,
  },
  wiringFrom: null,
  hasStarted: false,
  consoleCollapsed: false,
  spawnCounter: 0,
};

const pinBus = new PinBus();
const runner = new ProgramRunner(pinBus, handleRunnerLog);
let blockEditor = null;
let pinLinks = { sensorLinks: new Map(), actuatorLinks: new Map() };
let rafId = null;
let lastFrameTime = null;

// ---------------------------------------------------------------------------
// Escena 3D
// ---------------------------------------------------------------------------
const viewerEl = document.getElementById('viewer3d');
const scene3D = new Scene3D(viewerEl, { dark: state.dark });
scene3D.resize();
scene3D.setView('iso');

scene3D.onSelect = (inst) => renderProperties(inst);
scene3D.onPortClick = (instId, portId, portType) => handlePortClick(instId, portId, portType);
scene3D.onTransformChange = (inst) => { if (scene3D.selected === inst) renderProperties(inst); };

// ---------------------------------------------------------------------------
// Utilidades generales
// ---------------------------------------------------------------------------
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

function nowStr() {
  const d = new Date();
  return d.toLocaleTimeString('es-ES', { hour12: false });
}

function logConsole(text, level) {
  const view = $('#view-console');
  const line = el('div', 'log-line' + (level ? ' ' + level : ''));
  line.innerHTML = `<span class="time">${nowStr()}</span><span>${escapeHtml(text)}</span>`;
  view.appendChild(line);
  view.scrollTop = view.scrollHeight;
}

function logSerial(text) {
  const view = $('#view-serial');
  const line = el('div', 'log-line ok');
  line.innerHTML = `<span class="time">${nowStr()}</span><span>${escapeHtml(text)}</span>`;
  view.appendChild(line);
  view.scrollTop = view.scrollHeight;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function handleRunnerLog(entry) {
  if (entry.type === 'serial') logSerial(entry.text);
  else if (entry.type === 'error') { logConsole(entry.text, 'error'); showIssues([{ level: 'error', msg: entry.text, fix: 'Revisa la sintaxis y la lógica de tu programa en el editor de código.', ids: [] }], true); }
}

// ---------------------------------------------------------------------------
// BIBLIOTECA DE COMPONENTES
// ---------------------------------------------------------------------------
function buildLibrary(filter) {
  const host = $('#categoryList');
  host.innerHTML = '';
  const f = (filter || '').trim().toLowerCase();
  COMPONENT_LIBRARY.forEach(cat => {
    const items = cat.items.filter(it => !f || it.name.toLowerCase().includes(f) || it.desc.toLowerCase().includes(f));
    if (f && items.length === 0) return;
    const catEl = el('div', 'category' + (f ? ' open' : ''));
    catEl.dataset.cat = cat.id;
    const head = el('div', 'category-head', `<span>${cat.icon}</span><span>${cat.label}</span><span class="muted" style="font-size:11px">(${items.length})</span><span class="chev">▶</span>`);
    head.onclick = () => catEl.classList.toggle('open');
    catEl.appendChild(head);
    const body = el('div', 'category-items');
    items.forEach(item => body.appendChild(buildLibraryItem(item)));
    catEl.appendChild(body);
    host.appendChild(catEl);
  });
}

function buildLibraryItem(def) {
  const row = el('div', 'lib-item');
  row.draggable = true;
  row.innerHTML = `<span class="lib-swatch" style="background:${def.color}"></span><span class="name">${def.name}</span><span class="info-btn" title="Ficha técnica">ℹ️</span>`;
  row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', def.id); });
  row.addEventListener('click', (e) => {
    if (e.target.classList.contains('info-btn')) { showComponentInfo(def); return; }
    addComponentToScene(def.id);
  });
  return row;
}

$('#librarySearch').addEventListener('input', (e) => buildLibrary(e.target.value));
buildLibrary('');

// ---------------------------------------------------------------------------
// Añadir componentes a la escena
// ---------------------------------------------------------------------------
function nextSpawnPosition() {
  const n = state.spawnCounter++;
  const cols = 5;
  const x = (n % cols) * 0.55 - 1.1;
  const z = Math.floor(n / cols) * 0.55 - 1.1;
  return new THREE.Vector3(x, 0, z);
}

function addComponentToScene(defId, position) {
  const def = findComponentDef(defId);
  if (!def) return;
  const inst = scene3D.addInstance(def, position || nextSpawnPosition());
  attachRuntimeBehavior(inst);
  scene3D.select(inst);
  activateCenterTab('viewer');
  logConsole(`➕ Añadido "${def.name}" a la escena.`, 'info');
  $('#viewerHint').classList.add('hidden');
  return inst;
}

// drag & drop sobre el visor 3D
viewerEl.addEventListener('dragover', (e) => e.preventDefault());
viewerEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const defId = e.dataTransfer.getData('text/plain');
  if (!defId) return;
  const rect = viewerEl.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, scene3D.camera);
  const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeY0, point);
  addComponentToScene(defId, point || undefined);
});

// ---------------------------------------------------------------------------
// Ficha técnica de componentes (modal)
// ---------------------------------------------------------------------------
function showComponentInfo(def) {
  const modal = $('#chipModal');
  const body = $('#chipModalBody');
  const s = def.specs || {};
  let html = `<h2>${def.name}</h2><p class="muted">${def.desc}</p>`;
  const rows = [];
  if (s.usage) rows.push(['Para qué sirve', s.usage]);
  if (s.controls) rows.push(['Qué puede controlar', s.controls]);
  if (s.voltage || (def.electrical && def.electrical.voltage)) rows.push(['Voltaje', s.voltage || def.electrical.voltage]);
  if (s.current || (def.electrical && def.electrical.current)) rows.push(['Corriente', s.current || def.electrical.current]);
  if (s.pins) rows.push(['Pines', s.pins]);
  if (s.memory) rows.push(['Memoria', s.memory]);
  if (s.interfaces) rows.push(['Interfaces', s.interfaces.join(', ')]);
  if (s.sensorsCompatible) rows.push(['Sensores compatibles', s.sensorsCompatible.join(', ')]);
  if (s.motorsCompatible) rows.push(['Motores/actuadores compatibles', s.motorsCompatible.join(', ')]);
  if (rows.length) {
    html += '<div class="spec-list">' + rows.map(([k, v]) => `<div class="spec-item"><b>${k}:</b> ${v}</div>`).join('') + '</div>';
  }
  if (s.exampleWiring) html += `<h4>🔌 Ejemplo de conexión</h4><p class="muted">${s.exampleWiring}</p>`;
  if (s.exampleCode) html += `<h4>💻 Ejemplo de código</h4><pre class="code-block">${escapeHtml(s.exampleCode)}</pre>`;
  if (s.commonErrors) html += `<h4>⚠️ Errores frecuentes</h4><ul>${s.commonErrors.map(e => `<li>${e}</li>`).join('')}</ul>`;
  body.innerHTML = html;
  modal.classList.remove('hidden');
}
$('#chipModalClose').onclick = () => $('#chipModal').classList.add('hidden');
$('#chipModal').addEventListener('click', (e) => { if (e.target.id === 'chipModal') $('#chipModal').classList.add('hidden'); });

// ---------------------------------------------------------------------------
// PANEL DE PROPIEDADES
// ---------------------------------------------------------------------------
function renderProperties(inst) {
  const host = $('#propertiesBody');
  host.innerHTML = '';
  if (!inst) { host.innerHTML = '<p class="muted">Selecciona un componente en el visor 3D para ver sus propiedades.</p>'; return; }
  const def = inst.def;

  const title = el('div', 'prop-group', `<h4>Componente</h4>`);
  const nameRow = el('div', 'prop-row');
  nameRow.innerHTML = `<label>Nombre</label>`;
  const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.value = inst.props.label;
  nameInput.onchange = () => { inst.props.label = nameInput.value; };
  nameRow.appendChild(nameInput);
  title.appendChild(nameRow);
  title.appendChild(el('div', 'prop-row', `<label>Tipo</label><span>${def.name}</span>`));
  const colorRow = el('div', 'prop-row'); colorRow.innerHTML = '<label>Color</label>';
  const colorInput = document.createElement('input'); colorInput.type = 'color'; colorInput.value = rgbToHex(def.color);
  colorInput.oninput = () => { inst.group.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material.color.set(colorInput.value); }); };
  colorRow.appendChild(colorInput);
  title.appendChild(colorRow);
  host.appendChild(title);

  // Transform
  const tgroup = el('div', 'prop-group', '<h4>Transformación</h4>');
  tgroup.appendChild(buildVecRow('Posición', inst.group.position, 0.01));
  tgroup.appendChild(buildVecRowDeg('Rotación (°)', inst.group.rotation));
  tgroup.appendChild(buildVecRow('Escala', inst.group.scale, 0.05, 0.05));
  const btnRow = el('div', 'prop-row');
  ['translate', 'rotate', 'scale'].forEach(mode => {
    const b = document.createElement('button'); b.className = 'prop-btn'; b.style.flex = '1'; b.textContent = { translate: '↔ Mover', rotate: '⟳ Girar', scale: '⤢ Escalar' }[mode];
    b.onclick = () => scene3D.setTransformMode(mode);
    btnRow.appendChild(b);
  });
  tgroup.appendChild(btnRow);
  host.appendChild(tgroup);

  // Específico: sensores
  const cat = COMPONENT_LIBRARY.find(c => c.items.includes(def));
  if (cat && cat.id === 'sensores') {
    const sgroup = el('div', 'prop-group', '<h4>Simulación del sensor</h4>');
    const row1 = el('div', 'prop-row'); row1.innerHTML = '<label>Valor digital</label>';
    const toggle = document.createElement('select');
    toggle.innerHTML = '<option value="0">LOW (0)</option><option value="1">HIGH (1)</option>';
    toggle.value = inst.props.simValue ? '1' : '0';
    toggle.onchange = () => { inst.props.simValue = Number(toggle.value) ? 1023 : 0; inst.props.simDigital = Number(toggle.value); };
    row1.appendChild(toggle);
    sgroup.appendChild(row1);
    const row2 = el('div', 'prop-row'); row2.innerHTML = '<label>Valor analógico (0-1023)</label>';
    const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 1023; range.value = inst.props.simValue || 0;
    range.oninput = () => { inst.props.simValue = Number(range.value); };
    row2.appendChild(range);
    sgroup.appendChild(row2);
    sgroup.appendChild(el('p', 'muted', 'Conecta este sensor a un pin digital/analógico del controlador para que estos valores lleguen a tu código en tiempo real.'));
    host.appendChild(sgroup);
  }

  // Específico: motores — mostrar velocidad simulada en vivo
  if (MOTOR_IDS.has(def.id)) {
    const mgroup = el('div', 'prop-group', '<h4>Estado del actuador</h4>');
    mgroup.appendChild(el('p', 'muted', `Velocidad actual: <b>${Math.round(((inst.runtime && inst.runtime.speed) || 0))}</b> (controlada por el pin conectado durante la simulación).`));
    const revRow = el('div', 'prop-row'); revRow.innerHTML = '<label>Polaridad invertida (demo error)</label>';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!inst.reversed;
    chk.onchange = () => { inst.reversed = chk.checked; };
    revRow.appendChild(chk);
    mgroup.appendChild(revRow);
    host.appendChild(mgroup);
  }

  // Ficha técnica si es un chip/electrónica con specs
  if (def.specs) {
    const infoGroup = el('div', 'prop-group', '<h4>Ficha técnica</h4>');
    const btn = document.createElement('button'); btn.className = 'prop-btn'; btn.textContent = 'Ver ficha técnica completa';
    btn.onclick = () => showComponentInfo(def);
    infoGroup.appendChild(btn);
    host.appendChild(infoGroup);
  }

  // Puertos
  if (def.ports && def.ports.length) {
    const pgroup = el('div', 'prop-group', '<h4>Puertos y conexiones</h4>');
    def.ports.forEach(p => {
      const connected = scene3D.connections.some(c => (c.a.inst === inst.instId && c.a.port === p.id) || (c.b.inst === inst.instId && c.b.port === p.id));
      const chip = el('div', 'port-chip');
      chip.innerHTML = `<span class="port-dot" style="background:${PORT_COLORS[p.type]}"></span> ${p.label} ${connected ? '✅' : ''}`;
      chip.style.cursor = 'pointer';
      chip.title = connected ? 'Conectado (clic para iniciar otra conexión)' : 'Clic para conectar';
      chip.onclick = () => handlePortClick(inst.instId, p.id, p.type);
      pgroup.appendChild(chip);
    });
    host.appendChild(pgroup);
  }

  // Acciones
  const actGroup = el('div', 'prop-group');
  const dupBtn = document.createElement('button'); dupBtn.className = 'prop-btn'; dupBtn.textContent = '⧉ Duplicar';
  dupBtn.onclick = () => { const clone = addComponentToScene(def.id, inst.group.position.clone().add(new THREE.Vector3(0.3, 0, 0.3))); };
  actGroup.appendChild(dupBtn);
  const delBtn = document.createElement('button'); delBtn.className = 'prop-btn danger'; delBtn.textContent = '🗑️ Eliminar componente';
  delBtn.onclick = () => { scene3D.removeInstance(inst.instId); renderProperties(null); };
  actGroup.appendChild(delBtn);
  host.appendChild(actGroup);
}

function buildVecRow(label, vec, step) {
  const row = el('div', 'prop-row'); row.innerHTML = `<label>${label}</label>`;
  const wrap = el('div', 'xyz-row');
  ['x', 'y', 'z'].forEach(axis => {
    const input = document.createElement('input'); input.type = 'number'; input.step = step; input.value = vec[axis].toFixed(3);
    input.onchange = () => { vec[axis] = Number(input.value); scene3D._updatePortsForInstance(scene3D.selected); scene3D._updateWiresForInstance(scene3D.selected); };
    wrap.appendChild(input);
  });
  row.appendChild(wrap);
  return row;
}
function buildVecRowDeg(label, euler) {
  const row = el('div', 'prop-row'); row.innerHTML = `<label>${label}</label>`;
  const wrap = el('div', 'xyz-row');
  ['x', 'y', 'z'].forEach(axis => {
    const input = document.createElement('input'); input.type = 'number'; input.step = 1; input.value = Math.round(THREE.MathUtils.radToDeg(euler[axis]));
    input.onchange = () => { euler[axis] = THREE.MathUtils.degToRad(Number(input.value)); scene3D._updatePortsForInstance(scene3D.selected); scene3D._updateWiresForInstance(scene3D.selected); };
    wrap.appendChild(input);
  });
  row.appendChild(wrap);
  return row;
}
function rgbToHex(c) { return c && c.startsWith('#') ? c : '#888888'; }

// ---------------------------------------------------------------------------
// Comportamiento en tiempo real de actuadores/sensores (rotación, brillo...)
// ---------------------------------------------------------------------------
function attachRuntimeBehavior(inst) {
  const def = inst.def;
  inst.runtime = { speed: 0, angle: 0, on: 0 };
  if (['motor', 'gearmotor', 'stepper', 'servo'].includes(def.shape)) {
    const shaftPort = (def.ports || []).find(p => p.id === 'shaft');
    const offset = shaftPort ? shaftPort.offset : [0, (def.size[1] || 0.2) / 2, 0];
    const geo = new THREE.BoxGeometry(0.05, 0.14, 0.015);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x3355ff, emissiveIntensity: 0.6 });
    const indicator = new THREE.Mesh(geo, mat);
    indicator.position.set(offset[0], offset[1] + 0.03, offset[2]);
    inst.group.add(indicator);
    inst.update = () => {
      if (def.shape === 'servo') indicator.rotation.y = THREE.MathUtils.degToRad((inst.runtime.angle || 0) - 90);
      else indicator.rotation.y += (inst.runtime.speed || 0) * 0.02;
    };
  } else if (def.shape === 'led') {
    inst.update = () => { const mat = inst.group.userData.emissiveMat; if (mat) mat.emissiveIntensity = 0.1 + (inst.runtime.on || 0) * 1.6; };
  }
}

// ---------------------------------------------------------------------------
// CABLEADO (conexiones)
// ---------------------------------------------------------------------------
function handlePortClick(instId, portId, portType) {
  const banner = $('#wiringBanner');
  if (!state.wiringFrom) {
    state.wiringFrom = { instId, portId, portType };
    banner.classList.remove('hidden');
    logConsole(`🔌 Puerto de origen seleccionado (${portType}). Elige el puerto de destino…`, 'info');
    return;
  }
  if (state.wiringFrom.instId === instId && state.wiringFrom.portId === portId) {
    // clic en el mismo puerto: cancelar
    state.wiringFrom = null; banner.classList.add('hidden'); return;
  }
  const from = state.wiringFrom;
  state.wiringFrom = null;
  banner.classList.add('hidden');

  const conn = scene3D.addConnection(from.instId, from.portId, instId, portId, from.portType);
  logConsole(`🔗 Conexión creada: ${from.portType} ↔ ${portType}.`, 'ok');
  if (scene3D.selected) renderProperties(scene3D.selected);
  runValidation(false);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.wiringFrom) { state.wiringFrom = null; $('#wiringBanner').classList.add('hidden'); }
});

// ---------------------------------------------------------------------------
// VALIDACIÓN DE CIRCUITO / ERRORES
// ---------------------------------------------------------------------------
function getInstancesArray() { return Array.from(scene3D.instances.values()); }

function showIssues(issues, append) {
  const view = $('#view-errors');
  if (!append) view.innerHTML = '';
  if (!issues.length && !append) { view.innerHTML = '<p class="muted">✅ No se detectaron errores en el circuito.</p>'; }
  issues.forEach(issue => {
    const card = el('div', 'err-card' + (issue.level === 'warn' ? ' warn' : ''));
    card.innerHTML = `<div class="msg">${issue.level === 'error' ? '🔴' : '🟡'} ${escapeHtml(issue.msg)}</div><div class="fix">💡 Solución: ${escapeHtml(issue.fix)}</div>`;
    card.onclick = () => { issue.ids.forEach(id => { const inst = scene3D.instances.get(id); if (inst) scene3D.select(inst); }); };
    view.appendChild(card);
  });
  const total = $('#view-errors').querySelectorAll('.err-card').length;
  const badge = $('#errorCount');
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
}

function runValidation(switchTab) {
  const issues = validateCircuit(getInstancesArray(), scene3D.connections);
  showIssues(issues, false);
  // colorear conexiones afectadas
  scene3D.connections.forEach(c => scene3D.setConnectionStatus(c.id, 'ok'));
  issues.forEach(issue => {
    if (issue.ids.length === 2) {
      scene3D.connections.forEach(c => {
        const match = (c.a.inst === issue.ids[0] && c.b.inst === issue.ids[1]) || (c.a.inst === issue.ids[1] && c.b.inst === issue.ids[0]);
        if (match) scene3D.setConnectionStatus(c.id, issue.level);
      });
    }
  });
  logConsole(`🔎 Validación completada: ${issues.filter(i => i.level === 'error').length} error(es), ${issues.filter(i => i.level === 'warn').length} advertencia(s).`, issues.some(i => i.level === 'error') ? 'error' : 'ok');
  if (switchTab) activateConsoleTab('errors');
  return issues;
}
$('#btnValidate').onclick = () => runValidation(true);

// ---------------------------------------------------------------------------
// EDITOR DE CÓDIGO (CodeMirror + bloques)
// ---------------------------------------------------------------------------
const HINTS = {
  cpp: ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'millis', 'Serial.begin', 'Serial.print', 'Serial.println', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'void setup()', 'void loop()', 'map', 'constrain'],
  python: ['machine', 'Pin', 'Pin.OUT', 'Pin.IN', 'time.sleep', 'time.sleep_ms', 'GPIO.setmode', 'GPIO.setup', 'GPIO.output', 'GPIO.input', 'print', 'while True:'],
};

const cmEditor = CodeMirror(document.getElementById('editorHost'), {
  value: state.codeState.cpp,
  mode: 'text/x-c++src',
  theme: state.dark ? 'dracula' : 'eclipse',
  lineNumbers: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  indentUnit: 2,
  tabSize: 2,
  extraKeys: {
    'Ctrl-Space': 'autocomplete',
    'Tab': (cm) => cm.replaceSelection('  '),
  },
  hintOptions: { hint: customHint },
});

function customHint(cm) {
  const list = HINTS[state.activeLang] || [];
  const cur = cm.getCursor();
  const token = cm.getTokenAt(cur);
  const start = token.start, end = cur.ch;
  const word = token.string;
  const candidates = list.filter(w => w.toLowerCase().startsWith(word.toLowerCase()));
  return { list: candidates.length ? candidates : list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
}

cmEditor.on('inputRead', (cm, change) => {
  if (change.text[0] && /[a-zA-Z_.]/.test(change.text[0])) {
    CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
  }
});

let checkTimeout = null;
cmEditor.on('change', () => {
  state.codeState[state.activeLang] = cmEditor.getValue();
  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(liveCheck, 500);
});

function liveCheck() {
  if (state.activeLang === 'blocks') return;
  try {
    const tmpRunner = new ProgramRunner(new PinBus(), () => {});
    tmpRunner.compile(state.activeLang, cmEditor.getValue());
    setEditorStatus(true, '✓ Sin errores de sintaxis');
  } catch (e) {
    setEditorStatus(false, '✗ ' + e.message);
  }
}
function checkBlocksCode() {
  try {
    new ProgramRunner(new PinBus(), () => {}).compile('blocks', blockEditor.getCode());
    setEditorStatus(true, '✓ Sin errores de sintaxis');
  } catch (e) {
    setEditorStatus(false, '✗ ' + e.message);
  }
}
let statusEl = null;
function setEditorStatus(ok, text) {
  if (!statusEl) {
    statusEl = el('div');
    statusEl.style.cssText = 'position:absolute;bottom:6px;right:12px;font-size:11px;padding:3px 9px;border-radius:10px;z-index:5;';
    document.getElementById('code-wrap').appendChild(statusEl);
  }
  statusEl.textContent = text;
  statusEl.style.background = ok ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)';
  statusEl.style.color = ok ? '#22c55e' : '#ef4444';
}

// Pestañas de lenguaje
$all('.lang-tab').forEach(tab => {
  tab.onclick = () => {
    $all('.lang-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeLang = tab.dataset.lang;
    populateExamples();
    if (state.activeLang === 'blocks') {
      document.getElementById('editorHost').classList.add('hidden');
      document.getElementById('blocksHost').classList.remove('hidden');
      if (!blockEditor) blockEditor = new BlockEditor(document.getElementById('blocksHost'), checkBlocksCode);
      else checkBlocksCode();
    } else {
      document.getElementById('editorHost').classList.remove('hidden');
      document.getElementById('blocksHost').classList.add('hidden');
      cmEditor.setOption('mode', state.activeLang === 'cpp' ? 'text/x-c++src' : 'text/x-python');
      cmEditor.setValue(state.codeState[state.activeLang]);
      setTimeout(() => cmEditor.refresh(), 10);
      liveCheck();
    }
  };
});

function populateExamples() {
  const sel = $('#exampleSelect');
  sel.innerHTML = '<option value="">— Cargar ejemplo —</option>';
  const list = CODE_EXAMPLES[state.activeLang] || [];
  list.forEach((ex, i) => { const op = document.createElement('option'); op.value = i; op.textContent = ex.name; sel.appendChild(op); });
  sel.disabled = state.activeLang === 'blocks';
}
$('#exampleSelect').onchange = (e) => {
  const idx = e.target.value;
  if (idx === '') return;
  const ex = CODE_EXAMPLES[state.activeLang][idx];
  state.codeState[state.activeLang] = ex.code;
  cmEditor.setValue(ex.code);
  liveCheck();
};
populateExamples();

// Pestañas del panel central (Visor 3D / Código)
function activateCenterTab(name) {
  $all('.center-tab').forEach(t => t.classList.toggle('active', t.dataset.centerTab === name));
  $('#viewer-wrap').classList.toggle('active', name === 'viewer');
  $('#code-wrap').classList.toggle('active', name === 'code');
  if (name === 'viewer') scene3D.resize();
  if (name === 'code') setTimeout(() => cmEditor.refresh(), 10);
}
$all('.center-tab').forEach(t => t.onclick = () => activateCenterTab(t.dataset.centerTab));

// ---------------------------------------------------------------------------
// SIMULACIÓN: Play / Pause / Reset / Velocidad
// ---------------------------------------------------------------------------
function getActiveSource() {
  if (state.activeLang === 'blocks') return { lang: 'blocks', code: blockEditor ? blockEditor.getCode() : 'function* loop(){}' };
  return { lang: state.activeLang, code: cmEditor.getValue() };
}

function doPlay() {
  if (!state.hasStarted) {
    const issues = runValidation(false);
    const src = getActiveSource();
    try {
      runner.compile(src.lang, src.code);
    } catch (e) {
      logConsole('✗ Error de compilación: ' + e.message, 'error');
      showIssues([{ level: 'error', msg: 'Error de compilación: ' + e.message, fix: 'Revisa la sintaxis de tu programa en el editor de código.', ids: [] }], true);
      activateConsoleTab('errors');
      return;
    }
    runner.start();
    pinLinks = buildPinLinks(getInstancesArray(), scene3D.connections);
    state.hasStarted = true;
    logConsole('▶ Simulación iniciada.', 'ok');
  } else {
    logConsole('▶ Simulación reanudada.', 'ok');
  }
  state.running = true;
  lastFrameTime = null;
  $('#btnPlay').disabled = true;
  $('#btnPause').disabled = false;
  if (!rafId) rafId = requestAnimationFrame(simLoop);
}

function doPause() {
  state.running = false;
  $('#btnPlay').disabled = false;
  $('#btnPause').disabled = true;
  logConsole('⏸ Simulación en pausa.', 'info');
}

function doReset() {
  state.running = false;
  state.hasStarted = false;
  runner.stop();
  pinBus.reset();
  scene3D.instances.forEach(inst => { if (inst.runtime) { inst.runtime.speed = 0; inst.runtime.angle = 0; inst.runtime.on = 0; } });
  $('#btnPlay').disabled = false;
  $('#btnPause').disabled = true;
  logConsole('⟲ Simulación reiniciada.', 'info');
}

function simLoop(t) {
  if (!state.running) { rafId = null; return; }
  if (lastFrameTime === null) lastFrameTime = t;
  const rawDelta = Math.min(100, t - lastFrameTime);
  lastFrameTime = t;
  const delta = rawDelta * state.speed;

  // 1. aplicar entradas simuladas de sensores al bus de pines
  pinLinks.sensorLinks.forEach((link, instId) => {
    const inst = scene3D.instances.get(instId);
    if (!inst) return;
    if (link.kind === 'analog') pinBus.setAnalogIn(link.pin, inst.props.simValue || 0);
    else pinBus.digital[link.pin] = (inst.props.simValue > 0) ? 1 : 0;
  });

  // 2. avanzar el programa del usuario
  runner.tick(delta);

  // 3. aplicar salidas a motores / LEDs
  pinLinks.actuatorLinks.forEach((link, instId) => {
    const inst = scene3D.instances.get(instId);
    if (!inst || !inst.runtime) return;
    const pwmVal = pinBus.pwm[link.pin];
    const digitalVal = pinBus.digital[link.pin] || 0;
    const value = (pwmVal !== undefined) ? pwmVal : digitalVal * 255;
    if (MOTOR_IDS.has(inst.defId)) {
      inst.runtime.speed = (value / 255) * 14;
      inst.runtime.angle = (value / 255) * 180;
    } else if (inst.defId === 'el_led') {
      inst.runtime.on = value / 255;
    }
  });

  rafId = requestAnimationFrame(simLoop);
}

$('#btnPlay').onclick = doPlay;
$('#btnPause').onclick = doPause;
$('#btnReset').onclick = doReset;
$('#speedSelect').onchange = (e) => { state.speed = Number(e.target.value); };

// ---------------------------------------------------------------------------
// VISTA 3D: controles de cámara / rejilla / ejes / alambre
// ---------------------------------------------------------------------------
$all('[data-view]').forEach(btn => btn.onclick = () => scene3D.setView(btn.dataset.view));
$('#btnFocus').onclick = () => scene3D.focusAll();
$('#btnGrid').onclick = (e) => { const on = e.currentTarget.dataset.active !== '1'; e.currentTarget.dataset.active = on ? '1' : '0'; e.currentTarget.classList.toggle('toggle-on', on); scene3D.toggleGrid(on); };
$('#btnAxes').onclick = (e) => { const on = e.currentTarget.dataset.active !== '1'; e.currentTarget.dataset.active = on ? '1' : '0'; e.currentTarget.classList.toggle('toggle-on', on); scene3D.toggleAxes(on); };
$('#btnGrid').dataset.active = '1'; $('#btnAxes').dataset.active = '1';
$('#btnWireframe').onclick = (e) => { const on = e.currentTarget.dataset.active !== '1'; e.currentTarget.dataset.active = on ? '1' : '0'; e.currentTarget.classList.toggle('toggle-on', on); scene3D.setWireframe(on); };

// ---------------------------------------------------------------------------
// TEMA CLARO / OSCURO
// ---------------------------------------------------------------------------
$('#btnTheme').onclick = () => {
  state.dark = !state.dark;
  document.body.classList.toggle('theme-dark', state.dark);
  document.body.classList.toggle('theme-light', !state.dark);
  $('#btnTheme').textContent = state.dark ? '🌙' : '☀️';
  scene3D.setBackground(state.dark);
  cmEditor.setOption('theme', state.dark ? 'dracula' : 'eclipse');
};

// ---------------------------------------------------------------------------
// CONSOLA inferior
// ---------------------------------------------------------------------------
function activateConsoleTab(name) {
  $all('.console-tab').forEach(t => t.classList.toggle('active', t.dataset.consoleTab === name));
  $all('.console-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if ($('#console-panel').classList.contains('collapsed')) toggleConsoleCollapse(false);
}
$all('.console-tab').forEach(t => t.onclick = () => activateConsoleTab(t.dataset.consoleTab));
function toggleConsoleCollapse(force) {
  const panel = $('#console-panel');
  const collapsed = force !== undefined ? force : !panel.classList.contains('collapsed');
  panel.classList.toggle('collapsed', collapsed);
  $('#btnCollapseConsole').textContent = collapsed ? '▸' : '▾';
}
$('#btnCollapseConsole').onclick = () => toggleConsoleCollapse();
$('#btnClearConsole').onclick = () => {
  $('#view-console').innerHTML = '';
  $('#view-serial').innerHTML = '';
};

// ---------------------------------------------------------------------------
// DRAWERS MÓVILES (biblioteca / propiedades)
// ---------------------------------------------------------------------------
function openDrawer(id) {
  document.getElementById(id).classList.add('open');
  $all('.drawer-backdrop').forEach(b => { if (b.dataset.backdrop === id) b.classList.add('show'); });
}
function closeDrawer(id) {
  document.getElementById(id).classList.remove('open');
  $all('.drawer-backdrop').forEach(b => { if (b.dataset.backdrop === id) b.classList.remove('show'); });
}
$('#btnMenuLeft').onclick = () => openDrawer('library-panel');
$('#btnMenuRight').onclick = () => openDrawer('properties-panel');
$all('.close-drawer').forEach(b => b.onclick = () => closeDrawer(b.dataset.close));
$all('.drawer-backdrop').forEach(b => b.onclick = () => closeDrawer(b.dataset.backdrop));

// ---------------------------------------------------------------------------
// Mensaje de bienvenida
// ---------------------------------------------------------------------------
logConsole('👋 Bienvenido a MechLab Simulator. Arrastra componentes desde la biblioteca, conéctalos y pulsa Play.', 'info');
showIssues([], false);

// Hook de depuración / pruebas automatizadas
window.MechLab = { scene3D, runner, pinBus, addComponentToScene, buildPinLinks, validateCircuit, state, getInstancesArray, cmEditor, runValidation };

