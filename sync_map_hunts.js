const fs = require('fs');
const path = require('path');

const markersPath = path.join(__dirname, 'map_markers.json');
const jsonPath = path.join(__dirname, 'creatures.json');
const dataJsPath = path.join(__dirname, 'creatures.data.js');
const backupPath = path.join(__dirname, 'creatures.backup.json');

if (!fs.existsSync(markersPath)) {
  console.error('Erro: map_markers.json não encontrado.');
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error('Erro: creatures.json não encontrado.');
  process.exit(1);
}

const markersData = JSON.parse(fs.readFileSync(markersPath, 'utf8'));
const rawCreatures = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const creatures = Array.isArray(rawCreatures) ? rawCreatures : (rawCreatures.creatures || []);

// 1. Backup de segurança
fs.writeFileSync(backupPath, JSON.stringify({ creatures }, null, 1), 'utf8');
console.log('📦 Backup de segurança salvo em creatures.backup.json');

// 2. Filtrar hunts do mapa (ignora cidades com level 0)
const allHunts = markersData.hunts || [];
const hunts = allHunts.filter(h => h.level > 0);
const cityMarkers = allHunts.filter(h => h.level === 0);

console.log(`🗺️ Map Markers: ${allHunts.length} marcadores no total (${hunts.length} hunts ativas, ${cityMarkers.length} cidades)`);

function normalizeName(str) {
  return str.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mapa auxiliar por nome normalizado (ignora 10001 para que 9 Blastoise Kanto seja priorizado)
const creatureByName = new Map();
creatures.forEach(c => {
  if (c.pokeId === 10001) return;
  creatureByName.set(normalizeName(c.name), c);
});

// 3. Mapeamento de cada hunt para criatura(s)
const huntMapByPokeId = new Map();
const unmappedHunts = [];

hunts.forEach(h => {
  let matchedList = [];
  if (h.slug === 'nidoranfe') {
    matchedList = [creatures.find(c => c.pokeId === 29)];
  } else if (h.slug === 'nidoranma') {
    matchedList = [creatures.find(c => c.pokeId === 32)];
  } else if (h.slug === 'farfetch_d') {
    matchedList = [creatures.find(c => c.pokeId === 83)];
  } else if (h.slug === 'nightmare_galarian_farfetchd') {
    matchedList = [creatures.find(c => c.pokeId === 50024)];
  } else if (h.slug === 'nightmare_bagon_e_shelgon') {
    matchedList = [
      creatures.find(c => c.pokeId === 50003),
      creatures.find(c => c.pokeId === 50004)
    ];
  } else if (h.slug === 'nightmare_dratini_e_dragonair') {
    matchedList = [
      creatures.find(c => c.pokeId === 50006),
      creatures.find(c => c.pokeId === 50007)
    ];
  } else {
    const c = creatureByName.get(normalizeName(h.name));
    if (c) matchedList = [c];
  }

  matchedList = matchedList.filter(Boolean);

  if (matchedList.length === 0) {
    unmappedHunts.push(h);
    return;
  }

  matchedList.forEach(c => {
    if (huntMapByPokeId.has(c.pokeId)) {
      throw new Error(`Conflito: pokeId ${c.pokeId} (${c.name}) mapeado para mais de uma hunt!`);
    }
    huntMapByPokeId.set(c.pokeId, h);
  });
});

if (unmappedHunts.length > 0) {
  console.error('Hunts sem correspondência:', unmappedHunts);
  throw new Error(`${unmappedHunts.length} hunts não foram mapeadas.`);
}

// 4. Atualizar creatures
const changedLevels = [];
const unhuntableCreatures = [];
const areaCounts = { kanto: 0, outland: 0, orre: 0, nightmare: 0 };

creatures.forEach(c => {
  const hunt = huntMapByPokeId.get(c.pokeId);
  const oldHl = c.huntLevel;

  if (hunt) {
    c.huntLevel = hunt.level;
    c.area = hunt.area;
    areaCounts[hunt.area] = (areaCounts[hunt.area] || 0) + 1;

    if (oldHl !== hunt.level) {
      changedLevels.push({
        id: c.pokeId,
        name: c.name,
        area: hunt.area,
        oldHl,
        newHl: hunt.level
      });
    }
  } else {
    c.huntLevel = null;
    c.area = null;
    unhuntableCreatures.push({
      id: c.pokeId,
      name: c.name,
      oldHl
    });
  }
});

// 5. Validações estritas
const errors = [];

if (creatures.length !== 575) {
  errors.push(`Esperado 575 criaturas, encontrado ${creatures.length}`);
}

if (huntMapByPokeId.size !== 453) {
  errors.push(`Esperado 453 criaturas mapeadas para hunts, encontrado ${huntMapByPokeId.size}`);
}

if (unhuntableCreatures.length !== 122) {
  errors.push(`Esperado 122 criaturas sem hunt, encontrado ${unhuntableCreatures.length}`);
}

// Verificações de alvos cruciais
const checks = [
  { id: 252, name: 'Treecko', expectedHl: 520, expectedArea: 'orre' },
  { id: 253, name: 'Grovyle', expectedHl: 540, expectedArea: 'orre' },
  { id: 254, name: 'Sceptile', expectedHl: 580, expectedArea: 'orre' },
  { id: 273, name: 'Seedot', expectedHl: 510, expectedArea: 'orre' },
  { id: 374, name: 'Beldum', expectedHl: 520, expectedArea: 'orre' },
  { id: 548, name: 'Petilil', expectedHl: null, expectedArea: null },
  { id: 50036, name: 'Nightmare Petilil', expectedHl: 2000, expectedArea: 'nightmare' },
  { id: 376, name: 'Metagross', expectedHl: null, expectedArea: null },
  { id: 373, name: 'Salamence', expectedHl: null, expectedArea: null },
  { id: 289, name: 'Slaking', expectedHl: null, expectedArea: null },
  { id: 129, name: 'Magikarp', expectedHl: null, expectedArea: null },
  { id: 133, name: 'Eevee', expectedHl: null, expectedArea: null },
  { id: 29, name: 'Nidoran Female', expectedHl: 10, expectedArea: 'kanto' },
  { id: 32, name: 'Nidoran Male', expectedHl: 10, expectedArea: 'kanto' },
  { id: 83, name: 'Farfetchd', expectedHl: 50, expectedArea: 'kanto' },
  { id: 50003, name: 'Nightmare Bagon', expectedHl: 2000, expectedArea: 'nightmare' },
  { id: 50004, name: 'Nightmare Shelgon', expectedHl: 2000, expectedArea: 'nightmare' },
  { id: 9, name: 'Blastoise', expectedHl: 80, expectedArea: 'kanto' },
  { id: 10501, name: 'Brave Blastoise', expectedHl: 150, expectedArea: 'outland' }
];

checks.forEach(check => {
  const p = creatures.find(x => x.pokeId === check.id);
  if (!p) {
    errors.push(`Pokémon ${check.name} (ID ${check.id}) não encontrado.`);
    return;
  }
  if (p.huntLevel !== check.expectedHl) {
    errors.push(`huntLevel incorreto para ${check.name}: esperado ${check.expectedHl}, obteve ${p.huntLevel}`);
  }
  if (p.area !== check.expectedArea) {
    errors.push(`area incorreta para ${check.name}: esperada ${check.expectedArea}, obteve ${p.area}`);
  }
});

if (errors.length > 0) {
  console.error('❌ Falhas de validação:', errors);
  process.exit(1);
}

// 6. Gravação sincronizada
fs.writeFileSync(jsonPath, JSON.stringify({ creatures }, null, 1), 'utf8');
fs.writeFileSync(dataJsPath, `window.CREATURES_DATA = ${JSON.stringify({ creatures })};`, 'utf8');

console.log('\n✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!');
console.log(`- Total de criaturas no banco: ${creatures.length}`);
console.log(`- Criaturas com hunt no mapa: ${huntMapByPokeId.size}`);
console.log(`  * Kanto: ${areaCounts.kanto}`);
console.log(`  * Outland: ${areaCounts.outland}`);
console.log(`  * Orre: ${areaCounts.orre}`);
console.log(`  * Nightmare: ${areaCounts.nightmare}`);
console.log(`- Criaturas sem hunt no mapa (huntLevel = null): ${unhuntableCreatures.length}`);
console.log(`- Criaturas com huntLevel corrigido: ${changedLevels.length}`);

console.log('\nExemplos de níveis corrigidos em Orre:');
changedLevels.filter(c => c.area === 'orre').slice(0, 10).forEach(c => {
  console.log(`  - ${c.name}: ${c.oldHl} -> ${c.newHl}`);
});

console.log('\nExemplos de Pokémons sem hunt identificados (como Petilil):');
unhuntableCreatures.filter(c => c.oldHl === 20).forEach(c => {
  console.log(`  - ${c.name} (ID ${c.id}): fake HL ${c.oldHl} -> null`);
});
