/**
 * node run_domino.js --bot1 ../desafio-domino-exemplo --bot2 ../meu-bot
 *
 * Nos argumentos você deve passar o caminho de duas pastas de bots que tenham Dockerfile.
 * Este script vai contruir um container Docker para cada BOT e rodar uma partida de dominó
 * entre eles, exibindo no terminal detalhes sobre o andamento da partida.
 */

const http = require("http");
const child_process = require("child_process");
const { inspect } = require("util");

function run(command, args, options) {
  const result = child_process.spawnSync(command, args, options);

  if (result.status !== 0 || result.signal) {
    console.error("Failed.");
    process.exit(1);
  }

  return result;
}

const options = {
  bot1Path: null,
  bot2Path: null,
  quiet: false,
  verbose: false,
  games: 1,
  colors: true,
  portBase: 5550,
  build: true,
  buildOnly: false,
}

function showHelp() {
  console.log("Uso: node run_domino.js --bot1 <path> --bot2 <path>");
  console.log();
  console.log("  --bot1 <path>    Caminho para a pasta do bot 1, com o Dockerfile.");
  console.log("  --bot2 <path>    Caminho para a pasta do bot 2, com o Dockerfile.");
  console.log("  --help           Mostra esta ajuda.");
  console.log("  --verbose        Mostra mais detalhes sobre as requisições enviadas para cada bot.");
  console.log("  --quiet          Não mostra detalhes sobre o andamento da partida.");
  console.log("  --games <n>      Quantidade de partidas a serem jogadas. O padrão é 1.");
  console.log("  --no-colors      Desabilita cores no terminal.");
  console.log("  --port-base <n>  Porta base para os containers dos bots. O padrão é 5550.");
  console.log("  --no-build       Não constrói as imagens Docker dos bots. Use esta opção se você já");
  console.log("                   construiu as imagens anteriormente.");
  console.log("  --build-only     Constrói as imagens Docker dos bots e encerra.");
  process.exit(0);
}

for (let i = 2; i < process.argv.length; ++i) {
  switch (process.argv[i]) {
    case "--bot1": {
      if (i + 1 >= process.argv.length) {
        console.error("Argumento faltando para --bot1.");
        process.exit(1);
      }
      if (options.bot1Path !== null) {
        console.error("Argumento duplicado --bot1.");
        process.exit(1);
      }
      options.bot1Path = process.argv[++i];
      break;
    }
    case "--bot2": {
      if (i + 1 >= process.argv.length) {
        console.error("Argumento faltando para --bot2.");
        process.exit(1);
      }
      if (options.bot2Path !== null) {
        console.error("Argumento duplicado --bot2.");
        process.exit(1);
      }
      options.bot2Path = process.argv[++i];
      break;
    }
    case "--help": {
      showHelp();
      break;
    }
    case "--verbose": {
      options.verbose = true;
      break;
    }
    case "--quiet": {
      options.quiet = true;
      break;
    }
    case "--no-colors": {
      options.colors = false;
      break;
    }
    case "--no-build": {
      options.build = false;
      break;
    }
    case "--build-only": {
      options.buildOnly = true;
      break;
    }
    case "--games": {
      if (i + 1 >= process.argv.length) {
        console.error("Argumento faltando para --games.");
        process.exit(1);
      }
      options.games = Math.max(1, parseInt(process.argv[++i], 10));
      break;
    }
    case "--port-base": {
      if (i + 1 >= process.argv.length) {
        console.error("Argumento faltando para --port-base.");
        process.exit(1);
      }
      options.portBase = Math.max(1, parseInt(process.argv[++i], 10));
      break;
    }
    default: {
      console.error(`Argumento desconhecido: ${process.argv[i]}`);
      process.exit(1);
    }
  }
}

if (!options.bot1Path || !options.bot2Path) {
  showHelp();
}

if (options.verbose && options.quiet) {
  console.error("Não é possível usar --verbose e --quiet ao mesmo tempo");
  process.exit(1);
}

const image1 = "cubos-domino-bot-" + options.bot1Path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
const image2 = "cubos-domino-bot-" + options.bot2Path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

if (options.build) {
  console.log("Construindo imagem Docker do bot 1...");
  run("docker", ["build", options.bot1Path, "-t", image1, "--quiet"], { stdio: [0, 1, 2] });
  console.log();

  console.log("Construindo imagem Docker do bot 2...");
  run("docker", ["build", options.bot2Path, "-t", image2, "--quiet"], { stdio: [0, 1, 2] });
  console.log();
}

if (options.buildOnly) {
  process.exit(0);
}

const jogadores = [
  { bot: 1, image: image1, path: options.bot1Path },
  { bot: 2, image: image2, path: options.bot2Path },
  { bot: 1, image: image1, path: options.bot1Path },
  { bot: 2, image: image2, path: options.bot2Path }
];

if (Math.random() < 0.5) {
  jogadores.push(jogadores.shift());
}

jogadores.unshift(undefined);

jogadores[1].port = options.portBase + 1;
jogadores[2].port = options.portBase + 2;
jogadores[3].port = options.portBase + 3;
jogadores[4].port = options.portBase + 4;

for (let i = 1; i <= 4; ++i) {
  console.log(`Iniciando container do jogador ${i}... ${jogadores[i].path}`);

  const id = run("docker", ["run", "--rm", "-d", "--memory=1g", "--memory-swap=1g", "--cpus=1", "-p", `${jogadores[i].port}:8000`, jogadores[i].image]).stdout.toString().trim();

  jogadores[i].containerId = id;
}

function shutdown() {
  for (let i = 1; i <= 4; ++i) {
    if (!jogadores[i].containerId) continue;
    console.log(`Parando container do jogador ${i}...`);

    run("docker", ["stop", "-t", "0", "-s", "9", jogadores[i].containerId]);
    jogadores[i].containerId = undefined;
  }
}

process.on("exit", shutdown);
process.on("uncaughtException", err => { shutdown(); console.error(err); process.exit(1); });

console.log(options.games === 1 ? "Iniciando partida..." : "Iniciando campeonato...")
console.log()

// Espera os containers estarem prontos e inicia a partida
setTimeout(main, 9000)

// Utilitário para fazer requisições POST com JSON
async function postJson(hostname, port, body, retries = 3) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname,
      port,
      path: "/",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, res => {
      const data = [];

      res.on("error", reject);
      res.on("data", chunk => { data.push(chunk); });
      res.on("end", () => { resolve(JSON.parse(Buffer.concat(data).toString())); });
    });

    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  }).catch(async err => {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return postJson(hostname, port, body, retries - 1);
    }
    throw err;
  });
}

async function main() {
  if (options.games === 1) {
    const ganhador = await runGame();
    console.log(`Vencedor: bot${jogadores[ganhador].bot}.`);
    console.log();
    return;
  }

  const resultados = [0, 0];
  for (let i = 0; i < options.games; ++i) {
    const ganhador = await runGame();
    resultados[jogadores[ganhador].bot - 1] += 1;
    console.log(`Partida ${i + 1}: Vencedor: bot${jogadores[ganhador].bot}.`);
    console.log(`  Resultado parcial: bot1 ${resultados[0]} x ${resultados[1]} bot2`);
    console.log();
  }

  console.log(`Resultado final após ${options.games} partidas: bot1 ${resultados[0]} x ${resultados[1]} bot2`);
  console.log();
}

const infoLog = options.quiet ? () => {} : console.log;
const verboseLog = options.verbose ? console.log : () => {};

// Resolve para o time ganhador de um jogo, retorna 1 ou 2.
async function runGame() {
  // Cria pedras
  const pedras = [];
  for (let a = 0; a <= 6; ++a) {
    for (let b = a; b <= 6; ++b) {
      pedras.push(`${a}-${b}`);
    }
  }

  // Embaralha as pedras
  for (let i = pedras.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [pedras[i], pedras[j]] = [pedras[j], pedras[i]];
  }

  // Distribui as pedras
  jogadores[1].mao = pedras.slice(0, 7);
  jogadores[2].mao = pedras.slice(7, 14);
  jogadores[3].mao = pedras.slice(14, 21);
  jogadores[4].mao = pedras.slice(21, 28);

  if (!options.quiet) {
    infoLog("Pedras distribuídas:");
    for (let i = 1; i <= 4; ++i) {
      infoLog(`  Jogador ${i}: [${jogadores[i].mao.join("] [")}]`);
    }
  }

  // Inicia o jogo
  const primeiraPedra = "6-6";
  const mesa = [];
  const jogadas = [];
  let jogadorAtual = [1, 2, 3, 4].find(i => jogadores[i].mao.includes(primeiraPedra));

  // Coloca primeira pedra
  mesa.push(primeiraPedra);
  jogadores[jogadorAtual].mao.splice(jogadores[jogadorAtual].mao.indexOf(primeiraPedra), 1);
  jogadas.push({ jogador: jogadorAtual, pedra: primeiraPedra });

  infoLog(`Jogador ${jogadorAtual} começa a partida e coloca a pedra [${primeiraPedra}] na mesa.\n`);

  jogadorAtual += 1;
  if (jogadorAtual > 4) jogadorAtual = 1;

  // Main loop
  let skipCount = 0;
  while (skipCount < 4) {
    const json = {
      jogador: jogadorAtual,
      mao: jogadores[jogadorAtual].mao,
      mesa,
      jogadas
    };

    infoLog(`  Mesa: [${mesa.join("][")}]\n`);
    for (let i = 1; i <= 4; ++i) {
      infoLog(`  Jogador ${i}${ jogadorAtual === i ? " (*):" : ":    "} [${jogadores[i].mao.join("] [")}]`);
    }

    verboseLog(`\nEnviando para jogador ${jogadorAtual} via POST http://localhost:${jogadores[jogadorAtual].port}/:`);
    verboseLog(`${inspect(json, undefined, 10, options.colors)}\n`);

    const timeoutGuard = new Object();
    const errorGuard = new Object();

    const jogada = await Promise.race([
      postJson("localhost", jogadores[jogadorAtual].port, json).then(res => {
        verboseLog(`Jogada recebida:`);
        verboseLog(`${inspect(res, undefined, 10, options.colors)}\n`);
        return res;
      }),
      new Promise(resolve => setTimeout(() => resolve(timeoutGuard), 3000))
    ]).catch(err => {
      console.error(err);
      return errorGuard;
    });

    if (jogada === timeoutGuard) {
      infoLog(`Jogador ${jogadorAtual} excedeu o tempo limite e foi desclassificado.\n`);
      return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
    }

    if (jogada === errorGuard) {
      infoLog(`Jogador ${jogadorAtual} falhou com um erro e foi desclassificado.\n`);
      return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
    }

    if (Object.keys(jogada).length === 0) {
      infoLog(`Jogador ${jogadorAtual} passou a vez.\n`)
      skipCount += 1;

      const possibilidades = jogadores[jogadorAtual].mao.filter(pedra => pedra.split("-").includes(mesa[0][0]) || pedra.split("-").includes(mesa[mesa.length - 1][2]));
      if (possibilidades.length !== 0) {
        infoLog(`Jogador ${jogadorAtual} poderia ter jogado a pedra [${possibilidades[0]}], mas passou a vez. Por conta disso foi desclassificado.\n`);
        return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
      }
    } else {
      if (!["esquerda", "direita"].includes(jogada.lado)) {
        infoLog(`Jogador ${jogadorAtual} jogou uma pedra com um lado inválido e foi desclassificado.\n`);
        return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
      }

      infoLog(`Jogador ${jogadorAtual} jogou a pedra [${jogada.pedra}] no lado ${jogada.lado} da mesa.\n`);
      skipCount = 0;

      const index = jogadores[jogadorAtual].mao.findIndex(p => p === jogada.pedra || p === jogada.pedra.split("-").reverse().join("-"));

      if (index === -1) {
        infoLog(`Jogador ${jogadorAtual} jogou uma pedra que não tinha na mão e foi desclassificado.\n`);
        return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
      }

      if ((jogada.lado === "direita" && !jogada.pedra.includes(mesa[mesa.length - 1][2])) || (jogada.lado === "esquerda" && !jogada.pedra.includes(mesa[0][0]))) {
        infoLog(`Jogador ${jogadorAtual} jogou uma pedra que não encaixa na mesa e foi desclassificado.\n`);
        return jogadorAtual === 1 || jogadorAtual === 3 ? 2 : 1;
      }

      jogadores[jogadorAtual].mao.splice(index, 1);
      if (jogada.lado === "direita") {
        if (jogada.pedra[2] === mesa[mesa.length - 1][2]) {
          jogada.pedra = jogada.pedra.split("-").reverse().join("-");
        }
        mesa.push(jogada.pedra);
      } else {
        if (jogada.pedra[0] === mesa[0][0]) {
          jogada.pedra = jogada.pedra.split("-").reverse().join("-");
        }
        mesa.unshift(jogada.pedra);
      }
      jogadas.push({ jogador: jogadorAtual, pedra: jogada.pedra, lado: jogada.lado });

      if (jogadores[jogadorAtual].mao.length === 0) {
        infoLog(`Jogador ${jogadorAtual} ganhou a partida!\n`);
        return jogadorAtual === 1 || jogadorAtual === 3 ? 1 : 2;
      }
    }

    jogadorAtual += 1;
    if (jogadorAtual > 4) jogadorAtual = 1;
  }

  infoLog(`Todos os jogadores passaram a vez e a partida terminou empatada.\n\n`);

  function contaPontos(mao) {
    return mao.reduce((acc, curr) => acc + curr.split("-").reduce((acc, curr) => acc + parseInt(curr), 0), 0);
  }

  for (let i = 1; i <= 4; ++i) {
    infoLog(`  Jogador ${i}: ${contaPontos(jogadores[i].mao)} pontos.`);
  }

  const equipe1 = contaPontos(jogadores[1].mao) + contaPontos(jogadores[3].mao);
  const equipe2 = contaPontos(jogadores[2].mao) + contaPontos(jogadores[4].mao);

  if (equipe1 < equipe2) {
    infoLog(`Jogadores 1 e 3 ganharam com ${equipe1} pontos contra ${equipe2} pontos dos jogadores 2 e 4.`);
    return 1;
  } else if (equipe1 > equipe2) {
    infoLog(`Jogadores 2 e 4 ganharam com ${equipe2} pontos contra ${equipe1} pontos dos jogadores 1 e 3.`);
    return 2;
  } else {
    const ultimo = jogadas.at(-1).jogador;

    infoLog(`As duas equipes tem a mesma quantidade de pontos. Jogador ${ultimo} foi o último a jogar perde a partida.`);

    if (ultimo === 1 || ultimo === 3) {
      return 2;
    } else {
      return 1;
    }
  }
}
