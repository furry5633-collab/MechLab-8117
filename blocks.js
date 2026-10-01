// ============================================================================
// MechLab Simulator — Editor de bloques (para principiantes)
// Genera código JS (generador) compatible con el motor de simulación.
// ============================================================================

const BLOCK_DEFS = {
  setPin: { label: '🔌 Poner pin en estado', container: false },
  pwmPin: { label: '🎚️ Escribir PWM en pin', container: false },
  wait: { label: '⏱️ Esperar (ms)', container: false },
  ifPin: { label: '❓ Si pin … entonces / si no', container: true, hasElse: true },
  repeat: { label: '🔁 Repetir N veces', container: true },
  whileTrue: { label: '♾️ Mientras (siempre)', container: true },
  print: { label: '🖨️ Imprimir mensaje', container: false },
};

function newBlock(type) {
  const base = { id: 'b_' + Math.random().toString(36).slice(2, 8), type, fields: {}, children: [], elseChildren: [] };
  switch (type) {
    case 'setPin': base.fields = { pin: 9, val: 'HIGH' }; break;
    case 'pwmPin': base.fields = { pin: 9, value: 180 }; break;
    case 'wait': base.fields = { ms: 500 }; break;
    case 'ifPin': base.fields = { pin: 2, val: 'HIGH' }; break;
    case 'repeat': base.fields = { n: 5 }; break;
    case 'print': base.fields = { text: 'Hola MechLab' }; break;
  }
  return base;
}

class BlockEditor {
  constructor(host, onChange) {
    this.host = host;
    this.onChange = onChange || (() => {});
    this.root = [];
    this._render();
  }

  getCode() {
    const body = this._listToCode(this.root);
    return `function* loop() {\n${body || '  // (vacío)'}\n}`;
  }

  setBlocksFromDemo() {
    const ifBlock = newBlock('ifPin');
    ifBlock.fields = { pin: 2, val: 'HIGH' };
    ifBlock.children = [Object.assign(newBlock('setPin'), { fields: { pin: 9, val: 'HIGH' } })];
    ifBlock.elseChildren = [Object.assign(newBlock('setPin'), { fields: { pin: 9, val: 'LOW' } })];
    this.root = [ifBlock];
    this._render();
    this.onChange();
  }

  _listToCode(list, indent = '  ') {
    return list.map(b => this._blockToCode(b, indent)).join('\n');
  }

  _blockToCode(b, indent) {
    const p = b.fields;
    switch (b.type) {
      case 'setPin':
        return `${indent}digitalWrite(${Number(p.pin) || 0}, ${p.val === 'HIGH' ? 1 : 0});`;
      case 'pwmPin':
        return `${indent}analogWrite(${Number(p.pin) || 0}, ${Number(p.value) || 0});`;
      case 'wait':
        return `${indent}yield* __delay(${Number(p.ms) || 0});`;
      case 'print':
        return `${indent}Serial.println(${JSON.stringify(String(p.text || ''))});`;
      case 'ifPin': {
        const cond = `digitalRead(${Number(p.pin) || 0}) === ${p.val === 'HIGH' ? 1 : 0}`;
        const thenCode = this._listToCode(b.children, indent + '  ');
        const elseCode = this._listToCode(b.elseChildren, indent + '  ');
        return `${indent}if (${cond}) {\n${thenCode || indent + '  // vacío'}\n${indent}} else {\n${elseCode || indent + '  // vacío'}\n${indent}}`;
      }
      case 'repeat': {
        const v = 'i_' + b.id;
        const code = this._listToCode(b.children, indent + '  ');
        return `${indent}for (let ${v} = 0; ${v} < ${Number(p.n) || 0}; ${v}++) {\n${code || indent + '  // vacío'}\n${indent}}`;
      }
      case 'whileTrue': {
        const code = this._listToCode(b.children, indent + '  ');
        return `${indent}while (true) {\n${code || indent + '  yield;'}\n${indent}}`;
      }
      default:
        return '';
    }
  }

  _findList(id, list) {
    // devuelve el array que contiene el bloque con ese id, recursivamente
    const idx = list.findIndex(b => b.id === id);
    if (idx !== -1) return { list, idx };
    for (const b of list) {
      let r = this._findList(id, b.children);
      if (r) return r;
      r = this._findList(id, b.elseChildren);
      if (r) return r;
    }
    return null;
  }

  _render() {
    this.host.innerHTML = '';
    const toolbar = document.createElement('div');
    toolbar.className = 'blocks-toolbar';
    Object.entries(BLOCK_DEFS).forEach(([type, def]) => {
      const btn = document.createElement('button');
      btn.className = 'block-add-btn';
      btn.textContent = '+ ' + def.label;
      btn.onclick = () => { this.root.push(newBlock(type)); this._render(); this.onChange(); };
      toolbar.appendChild(btn);
    });
    const demoBtn = document.createElement('button');
    demoBtn.className = 'block-add-btn';
    demoBtn.textContent = '✨ Cargar ejemplo';
    demoBtn.onclick = () => this.setBlocksFromDemo();
    toolbar.appendChild(demoBtn);
    this.host.appendChild(toolbar);

    const list = this._renderList(this.root);
    this.host.appendChild(list);

    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.style.marginTop = '10px';
    hint.textContent = 'Los bloques se ejecutan en orden, de forma continua (como loop() en Arduino). Usa los números de pin que hayas configurado en tus componentes (ej. D2, D9 → pines 2 y 9).';
    this.host.appendChild(hint);
  }

  _renderList(list) {
    const el = document.createElement('div');
    el.className = 'blocks-list';
    list.forEach(b => el.appendChild(this._renderBlock(b)));
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.style.padding = '6px';
      empty.textContent = 'Añade bloques con los botones de arriba…';
      el.appendChild(empty);
    }
    return el;
  }

  _renderBlock(b) {
    const def = BLOCK_DEFS[b.type];
    const card = document.createElement('div');
    card.className = 'block-item';
    const row = document.createElement('div');
    row.className = 'block-row';

    const label = document.createElement('b');
    label.textContent = def.label;
    row.appendChild(label);

    const addField = (key, type, opts) => {
      let input;
      if (type === 'select') {
        input = document.createElement('select');
        (opts || []).forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; input.appendChild(op); });
        input.value = b.fields[key];
      } else {
        input = document.createElement('input');
        input.type = type;
        input.value = b.fields[key];
        input.style.width = type === 'text' ? '120px' : '64px';
      }
      input.onchange = () => { b.fields[key] = input.value; this.onChange(); };
      row.appendChild(input);
    };

    if (b.type === 'setPin') { row.appendChild(document.createTextNode('pin')); addField('pin', 'number'); row.appendChild(document.createTextNode('→')); addField('val', 'select', ['HIGH', 'LOW']); }
    if (b.type === 'pwmPin') { row.appendChild(document.createTextNode('pin')); addField('pin', 'number'); row.appendChild(document.createTextNode('valor (0-255)')); addField('value', 'number'); }
    if (b.type === 'wait') { addField('ms', 'number'); row.appendChild(document.createTextNode('ms')); }
    if (b.type === 'print') { addField('text', 'text'); }
    if (b.type === 'ifPin') { row.appendChild(document.createTextNode('pin')); addField('pin', 'number'); row.appendChild(document.createTextNode('es')); addField('val', 'select', ['HIGH', 'LOW']); }
    if (b.type === 'repeat') { addField('n', 'number'); row.appendChild(document.createTextNode('veces')); }

    const del = document.createElement('button');
    del.className = 'block-del';
    del.textContent = '🗑️';
    del.onclick = () => { const found = this._findList(b.id, this.root); if (found) { found.list.splice(found.idx, 1); this._render(); this.onChange(); } };
    row.appendChild(del);
    card.appendChild(row);

    if (def.container) {
      const childWrap = document.createElement('div');
      childWrap.className = 'block-children';
      const childLabel = document.createElement('div');
      childLabel.className = 'muted';
      childLabel.textContent = def.hasElse ? 'Entonces:' : 'Dentro:';
      childWrap.appendChild(childLabel);
      childWrap.appendChild(this._renderList(b.children));
      const addChildBtn = document.createElement('div');
      addChildBtn.className = 'blocks-toolbar';
      Object.entries(BLOCK_DEFS).forEach(([type, d]) => {
        const btn = document.createElement('button');
        btn.className = 'block-add-btn';
        btn.textContent = '+ ' + d.label;
        btn.onclick = () => { b.children.push(newBlock(type)); this._render(); this.onChange(); };
        addChildBtn.appendChild(btn);
      });
      childWrap.appendChild(addChildBtn);

      if (def.hasElse) {
        const elseLabel = document.createElement('div');
        elseLabel.className = 'muted';
        elseLabel.style.marginTop = '6px';
        elseLabel.textContent = 'Si no:';
        childWrap.appendChild(elseLabel);
        childWrap.appendChild(this._renderList(b.elseChildren));
        const addElseBtn = document.createElement('div');
        addElseBtn.className = 'blocks-toolbar';
        Object.entries(BLOCK_DEFS).forEach(([type, d]) => {
          const btn = document.createElement('button');
          btn.className = 'block-add-btn';
          btn.textContent = '+ ' + d.label;
          btn.onclick = () => { b.elseChildren.push(newBlock(type)); this._render(); this.onChange(); };
          addElseBtn.appendChild(btn);
        });
        childWrap.appendChild(addElseBtn);
      }
      card.appendChild(childWrap);
    }
    return card;
  }
}
