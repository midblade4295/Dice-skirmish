from pathlib import Path

p = Path("fatebound.html")
s = p.read_text(encoding="utf-8")

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 match, found {n}")
    s = s.replace(old, new, 1)

rep(
    "<p><b>War rewards:</b> make at least 5 paid rolls during the daily war. Completion energy is limited to 20 daily; the final push also has a separate 30-energy rally gift, once per day. Rampage never recharges itself, and ultimate charge is capped at 10 per roll.</p>",
    "<p><b>Battle rewards:</b> make at least 5 paid rolls during the 5-minute battle. Completion energy is limited to 20 daily; the final minute also has a separate 3-energy rally gift, once per day. Rampage never recharges itself, and ultimate charge is capped at 10 per roll.</p>",
    "rules rewards",
)

rep(
    "<p><b class=\"gold\">Held towers are your score.</b> Courtyard towers are worth 3♛, camp towers 2♛, outposts 1♛. Daytime control counts: your average held tower points are banked. At the finish, add twice the points of the towers you hold. Highest total wins; guild damage breaks a tie. The last 30 minutes boost attack damage ×1.5.</p>",
    "<p><b class=\"gold\">Held towers are your score.</b> Courtyard towers are worth 3♛, camp towers 2♛, outposts 1♛. Control during the first 4 minutes is banked as your average held tower score. Final tower ownership counts double. Attacks deal ×1.15 from 2:00–4:00 and ×1.5 in the final minute. A regulation tie goes to up to 60 seconds of sudden death; guild damage breaks a tie if overtime expires.</p>",
    "rules scoring",
)

rep("Claim 30 rally energy", "Claim 3 rally energy", "no-energy rally label")

rep(
    "Daily energy rewards: up to 20 from completed wars, 10 from guild bots, 30 from return gifts, and one 30-energy finale rally gift. Natural regeneration: 1 per 10 minutes. Overflow is kept.",
    "Daily energy rewards: up to 20 from completed battles, 10 from guild bots, 30 from return gifts, and one 3-energy final-minute rally gift. Natural regeneration: 1 per 10 minutes. Overflow is kept.",
    "shop energy copy",
)

rep("Shards drop from chests, boss milestones, war rewards and the season pass",
    "Shards drop from chests, boss milestones, battle rewards and the season pass",
    "forge reward copy")
rep("wars +5/+10 per 5 min", "battles +5/+10 per 5 min", "season copy")
rep("Base ×1 power · daily war clock continues", "Base ×1 power · battle clock continues", "level-up copy")
rep("Tower control throughout the day and the final result contribute to your guild’s score.",
    "Tower control during the opening 4 minutes and final tower ownership contribute to your guild’s score.",
    "tutorial tower copy")
rep("without joining a war.", "without starting a battle.", "tutorial hub copy")
rep("Practice gift sent. In a real war, the recipient keeps this damage gift until they choose to use it.",
    "Practice gift sent. In a real battle, the recipient keeps this damage gift until they choose to use it.",
    "tutorial gift copy")
rep("even before your first war.", "even before your first battle.", "tutorial first battle copy")
rep("paid energy spent on war rolls.", "paid energy spent on battle rolls.", "training gold copy")
rep(
    "Tap Home. You can visit your hero, guild, friends, and shop without starting another war. Your real war progress stays saved when you leave.",
    "Tap Home. You can visit your hero, guild, friends, and shop without starting another battle. Your active battle progress stays saved when you leave.",
    "training return-home copy",
)
rep("without starting a war.", "without starting a battle.", "training home copy")
rep("Return to war", "Return to battle", "return button")
rep("Hold towers to keep their crowns when the war ends.", "Hold towers to keep their crowns when the battle ends.", "guild score copy")
rep("Every 20 energy spent on war rolls earns 200 gold and 1 weapon shard.",
    "Every 20 energy spent on battle rolls earns 200 gold and 1 weapon shard.",
    "roll track copy")
rep("War details & target", "Battle details & target", "details summary")
rep("The daily boss is unavailable during this war trial.", "The daily boss is unavailable during battle training.", "boss training copy")

rep(
    "const started=!!SAVE.war&&SAVE.war.phase!=='complete',t=SAVE.tutorial;",
    "const started=!!SAVE.war&&SAVE.war.matchVersion===3&&SAVE.war.phase!=='complete',t=SAVE.tutorial;",
    "old-save home display",
)

for stale in [
    "last 30 minutes",
    "daily war clock continues",
    "30-energy finale rally gift",
    "Claim 30 rally energy",
    "Tower control throughout the day",
]:
    if stale.lower() in s.lower():
        raise SystemExit(f"stale copy remains: {stale}")

p.write_text(s, encoding="utf-8")
print("polished", p.stat().st_size, "bytes")
