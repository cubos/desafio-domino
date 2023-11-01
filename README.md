# Rinha Cubos: Dominó

Neste fim de ano vamos jogar um jogo que todo mundo adora: Dominó!

Dominó é um jogo de mesa em que os jogadores dispõem, alternadamente, uma peça de sua mão na mesa, desde que uma das extremidades da peça coincida com a extremidade aberta de uma das peças que já se encontram na mesa. Ganha quem colocar todas as suas peças na mesa.

Mas aqui o jogo será diferente, esse é um desafio de código! Você deve implementar um BOT para jogar Dominó em um campeonato. Seu BOT será um jogador virtual que irá competir contra outros BOTS. O objetivo é implementar um BOT que jogue de forma inteligente e vença o campeonato.

## Regras do jogo

O jogo de dominó é jogado com 28 peças, cada uma delas contendo dois números de 0 a 6. As peças são chamadas de pedras. Existem 7 pedras com dois números iguais e 21 pedras com dois números diferentes, todas únicas. Uma pedra com os números 3 e 5 é chamada de pedra `3-5`, já a bucha de 6, que tem dois números 6, é chamada de pedra `6-6`.

Essas são todas as pedras do jogo:

- `0-0`, `0-1`, `0-2`, `0-3`, `0-4`, `0-5`, `0-6`
- `1-1`, `1-2`, `1-3`, `1-4`, `1-5`, `1-6`
- `2-2`, `2-3`, `2-4`, `2-5`, `2-6`
- `3-3`, `3-4`, `3-5`, `3-6`
- `4-4`, `4-5`, `4-6`
- `5-5`, `5-6`
- `6-6`

Dominó é jogado com duas duplas adversárias, totalizando 4 jogadores. Cada jogador recebe 7 pedras. O jogadore que tiver a peça `6-6` começa jogando ela. A partir daí, os jogadores devem jogar em sentido horário colocando suas pedras na mesa, de forma que uma das extremidades da pedra coincida com a extremidade aberta de uma das pedras que já se encontram na mesa. Um jogador só pode colocar uma pedra na mesa se ele tiver uma pedra que possa ser colocada. Se um jogador não tiver uma pedra que possa ser colocada, passa a vez. O jogo termina quando um jogador coloca todas as suas pedras na mesa (a dupla ganha) ou quando o jogo fica bloqueado, ou seja, nenhum jogador pode colocar mais pedras na mesa (empate).

## Como programar o BOT

Você deve implementar um BOT que será o celebro de um jogador. Como o jogo é jogado em  duplas, existem duas instâncias do seu BOT jogando ao mesmo tempo, mas elas não podem se comunicar entre si. Então se temos os jogadores 1, 2, 3 e 4, os jogadores 1 e 3 são a primeira dupla e ambos executam o mesmo código, os jogadores 2 e 4 são a outra dupla e executam o código adversário.

A interface do seu BOT é simples: você deve implementar um servidor HTTP que escute na porta 8000 e tenha um único endpoint `POST /` que recebe um JSON com o estado atual do jogo e retorna um JSON com a jogada que o BOT deseja fazer. O estado do jogo é um JSON com a seguinte estrutura:

```json
{
  "jogador": 3,
  "mao": ["3-6", "5-5", "1-2", "0-0", "0-4", "1-6"],
  "mesa": ["1-6", "6-6", "6-4", "4-4"],
  "jogadas": [
    {
      "jogador": 3,
      "pedra": "6-6"
    },
    {
      "jogador": 4,
      "pedra": "6-4",
      "lado": "direita"
    },
    {
      "jogador": 1,
      "pedra": "4-4",
      "lado": "direita"
    },
    {
      "jogador": 2,
      "pedra": "1-6",
      "lado": "esquerda"
    },
  ]
}
```

Explicando os campos:

- `jogador`: o seu número de jogador (1, 2, 3 ou 4). Neste exemplo você é o jogador 3, e a sua dupla é o jogador 1.
- `mao`: as pedras que você tem na mão. Lembrando que `3-5` e `5-3` são a mesma pedra.
- `mesa`: as pedras que já estão na mesa. As duas estremidas são o começo e o fim da lista. Aqui as pedras já vem viradas com os lados encaixando. Neste exemplo o número na extremidade esquerda é 1 e na direita é 4.
- `jogadas`: o histórico de todas as jogadas feitas nessa partida. Cada jogada é um objeto com os campos `jogador` e `pedra`. Se a pedra foi colocada na mesa, o campo `lado` indica em qual extremidade ela foi colocada. Neste exemplo você começou jogando a pedra `6-6`. O jogador seguinte (4) colocou a pedra `6-4` do lado direito. Na sequencia, a sua dupla (jogador 1) colocou a pedra `4-4` do lado direito. Por fim, o jogador 2 colocou a pedra `1-6` do lado esquerdo. Agora é a sua vez.

O seu BOT deve retornar um JSON com a seguinte estrutura:

```json
{
  "pedra": "4-0",
  "lado": "direita"
}
```

Você deve indicar uma pedra que esteja na sua mão e em qual lado quer encaixar na mesa. Se você não tiver uma pedra que possa ser colocada, retorne um objeto vazio `{}`. A ordem dos números na pedra não importa.

Feito isso, o proximo a jogar é o jogador 4, que receberá a mesa desse jeito: `[1-6, 6-6, 6-4, 4-4, 4-0]` e deve escolher uma de suas pedras para jogar.

O jogador zerar a mão primeiro leva uma vitória para a sua dupla. Se todos passarem a vez, o jogo termina empatado.

Cada container tem acesso a 1 CPU e 1GB de memória RAM. A cada jogada, o seu BOT pode demorar no máximo 5 segundos para responder. Se demorar muito tempo, usar memoria excessiva ou fizer uma jogada inválida, o seu BOT perde a partida imediatamente.

## Como entregar o BOT

Você pode utilizar qualquer linguagem de programação e qualquer tecnologia, desde que possa rodar dentro de um container Docker. Crie um repositório público no GitHub com o código do seu BOT e inclua um arquivo `Dockerfile` com as instruções para rodar o seu BOT. O arquivo `Dockerfile` deve expor a porta 8000 e lidar com a requisição HTTP descrita acima. Não inclua nenhuma lógica de comunicação externa pela Internet, sem trapaças!

Você tem aqui uma implementação de exemplo do BOT em NodeJS, utilizando a estratégia de colar peça: https://github.com/cubos/desafio-domino-exemplo

## Como testar o BOT

Aqui neste repositório tem o arquivo `run_domino.js`. Baixe esse arquivo (ou clone este repositório). Você pode então executar esse comando para rodar uma partida de dominó:

```bash
node run_domino.js --bot1 https://github.com/cubos/desafio-domino-exemplo --bot2 ../meu-bot
```

No argumento você pode passar a URL de um repositório Git ou um caminho de uma pasta local. Este script vai contruir um container Docker para cada BOT e rodar uma partida de dominó entre eles, exibindo no terminal detalhes sobre o andamento da partida.

## Regras do campeonato

A competição começa hoje, 1/11.

No final do mês, dia 30/11 a primeira fase da competição acontecerá. Nessa fase, todos os BOTs serão executados em um campeonato de todos contra todos. Cada BOT jogará 3 partidas contra cada um dos outros BOTs. A pontuação será calculada da seguinte forma: 3 pontos para cada vitória, 1 ponto para cada empate e 0 pontos para cada derrota. Os 4 BOTs com mais pontos passam para a fase final.

No dia 14/12, data do nosso planejamento, faremos a competição final entre esses 4: 1º contra 4º e 2º contra 3º. Os vencedores dessas partidas se enfrentam na final e os perdedores disputam o terceiro lugar. Esses jogos serão AO VIVO, NO TELÃO!

Teremos também o concuso de criatividade: aqui é simples: o BOT mais legal, inovador, inusitado ganha. Todos da Cubos votam, os mais votados ganham prêmios.

Você pode participar sozinho ou em equipes de até 3 pessoas. Faça um pull request modificando o arquivo PARTICIPANTS.md para se inscrever.
