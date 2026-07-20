# MetaMurder - Jogo Multiplayer de Dedução Social

**MetaMurder** é um jogo multiplayer em tempo real completo para navegador (Tripulantes vs. Assassinos), inspirado em jogos de dedução social como *Among Us*, porém com identidade visual, cenários, personagens, interface, efeitos sonoros sintetizados e mecânicas próprias.

## 🚀 Funcionalidades

- **Multiplayer Autorritativo**: Servidor Node.js + Socket.IO valida todas as movimentações, colisões com paredes, tempos de recarga, mortes, votos e condições de vitória.
- **Bots Inteligentes (3 Dificuldades)**: Bots participam de tarefas, relatam corpos, sabotam sistemas, conversam de forma contextual durante reuniões e votam estrategicamente.
- **Tarefas Interativas (Mini-games)**:
  1. Conexão de Fios (Wiring)
  2. Teclado Numérico de Segurança (Keypad)
  3. Calibração de Discos (Calibrate)
  4. Transferência de Dados (Download/Upload)
  5. Memória de Cores (Simon)
  6. Abastecimento de Combustível (Fuel Refill)
  7. Painel de Chaves Disjuntoras (Switches)
- **Sabotagens em Tempo Real**:
  - Apagão de Luzes (reduz o campo de visão dos tripulantes)
  - Fusão do Reator (cronômetro crítico de 30 segundos)
  - Despressurização de O2 (código de emergência)
- **Sistema de Reuniões & Votação**:
  - Chat restrito (jogadores mortos só conversam entre si no canal dos fantasmas)
  - Animação de expulsão com confirmação de função configurável
- **Sintetizador Sonoro Web Audio**: Passos, alarmes, efeitos de morte, botões e músicas gerados proceduralmente via Web Audio API.
- **Persistência SQLite**: Registro de contas convidadas, estatísticas de jogo e itens cosméticos.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, TypeScript, HTML5 Canvas Rendering Engine, Web Audio API, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Banco de Dados**: SQLite3
- **Testes**: Vitest

---

## 📋 Pré-requisitos & Instalação Local

1. Instalar as dependências:
```bash
npm install
```

2. Executar os testes automatizados:
```bash
npm test
```

3. Iniciar o servidor em modo de desenvolvimento:
```bash
npm run dev
```

O jogo estará disponível em `http://localhost:3000` (ou na porta configurada).

---

## 📄 Variáveis de Ambiente (`.env`)

```env
PORT=4000
NODE_ENV=development
DATABASE_PATH=./db/database.sqlite
JWT_SECRET=metamurder_secret_key_2026
```

---

## 📦 Deploy para Produção

1. Executar o build do frontend e backend:
```bash
npm run build
```

2. Iniciar o servidor em produção:
```bash
npm start
```
