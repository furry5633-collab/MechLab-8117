// ============================================================================
// MechLab Simulator — Visor 3D (Three.js)
// ============================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Scene3D {
  constructor(container, opts) {
    this.container = container;
    this.opts = opts || {};
    this.instances = new Map(); // instId -> {group, defId, instId, portMeshes:Map, state:{...}}
    this.connections = []; // {id, a:{inst,port}, b:{inst,port}, type, lineObj, status}
    this.selected = null;
    this.wiringFrom = null; // {inst, port} while making a connection
    this.onSelect = null;
    this.onPortClick = null;
    this.onTransformChange = null;

    this._initRenderer();
    this._initScene();
    this._initControls();
    this._bindEvents();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);
  }

  _initScene() {
    const scene = new THREE.Scene();
    this.scene = scene;
    this.setBackground(this.opts.dark);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    camera.position.set(3, 2.5, 4);
    this.camera = camera;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(4, 8, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -5; dir.shadow.camera.right = 5;
    dir.shadow.camera.top = 5; dir.shadow.camera.bottom = -5;
    scene.add(dir);
    this.dirLight = dir;

    this.grid = new THREE.GridHelper(10, 20, 0x6d8dff, 0x44527a);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.65;
    this.grid.position.y = 0;
    scene.add(this.grid);

    this.axes = new THREE.AxesHelper(1.2);
    scene.add(this.axes);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.001;
    scene.add(ground);
    this.ground = ground;

    this.workGroup = new THREE.Group();
    scene.add(this.workGroup);

    this.wireGroup = new THREE.Group();
    scene.add(this.wireGroup);

    this.portGroup = new THREE.Group();
    scene.add(this.portGroup);
  }

  setBackground(dark) {
    const bg = dark !== false ? 0x0b1020 : 0xe8edf4;
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = new THREE.Fog(bg, 10, 24);
    if (this.ground) this.ground.material.color.set(dark !== false ? 0x0b1020 : 0xd7deef);
    if (this.grid) this.grid.material.opacity = dark !== false ? 0.65 : 0.5;
  }

  _initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.3, 0);
    this.controls = controls;

    const tcontrols = new TransformControls(this.camera, this.renderer.domElement);
    tcontrols.setSize(0.8);
    tcontrols.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value; });
    tcontrols.addEventListener('objectChange', () => {
      if (this.selected && this.onTransformChange) this.onTransformChange(this.selected);
      this._updatePortsForInstance(this.selected);
      this._updateWiresForInstance(this.selected);
    });
    this.scene.add(tcontrols);
    this.tcontrols = tcontrols;
  }

  setTransformMode(mode) { this.tcontrols.setMode(mode); }

  _bindEvents() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    window.addEventListener('resize', () => this.resize());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate(t) {
    requestAnimationFrame(this._animate);
    this.controls.update();
    this.instances.forEach((inst) => { if (inst.update) inst.update(t); });
    this.renderer.render(this.scene, this.camera);
  }

  // ---------------------------------------------------------------------
  // Geometría paramétrica por tipo ("shape")
  // ---------------------------------------------------------------------
  _buildMesh(def) {
    const [sx, sy, sz] = def.size || [0.2, 0.2, 0.2];
    const color = def.color || '#888888';
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 });
    const group = new THREE.Group();
    let mesh;

    switch (def.shape) {
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx, sx, sy, 24), mat);
        break;
      case 'torus':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(sx, sy, 10, 24), mat);
        mesh.rotation.x = Math.PI / 2;
        break;
      case 'gear': {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 16), mat);
        const teeth = new THREE.Group();
        for (let i = 0; i < 12; i++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.12, sy, sx * 0.14), mat);
          const ang = (i / 12) * Math.PI * 2;
          tooth.position.set(Math.cos(ang) * sx / 2, 0, Math.sin(ang) * sx / 2);
          tooth.rotation.y = -ang;
          teeth.add(tooth);
        }
        group.add(teeth);
        break;
      }
      case 'hex':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx, sx, sy, 6), mat);
        break;
      case 'spring':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(sx, sx * 0.25, 8, 16), mat);
        { const sg = new THREE.Group(); for (let i=0;i<6;i++){ const c = mesh.clone(); c.position.y = -sy/2 + i*(sy/5); sg.add(c);} group.add(sg); mesh=null; }
        break;
      case 'belt':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'hinge':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sy, sy, sx, 12), mat);
        mesh.rotation.z = Math.PI / 2;
        break;
      case 'cam':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2.6, sy, 16), mat);
        break;
      case 'beam':
      case 'bracket':
      case 'chassis':
      case 'box':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'motor':
      case 'gearmotor':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx, sx, sy, 20), mat);
        mesh.rotation.x = Math.PI / 2;
        break;
      case 'stepper':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'servo':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'actuator':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'resistor':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sy / 2.4, sy / 2.4, sx, 12), mat);
        mesh.rotation.z = Math.PI / 2;
        break;
      case 'capacitor':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 16), mat);
        break;
      case 'diode':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sy / 2.5, sy / 2.5, sx, 10), mat);
        mesh.rotation.z = Math.PI / 2;
        break;
      case 'led': {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 16), new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.15, roughness: 0.3 }));
        group.userData.emissiveMat = mesh.material;
        break;
      }
      case 'transistor':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 12), mat);
        break;
      case 'relay':
      case 'driver':
      case 'board':
      case 'mcu':
      case 'plc':
      case 'chip8':
      case 'tripin':
      case 'module':
      case 'sensor':
      case 'battery':
      case 'switch':
      case 'valve':
      case 'gauge':
      case 'ground':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        break;
      case 'wire':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(sy, sy, sx, 8), mat);
        mesh.rotation.z = Math.PI / 2;
        break;
      default:
        mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    }
    if (mesh) group.add(mesh);
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // elevar para que apoye en y=0
    const box = new THREE.Box3().setFromObject(group);
    const lift = -box.min.y;
    group.children.forEach(c => c.position.y += lift);
    group.userData.baseColor = color;
    group.userData.mainMesh = mesh;
    return group;
  }

  // ---------------------------------------------------------------------
  // Añadir / eliminar instancias
  // ---------------------------------------------------------------------
  addInstance(def, position) {
    const instId = uid('i');
    const group = this._buildMesh(def);
    group.position.copy(position || new THREE.Vector3(0, 0, 0));
    group.name = instId;
    this.workGroup.add(group);

    const inst = {
      instId, defId: def.id, group, def,
      portMeshes: new Map(),
      props: { label: def.name, pinAssign: {}, reversed: false, simValue: 0 },
    };
    this.instances.set(instId, inst);
    this._buildPortsForInstance(inst);
    return inst;
  }

  removeInstance(instId) {
    const inst = this.instances.get(instId);
    if (!inst) return;
    this.connections = this.connections.filter(c => {
      const hit = c.a.inst === instId || c.b.inst === instId;
      if (hit) this.wireGroup.remove(c.lineObj);
      return !hit;
    });
    inst.portMeshes.forEach(m => this.portGroup.remove(m));
    this.workGroup.remove(inst.group);
    this.instances.delete(instId);
    if (this.selected === inst) this.select(null);
  }

  clearAll() {
    [...this.instances.keys()].forEach(id => this.removeInstance(id));
  }

  _buildPortsForInstance(inst) {
    const def = inst.def;
    (def.ports || []).forEach(p => {
      const geo = new THREE.SphereGeometry(0.022, 10, 10);
      const mat = new THREE.MeshStandardMaterial({ color: PORT_COLORS[p.type] || '#999', emissive: new THREE.Color(PORT_COLORS[p.type] || '#999'), emissiveIntensity: 0.5 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.userData = { instId: inst.instId, portId: p.id, portType: p.type, isPort: true };
      this.portGroup.add(sphere);
      inst.portMeshes.set(p.id, sphere);
    });
    this._updatePortsForInstance(inst);
  }

  _updatePortsForInstance(inst) {
    if (!inst) return;
    const def = inst.def;
    (def.ports || []).forEach(p => {
      const sphere = inst.portMeshes.get(p.id);
      if (!sphere) return;
      const local = new THREE.Vector3(...p.offset);
      const worldPos = local.clone();
      inst.group.updateMatrixWorld();
      worldPos.applyMatrix4(inst.group.matrixWorld);
      sphere.position.copy(worldPos);
    });
  }

  updateAllPorts() { this.instances.forEach(i => this._updatePortsForInstance(i)); }

  getPortWorldPos(instId, portId) {
    const inst = this.instances.get(instId);
    if (!inst) return new THREE.Vector3();
    const sphere = inst.portMeshes.get(portId);
    return sphere ? sphere.position.clone() : inst.group.position.clone();
  }

  // ---------------------------------------------------------------------
  // Conexiones (cables)
  // ---------------------------------------------------------------------
  addConnection(aInst, aPort, bInst, bPort, type) {
    const id = uid('c');
    const pA = this.getPortWorldPos(aInst, aPort);
    const pB = this.getPortWorldPos(bInst, bPort);
    const curve = this._wireCurve(pA, pB);
    const geo = new THREE.TubeGeometry(curve, 16, 0.012, 6, false);
    const mat = new THREE.MeshStandardMaterial({ color: PORT_COLORS[type] || '#999', emissive: new THREE.Color(PORT_COLORS[type] || '#999'), emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    this.wireGroup.add(mesh);
    const conn = { id, a: { inst: aInst, port: aPort }, b: { inst: bInst, port: bPort }, type, lineObj: mesh, status: 'ok' };
    this.connections.push(conn);
    return conn;
  }

  _wireCurve(pA, pB) {
    const mid = pA.clone().lerp(pB, 0.5);
    mid.y += Math.max(0.15, pA.distanceTo(pB) * 0.25);
    return new THREE.CatmullRomCurve3([pA, mid, pB]);
  }

  removeConnection(connId) {
    const idx = this.connections.findIndex(c => c.id === connId);
    if (idx === -1) return;
    this.wireGroup.remove(this.connections[idx].lineObj);
    this.connections.splice(idx, 1);
  }

  setConnectionStatus(connId, status) {
    const c = this.connections.find(cc => cc.id === connId);
    if (!c) return;
    c.status = status;
    const color = status === 'error' ? PORT_COLORS.error : status === 'warn' ? PORT_COLORS.warn : (PORT_COLORS[c.type] || PORT_COLORS.ok);
    c.lineObj.material.color.set(color);
    c.lineObj.material.emissive.set(color);
  }

  _updateWiresForInstance(inst) {
    if (!inst) return;
    this.connections.forEach(c => {
      if (c.a.inst === inst.instId || c.b.inst === inst.instId) {
        const pA = this.getPortWorldPos(c.a.inst, c.a.port);
        const pB = this.getPortWorldPos(c.b.inst, c.b.port);
        const curve = this._wireCurve(pA, pB);
        c.lineObj.geometry.dispose();
        c.lineObj.geometry = new THREE.TubeGeometry(curve, 16, 0.012, 6, false);
      }
    });
  }

  updateAllWires() { this.connections.forEach(c => this._updateWiresForInstance({ instId: c.a.inst })); }

  // ---------------------------------------------------------------------
  // Selección y picking
  // ---------------------------------------------------------------------
  _onPointerDown(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // 1. ¿clic en un puerto?
    const portHits = this.raycaster.intersectObjects(this.portGroup.children, false);
    if (portHits.length) {
      const d = portHits[0].object.userData;
      if (this.onPortClick) this.onPortClick(d.instId, d.portId, d.portType);
      return;
    }
    // 2. ¿clic en un componente?
    const hits = this.raycaster.intersectObjects(this.workGroup.children, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj.parent && obj.parent !== this.workGroup) obj = obj.parent;
      const inst = this.instances.get(obj.name);
      if (inst) { this.select(inst); return; }
    }
    this.select(null);
  }

  select(inst) {
    this.selected = inst;
    if (inst) { this.tcontrols.attach(inst.group); } else { this.tcontrols.detach(); }
    if (this.onSelect) this.onSelect(inst);
  }

  focusAll() {
    if (this.instances.size === 0) return;
    const box = new THREE.Box3();
    this.instances.forEach(i => box.expandByObject(i.group));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(center);
    const dir = this.camera.position.clone().sub(center).normalize();
    this.camera.position.copy(center.clone().add(dir.multiplyScalar(Math.max(2, size * 1.2))));
  }

  setView(view) {
    const dist = 4;
    const t = this.controls.target;
    switch (view) {
      case 'top': this.camera.position.set(t.x, t.y + dist, t.z + 0.001); break;
      case 'front': this.camera.position.set(t.x, t.y + 0.6, t.z + dist); break;
      case 'side': this.camera.position.set(t.x + dist, t.y + 0.6, t.z); break;
      default: this.camera.position.set(t.x + dist * 0.7, t.y + dist * 0.55, t.z + dist * 0.7);
    }
    this.camera.lookAt(t);
  }

  toggleGrid(v) { this.grid.visible = v; }
  toggleAxes(v) { this.axes.visible = v; }
  setWireframe(v) {
    this.instances.forEach(inst => inst.group.traverse(o => { if (o.isMesh) o.material.wireframe = v; }));
  }
  setHidden(instId, hidden) {
    const inst = this.instances.get(instId);
    if (inst) inst.group.visible = !hidden;
  }
}

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
