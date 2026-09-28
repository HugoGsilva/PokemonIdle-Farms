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

const maxHl = level;
let unlockedAttacks = [];
if (myPoke) {
  unlockedAttacks = (myPoke.attacks || []).filter(a => a.learnLevel <= level);
  if (unlockedAttacks.length === 0 && myPoke.attacks && myPoke.attacks.length > 0) {
    unlockedAttacks = [[...myPoke.attacks].sort((a, b) => a.learnLevel - b.learnLevel)[0]];
  }
}

const targets = [];

for (const enemy of creatures) {
  if (!enemy || !enemy.name || !enemy.huntLevel || enemy.experience <= 0) continue;
  if (enemy.huntLevel > maxHl) continue;

  if (myPoke) {
    let bestMult = 0;
    let bestAttack = null;
    let bestEffDmg = 0;

    for (const atk of unlockedAttacks) {
      const mult = getMultiplier(atk.type, enemy.type1, enemy.type2);
      const isPhysical = atk.category === 'PHYSICAL';
      const stat = isPhysical ? myPoke.baseAtk : myPoke.baseSpAtk;
      const def = isPhysical ? enemy.baseDef : enemy.baseSpDef;
      const stab = (atk.type === myPoke.type1 || atk.type === myPoke.type2) ? 1.5 : 1.0;
      const effDmg = (stat * ((atk.power || 40) / 50) * mult * stab * 10) / (def || 1);

      if (mult > bestMult || (mult === bestMult && effDmg > bestEffDmg)) {
        bestMult = mult;
        bestAttack = atk;
        bestEffDmg = effDmg;
      }
    }

    // Para em 1x: ignora alvos com desvantagem (< 1x)
    if (!bestAttack || bestMult < 1) continue;

    // Dano recebido pelo jogador contra tipos do inimigo
    const defMult1 = getMultiplier(enemy.type1, myPoke.type1, myPoke.type2);
    const defMult2 = enemy.type2 ? getMultiplier(enemy.type2, myPoke.type1, myPoke.type2) : 0;
    const incomingMult = Math.max(defMult1, defMult2);

    const timeToKill = enemy.baseHp / bestEffDmg;
    const rawScore = enemy.experience / timeToKill;
    // Penaliza alvos que causam 2x ou 4x em você; bonifica se você resiste (0.5x ou 0x)
    const defenseFactor = Math.max(0.5, incomingMult);
    const score = rawScore / defenseFactor;

    targets.push({
      name: enemy.name,
      types: [enemy.type1, enemy.type2].filter(Boolean).join('/'),
      huntLevel: enemy.huntLevel,
      hp: enemy.baseHp,
      xp: enemy.experience,
      attackName: bestAttack.name,
      attackType: bestAttack.type,
      mult: bestMult,
      incomingMult: incomingMult,
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
      attackName: '-',
      attackType: '-',
      mult: null,
      incomingMult: null,
      score: score
    });
  }
}

// Ordenação: 4x > 2x > 1x (depois por eficiência ajustada com dano recebido)
targets.sort((a, b) => {
  if (myPoke && b.mult !== a.mult) {
    return b.mult - a.mult;
  }
  return b.score - a.score;
});

console.log(`\n=== MELHORES ALVOS PARA FARMAR NO NÍVEL ${level} ===`);
if (myPoke) {
  console.log(`Seu Pokémon: ${myPoke.name} (${[myPoke.type1, myPoke.type2].filter(Boolean).join('/')}) - Atk: ${myPoke.baseAtk} | SpAtk: ${myPoke.baseSpAtk}`);
  console.log(`Skills desbloqueadas até o Nível ${level}:`);
  unlockedAttacks.forEach(a => console.log(`  - [Lv. ${a.learnLevel}] ${a.name} (${a.type}, Poder ${a.power}, ${a.category})`));
}
console.log(`\nFaixa de Hunt Level: até ${maxHl} (Ordenado por Dano Causado & Menor Risco Recebido)\n`);

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
    ...(t.mult !== null ? {
      Habilidade: `${t.attackName} (${t.attackType})`,
      Causa: `${t.mult}x`,
      Recebe: `${t.incomingMult}x`
    } : {}),
    Eficiência: Math.round(t.score)
  })));
}
