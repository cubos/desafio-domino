BOTS = Dir.entries("bots") - %w[. ..]
LEN = BOTS.map(&:size).max

wins = {}
games = {}

BOTS.each do |bot|
  wins[bot] = 0
  games[bot] = 0
end

10.times do |i|
  puts
  puts "Round #{i+1}:"
  puts
  pairs = BOTS.combination(2).to_a.shuffle.map(&:shuffle)
  pairs.each do |pair|
    puts "  '#{pair[0]}' vs '#{pair[1]}'"
  end
  puts
  pairs.each do |pair|
    puts "Running '#{pair[0]}' vs '#{pair[1]}'"
    result = `node run_domino.js --bot1 bots/#{pair[0]} --bot2 bots/#{pair[1]} --verbose --no-colors`
    File.write("logs/round #{"%03d" % (i+1)} -- #{pair[0]} vs #{pair[1]}.txt", result)
    unless result =~ /Vencedor: (.*)\./
      puts result
      exit 1
    end
    winner = pair[$1 == "bot1" ? 0 : 1]
    games[pair[0]] += 1
    games[pair[1]] += 1
    wins[winner] += 1
    puts "Winner: #{winner}"
    puts
    BOTS.sort_by { |k, v| [-wins[k], games[k], k] }.each do |k|
      puts "#{k}:#{" " * (LEN-k.size)} #{wins[k]}/#{games[k]}"
    end
    puts
  end
end
