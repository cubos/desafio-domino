BOTS = ARGV[0...2]
LEN = BOTS.map(&:size).max
ROUNDS = 3
GAMES_PER_ROUND = 5
WIDTH = 50

system "mkdir -p logs"
# system "node run_domino.js --bot1 bots/#{BOTS[0]} --bot2 bots/#{BOTS[1]} --build-only"

wins = { BOTS[0] => 0, BOTS[1] => 0 }

ROUNDS.times do |round_i|
  threads = (0...GAMES_PER_ROUND).map do |game_i|
    Thread.new do
      sleep game_i
      result = `node run_domino.js --bot1 bots/#{BOTS[0]} --bot2 bots/#{BOTS[1]} --verbose --no-colors --port-base #{5500 + 5*game_i} --no-build`
      File.write("logs/round #{"%03d" % (round_i+1)} -- jogo #{"%03d" % (game_i+1)} -- #{BOTS[0]} vs #{BOTS[1]}.txt", result)
      result =~ /Vencedor: (.*)\./
      next $1
    end
  end

  puts "Round #{round_i+1} de #{ROUNDS} (#{threads.size} jogos):\n\n"

  update_report = proc do
    count1 = threads.count { |t| !t.alive? && t.value == "bot1" }
    count2 = threads.count { |t| !t.alive? && t.value == "bot2" }
    size1 = count1 * WIDTH / threads.size
    size2 = count2 * WIDTH / threads.size
    sizeMid = WIDTH - size1 - size2
    print "\r"
    print BOTS[0]
    print " "
    print count1
    print " "
    print "\x1b[0;91m" + "█" * size1
    print " " * sizeMid
    print "\033[0;94m" + "█" * size2
    print "\033[0m"
    print " "
    print count2
    print " "
    print BOTS[1]
  end

  while threads.any? { |t| t.alive? }
    update_report.call
    sleep 0.2
  end

  update_report.call

  puts
  puts

  games = GAMES_PER_ROUND * (round_i + 1)
  wins[BOTS[0]] += threads.count { |t| t.value == "bot1" }
  wins[BOTS[1]] += threads.count { |t| t.value == "bot2" }

  BOTS.sort_by { |k, v| [-wins[k], k] }.each do |k|
    puts "#{k}:#{" " * (LEN-k.size)} #{wins[k]}/#{games}"
  end
  puts
end
