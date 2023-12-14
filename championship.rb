BOTS = (Dir.entries("bots") - %w[. ..]).sort_by(&:downcase)
LEN = BOTS.map(&:size).max
ROUNDS = 10

system "mkdir -p logs"

wins = {}
games = {}

BOTS.each do |bot|
  wins[bot] = 0
  games[bot] = 0
end

puts

ROUNDS.times do |round_i|
  results = {}
  BOTS.each do |bot1|
    results[bot1] = {}
    BOTS.each do |bot2|
      next if bot1 == bot2
      results[bot1][bot2] = "..."
    end
  end

  pairs = BOTS.combination(2).to_a.shuffle.map(&:shuffle)

  threads = pairs.map.with_index do |pair, i|
    Thread.new do
      result = `node run_domino.js --bot1 bots/#{pair[0]} --bot2 bots/#{pair[1]} --verbose --no-colors --port-base #{5500 + 5*i} #{round_i == 0 ? "" : "--no-build"}`
      File.write("logs/round #{"%03d" % (round_i+1)} -- #{pair[0]} vs #{pair[1]}.txt", result)
      result =~ /Vencedor: (.*)\./
      winner = pair[$1 == "bot1" ? 0 : 1]
      results[pair[0]][pair[1]] = winner
      results[pair[1]][pair[0]] = winner
    end
  end

  start = Time.now

  (BOTS.size + 8).times { puts }

  update_report = proc do
    print "\033[#{BOTS.size + 7}A"

    puts "Round #{round_i+1} de #{ROUNDS} (#{pairs.size} jogos):"
    puts

    print " " * (LEN + 6)
    BOTS.each.with_index do |bot, i|
      print " %02d" % (i+1)
    end
    puts

    puts " " * (LEN + 6) + "---" * BOTS.size + "-"

    BOTS.each.with_index do |bot1, i|
      print "%02d. " % (i+1)
      print bot1
      print " " * (LEN - bot1.size)
      print " | "
      win_count = 0
      BOTS.each.with_index do |bot2, j|
        if i == j
          print "   "
        else
          case results[bot1][bot2]
          when bot1
            print "✅ "
            win_count += 1
          when bot2
            print "❌ "
          when "..."
            print "⚔️  "
          end
        end
      end
      print "|"
      print " #{win_count}/#{BOTS.size-1}"
      puts
    end

    puts " " * (LEN + 6) + "---" * BOTS.size + "-"

    puts " T=#{"%.2f" % (Time.now - start)} segundos   "
    puts
  end

  while threads.any? { |t| t.alive? }
    update_report.call
    sleep 0.3*rand
  end

  update_report.call

  pairs.each do |pair|
    winner = results[pair[0]][pair[1]]
    games[pair[0]] += 1
    games[pair[1]] += 1
    wins[winner] += 1
  end

  BOTS.sort_by { |k, v| [-wins[k], games[k], k] }.each do |k|
    puts "#{k}:#{" " * (LEN-k.size)} #{wins[k]}/#{games[k]}"
  end
  puts
end
