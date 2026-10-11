const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'creatures.json');
const dataJsPath = path.join(__dirname, 'creatures.data.js');
const backupPath = path.join(__dirname, 'creatures.backup.json');

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const list = raw.creatures;

// Backup de segurança
fs.writeFileSync(backupPath, JSON.stringify(raw, null, 1), 'utf8');
console.log('Backup salvo em creatures.backup.json');

const orreCreatures = list.filter(c => c.pokeId >= 13000 && c.pokeId < 14000);
if (orreCreatures.length !== 72) {
  throw new Error(`Esperado 72 criaturas de Orre, encontrado: ${orreCreatures.length}`);
}

const orreMap = new Map();
orreCreatures.forEach(oc => orreMap.set(oc.pokeId - 13000, oc));

// Preservar evoluções especiais que estão corretas na base (nível 600)
const specialEvolutions = {
  356: { evolvesToId: 477, evolveLevel: 600 }, // Dusclops -> Dusknoir
  372: { evolvesToId: 373, evolveLevel: 600 }, // Shelgon -> Salamence
  375: { evolvesToId: 376, evolveLevel: 600 }  // Metang -> Metagross
};

let updatedCount = 0;
const mergedList = [];

for (const c of list) {
  // 1. Remove duplicatas 13xxx
  if (c.pokeId >= 13000 && c.pokeId < 14000) {
    continue;
  }

  // 2. Mescla atributos de Orre na base correspondente (IDs 252 a 448)
  if (orreMap.has(c.pokeId)) {
    const orre = orreMap.get(c.pokeId);
    c.huntLevel = orre.huntLevel;
    c.loot = orre.loot;
    c.experience = orre.experience;
    c.area = 'orre';

    if (specialEvolutions[c.pokeId]) {
      c.evolvesToId = specialEvolutions[c.pokeId].evolvesToId;
      c.evolveLevel = specialEvolutions[c.pokeId].evolveLevel;
    }

    updatedCount++;
  }

  mergedList.push(c);
}

// === VALIDAÇÕES ===
const errors = [];
if (mergedList.length !== list.length - 72) {
  errors.push(`Total incorreto de criaturas: ${mergedList.length} (esperado ${list.length - 72})`);
}
if (updatedCount !== 72) {
  errors.push(`Quantidade de criaturas mescladas incorreta: ${updatedCount} (esperado 72)`);
}
if (mergedList.some(c => c.pokeId >= 13000 && c.pokeId < 14000)) {
  errors.push('Ainda existem criaturas 13xxx na base!');
}

orreMap.forEach((orre, baseId) => {
  const c = mergedList.find(x => x.pokeId === baseId);
  if (!c) { errors.push(`Base ID ${baseId} não encontrada`); return; }
  if (c.huntLevel !== 470 && c.huntLevel !== 550) errors.push(`HL inválido em ${c.name}: ${c.huntLevel}`);
  if (c.huntLevel !== orre.huntLevel) errors.push(`HL divergente em ${c.name}`);
  if (c.experience !== orre.experience) errors.push(`XP divergente em ${c.name}`);
  if (c.area !== 'orre') errors.push(`Área divergente em ${c.name}: ${c.area}`);
  if (JSON.stringify(c.loot) !== JSON.stringify(orre.loot)) errors.push(`Loot divergente em ${c.name}`);
});

for (const [idStr, evo] of Object.entries(specialEvolutions)) {
  const poke = mergedList.find(x => x.pokeId === Number(idStr));
  if (!poke || poke.evolvesToId !== evo.evolvesToId || poke.evolveLevel !== evo.evolveLevel) {
    errors.push(`Evolução violada em pokeId ${idStr}: esperado to=${evo.evolvesToId}, lvl=${evo.evolveLevel}`);
  }
}

if (errors.length > 0) {
  console.error('Falhas de validação:', errors);
  process.exit(1);
}

// 3. Gravação sincronizada
fs.writeFileSync(jsonPath, JSON.stringify({ creatures: mergedList }, null, 1), 'utf8');
fs.writeFileSync(dataJsPath, `window.CREATURES_DATA = ${JSON.stringify({ creatures: mergedList })};`, 'utf8');
console.log(`✅ Sucesso: 72 Pokémons atualizados com níveis reais (470/550), loots e XP de Orre.`);
console.log(`Total final de criaturas: ${mergedList.length}`);
