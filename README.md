# ⚔️ Poke Idle World &mdash; Calculadora de Farm & Dano

Calculadora e recomendador inteligente de alvos para farmar no MMORPG **Poke Idle World**.
O sistema utiliza a base real de criaturas do jogo (`creatures.json`) para calcular o dano real, vantagens elementais e sugerir os alvos com maior retorno de **XP por tempo de abate**.

---

## 🚀 Funcionalidades

- **Recomendação por Nível**: Filtra apenas os monstros liberados para caçar no seu nível (`Hunt Level <= Nível`).
- **Cálculo de Dano Real**: Compara o melhor atributo ofensivo do seu Pokémon (Ataque Físico ou Ataque Especial) contra a Defesa correspondente do inimigo.
- **Prioridade Elemental**: Ordenação inteligente baseada em multiplicadores reais:
  $$\mathbf{4x} > \mathbf{2x} > \mathbf{1x}$$
  *(Alvos com desvantagem < 1x são descartados por padrão)*.
- **Pódio Top 3 + Tabela Completa**: Exibição visual com sprites oficiais, barras de atributos e pontuação de eficiência.
- **Interface e CLI**: Pode ser utilizado tanto visualmente no navegador quanto diretamente no terminal.

---

## 🧮 Lógica de Eficiência

A nota de eficiência é calculada relacionando o ganho de XP com o tempo estimado para derrotar o monstro:

$$\text{Dano Efetivo} = \frac{\text{Ataque do Pokémon} \times \text{Vantagem (4x / 2x / 1x)}}{\text{Defesa do Alvo}}$$

$$\text{Tempo de Abate (TTK)} \approx \frac{\text{HP do Alvo}}{\text{Dano Efetivo}}$$

$$\text{Eficiência} = \frac{\text{XP Concedido}}{\text{Tempo de Abate}}$$

Monstros com muito XP, pouca vida e fraqueza elemental severa (4x) terão a pontuação mais alta.

---

## 💻 Como Usar

### 1. Interface Web (Navegador)
Você pode abrir o projeto de duas formas:
- **Direto pelo arquivo**: Dê dois cliques em `index.html` (funciona sem servidor local e sem bloqueio de CORS).
- **Ou iniciando o servidor local Node**:
  ```bash
  node server.js
  ```
  E acesse: `http://localhost:8080`

### 2. Terminal (CLI Rápido)
```bash
# Busca geral pelo nível:
node farm.js 50

# Busca calculando dano específico do seu Pokémon:
node farm.js 138 Vileplume
node farm.js 60 Blastoise
node farm.js 100 Gengar
```

---

## 📁 Estrutura do Projeto

- `index.html`: Interface web completa com design dark fantasy e sprites.
- `farm.js`: Utilitário de linha de comando rápido em Node.js.
- `server.js`: Servidor HTTP nativo leve.
- `creatures.json`: Base de dados completa extraída do jogo (647 criaturas com stats, XP e drops).
- `creatures.data.js`: Versão em script global da base de dados para execução standalone em navegadores.
- `items.json`: Base de itens e drops do jogo.