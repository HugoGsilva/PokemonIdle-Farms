const fs = require('fs');
const path = require('path');

// Carrega os dados
const rawPath = path.join(__dirname, 'creatures.json');
if (!fs.existsSync(rawPath)) {
  console.error("Erro: arquivo creatures.json não encontrado.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const creatures = Array.isArray(raw) ? raw : (raw.creatures || Object.values(raw));

const typeEffectiveness = {
  NORMAL: { ROCK: 0.5, GHOST: 0, STEEL: 0.5 },
  FIRE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 2, BUG: 2, ROCK: 0.5, DRAGON: 0.5, STEEL: 2 },
  WATER: { FIRE: 2, WATER: 0.5, GRASS: 0.5, GROUND: 2, ROCK: 2, DRAGON: 0.5 },
  ELECTRIC: { WATER: 2, ELECTRIC: 0.5, GRASS: 0.5, GROUND: 0, FLYING: 2, DRAGON: 0.5 },
  GRASS: { FIRE: 0.5, WATER: 2, GRASS: 0.5, POISON: 0.5, GROUND: 2, FLYING: 0.5, BUG: 0.5, ROCK: 2, DRAGON: 0.5, STEEL: 0.5 },
  ICE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 0.5, GROUND: 2, FLYING: 2, DRAGON: 2, STEEL: 0.5 },
  FIGHTING: { NORMAL: 2, ICE: 2, POISON: 0.5, FLYING: 0.5, PSYCHIC: 0.5, BUG: 0.5, ROCK: 2, GHOST: 0, DARK: 2, STEEL: 2, FAIRY: 0.5 },
  POISON: { GRASS: 2, POISON: 0.5, GROUND: 0.5, ROCK: 0.5, GHOST: 0.5, STEEL: 0, FAIRY: 2 },
  GROUND: { FIRE: 2, ELECTRIC: 2, GRASS: 0.5, POISON: 2, FLYING: 0, BUG: 0.5, ROCK: 2, STEEL: 2 },
  FLYING: { ELECTRIC: 0.5, GRASS: 2, FIGHTING: 2, BUG: 2, ROCK: 0.5, STEEL: 0.5 },
  PSYCHIC: { FIGHTING: 2, POISON: 2, PSYCHIC: 0.5, DARK: 0, STEEL: 0.5 },
  BUG: { FIRE: 0.5, GRASS: 2, FIGHTING: 0.5, POISON: 0.5, FLYING: 0.5, PSYCHIC: 2, GHOST: 0.5, DARK: 2, STEEL: 0.5, FAIRY: 0.5 },
  ROCK: { FIRE: 2, ICE: 2, FIGHTING: 0.5, GROUND: 0.5, FLYING: 2, BUG: 2, STEEL: 0.5 },
  GHOST: { NORMAL: 0, PSYCHIC: 2, GHOST: 2, DARK: 0.5 },
  DRAGON: { DRAGON: 2, STEEL: 0.5, FAIRY: 0 },
  DARK: { FIGHTING: 0.5, PSYCHIC: 2, GHOST: 2, DARK: 0.5, FAIRY: 0.5 },
  STEEL: { FIRE: 0.5, WATER: 0.5, ELECTRIC: 0.5, ICE: 2, ROCK: 2, STEEL: 0.5, FAIRY: 2 },
  FAIRY: { FIRE: 0.5, FIGHTING: 2, POISON: 0.5, DRAGON: 2, DARK: 2, STEEL: 0.5 }
};

function getMultiplier(attackType, targetType1, targetType2) {
  if (!attackType) return 1;
  const eff1 = typeEffectiveness[attackType]?.[targetType1] ?? 1;
  const eff2 = targetType2 ? (typeEffectiveness[attackType]?.[targetType2] ?? 1) : 1;
  return eff1 * eff2;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Uso:
  node farm.js <NIVEL> [NOME_DO_SEU_POKEMON]

Exemplos:
  node farm.js 50
  node farm.js 50 Charizard
  node farm.js 80 Pikachu
`);
  process.exit(0);
}

const level = parseInt(args[0], 10);
if (isNaN(level) || level <= 0) {
  console.error("Nível inválido. Digite um número maior que 0.");
  process.exit(1);
}

const myPokeName = args[1] ? args.slice(1).join(' ').toLowerCase() : null;
let myPoke = null;

if (myPokeName) {
  myPoke = creatures.find(c => c && c.name && c.name.toLowerCase() === myPokeName);
  if (!myPoke) {
    console.error(`Pokémon "${args.slice(1).join(' ')}" não encontrado na base.`);
    process.exit(1);
  }
}

// Considera todos os alvos liberados até o nível do jogador (huntLevel <= level)
const maxHl = level;

const targets = [];

for (const enemy of creatures) {
  if (!enemy || !enemy.name || !enemy.huntLevel || enemy.experience <= 0) continue;
  if (enemy.huntLevel > maxHl) continue;

  if (myPoke) {
    const isPhysical = myPoke.baseAtk > myPoke.baseSpAtk;
    const myDamageStat = isPhysical ? myPoke.baseAtk : myPoke.baseSpAtk;
    const enemyDef = isPhysical ? enemy.baseDef : enemy.baseSpDef;

    const mult1 = getMultiplier(myPoke.type1, enemy.type1, enemy.type2);
    const mult2 = myPoke.type2 ? getMultiplier(myPoke.type2, enemy.type1, enemy.type2) : 0;
    const bestMult = Math.max(mult1, mult2);

    // Para em 1x: ignora alvos com desvantagem (< 1x)
    if (bestMult < 1) continue;

    const effectiveDamage = (myDamageStat * bestMult * 10) / (enemyDef || 1);
    const timeToKill = enemy.baseHp / effectiveDamage;
    const score = enemy.experience / timeToKill;

    targets.push({
      name: enemy.name,
      types: [enemy.type1, enemy.type2].filter(Boolean).join('/'),
      huntLevel: enemy.huntLevel,
      hp: enemy.baseHp,
      xp: enemy.experience,
      mult: bestMult,
      score: score
    });
  } else {
    // Apenas por nível: melhor relação XP / HP
    const score = enemy.experience / (enemy.baseHp || 1);
    targets.push({
      name: enemy.name,
      types: [enemy.type1, enemy.type2].filter(Boolean).join('/'),
      huntLevel: enemy.huntLevel,
      hp: enemy.baseHp,
      xp: enemy.experience,
      mult: null,
      score: score
    });
  }
}

// Ordenação: 4x > 2x > 1x (depois por eficiência)
targets.sort((a, b) => {
  if (myPoke && b.mult !== a.mult) {
    return b.mult - a.mult;
  }
  return b.score - a.score;
});

console.log(`\n=== MELHORES ALVOS PARA FARMAR NO NÍVEL ${level} ===`);
if (myPoke) {
  console.log(`Seu Pokémon: ${myPoke.name} (${[myPoke.type1, myPoke.type2].filter(Boolean).join('/')}) - Atk: ${myPoke.baseAtk} | SpAtk: ${myPoke.baseSpAtk}`);
}
console.log(`Faixa de Hunt Level: até ${maxHl}\n`);

const top = targets.slice(0, 15);
if (top.length === 0) {
  console.log("Nenhum Pokémon encontrado nessa faixa.");
} else {
  console.table(top.map((t, idx) => ({
    "#": idx + 1,
    Nome: t.name,
    Tipos: t.types,
    "Hunt Lvl": t.huntLevel,
    HP: t.hp,
    XP: t.xp,
    ...(t.mult !== null ? { Vantagem: `${t.mult}x` } : {}),
    Eficiência: Math.round(t.score)
  })));
}
