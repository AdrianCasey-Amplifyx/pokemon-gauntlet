/**
 * Short Pokedex flavor text for every Gen 1 species (~1 sentence each).
 * Only revealed on the Pokedex screen once the player has CAUGHT the
 * species (had it in the roster at least once). Seen-but-not-caught
 * entries show the sprite and name but no description.
 *
 * Keyed by the species ID used in `src/data/pokemon.ts`.
 */
export const POKEDEX_ENTRIES: Record<string, string> = {
  // --- Kanto starters ---
  bulbasaur: "A seed Pokemon born with a plant bulb on its back that grows as it ages.",
  ivysaur: "The bulb on its back has blossomed into a large bud heavy with stored sunlight.",
  venusaur: "A massive flower blooms from its back; its sweet aroma soothes troubled hearts.",
  charmander: "The flame on its tail shows its vitality — it flickers faintly when the Pokemon tires.",
  charmeleon: "Claws, fangs, and a fiercer tail flame make this merciless Pokemon a ruthless brawler.",
  charizard: "A dragon-like Fire Pokemon whose flames burn hotter against stronger foes.",
  squirtle: "A bashful turtle Pokemon that retreats into its shell when threatened and jets water from its mouth.",
  wartortle: "The furry tail and ears trap air to prolong its dives — a symbol of long life.",
  blastoise: "Armed with high-pressure water cannons that can pierce steel plate at close range.",

  // --- Early-route bugs & birds ---
  caterpie: "Its forked antennae release a foul odor to repel predators while it munches leaves.",
  metapod: "Hardened shell protects the tender body inside while its cells prepare for evolution.",
  butterfree: "Its dust-covered wings are water-repellent, letting it fly through the rain.",
  weedle: "Wary of the sharp stinger on its head — one prick delivers a painful venom.",
  kakuna: "Nearly motionless, but its body heats up as it readies for its coming evolution.",
  beedrill: "Attacks in swarms, jabbing with three needle stingers until its target stops moving.",
  pidgey: "A common Flying Pokemon that whips up sand from the ground to hide from foes.",
  pidgeotto: "Fiercely territorial — it glides on wide wings searching for small prey.",
  pidgeot: "A majestic flier whose beautiful plumage hides startling speed and strength.",
  rattata: "Bites anything that moves. Its ever-growing fangs must be worn down constantly.",
  raticate: "Adapts to any environment with its webbed hind feet and rugged whiskers.",
  spearow: "A noisy Flying Pokemon that screeches loudly to warn its flock of danger.",
  fearow: "A proud hunter with a long neck and beak, perfect for snatching prey from water.",

  // --- Snakes, mice, and early rodents ---
  ekans: "Slithers silently through grass, flicking its forked tongue to track its quarry.",
  arbok: "The terrifying pattern on its hood varies by region, unsettling anything it meets.",
  pikachu: "Stores electricity in the pouches on its cheeks and zaps intruders who get too close.",
  raichu: "Excess electricity makes its body glow faintly in the dark — stay back if it's twitching.",
  sandshrew: "Burrows deep underground to escape the heat; its dry hide sheds sand easily.",
  sandslash: "Curls into a ball of spikes to roll away from trouble — or straight through it.",

  // --- Nidoran lines ---
  nidoran_f: "Small but unafraid — its tiny horn secretes a mild poison when it feels cornered.",
  nidorina: "Calm around its friends, ferocious in a pinch. Both horn and teeth are venomous.",
  nidoqueen: "Its hard scales make an excellent shield; a full-body tackle can flatten trees.",
  nidoran_m: "Listens for danger with enormous ears and counters with its poisoned horn.",
  nidorino: "Aggressive and proud — the slightest provocation sends it charging horn-first.",
  nidoking: "Swings its heavy tail like a wrecking ball to snap pillars and crumble walls.",

  // --- Fairies, normals ---
  clefairy: "A rare Fairy-like Pokemon said to arrive on moonlit nights to play in quiet glens.",
  clefable: "Its gentle footfalls make no sound — a shy creature rarely glimpsed by humans.",
  vulpix: "Born with a single white tail that splits into six as it grows and stores fire.",
  ninetales: "Said to live a thousand years; grabbing one of its tails is said to bring a curse.",
  jigglypuff: "Puffs itself up and sings a soothing lullaby that drops listeners straight to sleep.",
  wigglytuff: "Its fluffy fur is so soft that touching it instantly calms even the angriest foe.",

  // --- Caves ---
  zubat: "Navigates pitch-dark caves with ultrasonic waves since its eyes have long since dulled.",
  golbat: "Once it latches onto prey with its four fangs it won't let go until it's full.",
  oddish: "Walks on its root-feet by night to scatter seeds, then hides by day.",
  gloom: "The drool dripping from its mouth smells so foul it can knock out anything nearby.",
  vileplume: "The largest petals in the world — it stirs up clouds of toxic pollen when threatened.",
  paras: "Mushrooms on its back grow by drawing nutrients from the bug host it rides on.",
  parasect: "The host has long since been consumed — the mushroom is now in complete control.",
  venonat: "Compound eyes see in the dark and its stiff body fur acts as a radar.",
  venomoth: "Its wings shed poisonous dust — the color reveals the toxin it carries.",
  diglett: "Lives a meter underground, tilling the soil wherever it burrows.",
  dugtrio: "A trio of triplets that dig at speeds up to 100 km/h in any direction.",
  meowth: "Loves shiny objects above all else — it sleeps curled around its hoarded coins.",
  persian: "A proud, vain Pokemon whose six whiskers sense the slightest shift in air.",

  // --- Water dogs, ducks, monkeys ---
  psyduck: "Suffers from constant headaches that sometimes trigger bewildering psychic powers.",
  golduck: "Its webbed limbs let it swim faster than any Olympic champion.",
  mankey: "Flies into a rage at the slightest provocation — even its own companions aren't safe.",
  primeape: "Always furious. Making eye contact is enough to set it chasing you relentlessly.",
  growlithe: "A loyal Fire Pokemon that barks furiously to drive intruders from its territory.",
  arcanine: "An ancient legendary creature said to run the length of a continent in a day.",

  // --- Water / psychic / fighters ---
  poliwag: "The swirl on its belly is actually its visible internal organs through translucent skin.",
  poliwhirl: "Its spiral hypnotizes attackers, giving it time to slip back into the water.",
  poliwrath: "Bulging muscles let it swim the widest oceans without ever taking a rest.",
  abra: "Sleeps eighteen hours a day and teleports reflexively whenever danger approaches.",
  kadabra: "Its psychic energy is so strong it twists the spoon it holds to focus the power.",
  alakazam: "Its brain never stops growing; its IQ is said to exceed 5,000 at birth.",
  machop: "Trains by lifting Graveler as if they were dumbbells — its muscles never tire.",
  machoke: "Wears a power-save belt to keep its overwhelming strength in check.",
  machamp: "Four arms deliver five hundred punches per second at competition level.",

  // --- Grass biters, water blobs ---
  bellsprout: "Catches bugs by lashing out with its vines faster than the eye can follow.",
  weepinbell: "Spits acidic liquid to melt prey before swallowing it whole.",
  victreebel: "Lures victims with a honey-scented mouth and digests them over the course of a day.",
  tentacool: "Drifts on ocean currents using its translucent body and venomous tentacles.",
  tentacruel: "Eighty tentacles that stretch and contract freely trap anything caught in its grasp.",

  // --- Rocks ---
  geodude: "Mistaken for a boulder when it sleeps. Stepping on one is a painful mistake.",
  graveler: "Rolls down mountain slopes, growing in size as it picks up soil and crushes anything in its path.",
  golem: "Sheds its skin once a year and leaves behind a perfectly spherical boulder.",

  // --- Ponies, sleepers ---
  ponyta: "The fire on its mane is harmless to those it trusts but scalds any would-be thief.",
  rapidash: "Gallops at highway speeds with a blazing mane that streams behind it like a banner.",
  slowpoke: "Its tail is so tasty that fish bite it — it takes seconds for Slowpoke to notice.",
  slowbro: "A Shellder bit onto its tail and never let go, unlocking its psychic potential.",

  // --- Magnetic / farfetchd / doduo ---
  magnemite: "Floats via magnetic forces; units of three can power a small house.",
  magneton: "Three Magnemite linked together — their combined field disrupts compasses for miles.",
  farfetchd: "Carries a leek it refuses to part with; the stalk is both weapon and snack.",
  doduo: "Its two brains share thoughts and trot in perfect rhythm across the plains.",
  dodrio: "Three heads that never sleep at the same time — always alert for predators.",

  // --- Seals & slimes ---
  seel: "The protrusion on its head cracks through arctic ice as it searches for food.",
  dewgong: "Sleeps beneath the surface of the sea at night, unaffected by sub-zero currents.",
  grimer: "Born from industrial sludge, it thrives in the most polluted places on earth.",
  muk: "A toxic ooze so foul that all plants wilt in its wake.",
  shellder: "Clamps its iron-strong shell shut the moment anything approaches its tongue.",
  cloyster: "Its tightly-sealed shell is harder than diamond and hides countless pearls.",

  // --- Ghosts ---
  gastly: "A cloud of poisonous gas wrapped around a faint soul; a strong wind can disperse it.",
  haunter: "Licks its victims with a cursed tongue that leaves them constantly trembling.",
  gengar: "Hides in shadows on moonlit nights and grins at passersby before slipping away.",

  // --- Rock snake, sleepers ---
  onix: "Burrows underground at 80 km/h leaving tunnels big enough to walk through.",
  drowzee: "Feeds on dreams — it especially loves the dreams of joyful children.",
  hypno: "The pendulum it carries can hypnotize anything in seconds if you meet its gaze.",

  // --- Crabs & electric balls ---
  krabby: "Extends its claws when threatened; if one breaks off, a new one grows back rapidly.",
  kingler: "Waves its massive 10,000-horsepower pincher to signal friends and scare enemies.",
  voltorb: "Looks just like a Poke Ball — poke one by accident and it self-destructs.",
  electrode: "Stores electricity until it can hold no more and explodes with laughter.",

  // --- Eggs & coconut heads ---
  exeggcute: "Six eggs that communicate via telepathy — if one is damaged, the others hatch instantly.",
  exeggutor: "Each of its three heads thinks independently, so arguments break out often.",

  // --- Bone keepers ---
  cubone: "Wears its dead mother's skull as a helmet and cries at night remembering her.",
  marowak: "Hardened by loss, it swings the bone it carries like a seasoned boomerang fighter.",

  // --- Fighters ---
  hitmonlee: "Its long, springy legs extend at will to deliver devastating jump kicks.",
  hitmonchan: "Throws a hundred jabs in a single second like a seasoned professional boxer.",

  // --- Lickers, sludge, rocks ---
  lickitung: "Its sticky tongue is twice as long as its body and tastes everything it touches.",
  koffing: "Its thin skin is packed with toxic gas — a stray spark sets it exploding.",
  weezing: "Two heads that inhale each other's noxious breath to make even stronger poisons.",
  rhyhorn: "Powerful but forgetful — it charges forward and only stops when it hits something.",
  rhydon: "Walks upright on thick hind legs; its horn can shatter a diamond with one blow.",

  // --- Chansey, tangela, kanga ---
  chansey: "Lays perfectly nutritious eggs as gifts for anyone it finds injured in the wild.",
  tangela: "Its vine-like arms regrow instantly if cut — no one knows what's under the tangle.",
  kangaskhan: "An incredibly devoted parent that fiercely protects the baby in its belly pouch.",

  // --- Seahorses, fish ---
  horsea: "Shoots ink to blind pursuers while it darts away to safer waters.",
  seadra: "Males care for the young; its poison spines can be a serious problem for divers.",
  goldeen: "Swims upstream against the strongest currents with elegant, waving fins.",
  seaking: "In autumn, males display by using their horns to carve nesting holes into streambeds.",
  staryu: "Its central core glows with the light of the stars it watches nightly.",
  starmie: "Emits electric pulses from its core that some believe are a form of communication.",

  // --- Mime / bug / ice ---
  mr_mime: "A master of pantomime — it creates invisible barriers that even psychics respect.",
  scyther: "Slashes with sickle-like forearms so quickly that foes only see a blur.",
  jynx: "Communicates in a rhythmic chant that sounds disconcertingly like human speech.",
  electabuzz: "Often gathers around power plants to feast on the current, blacking out cities.",
  magmar: "Born in active volcanoes, it breathes fire hot enough to melt its enemies' armor.",
  pinsir: "Its mighty pincers crush foes and flip them into its mouth with practiced ease.",
  tauros: "Charges headlong across fields whipping itself with its three tails to build speed.",

  // --- Magikarp, Gyarados, Lapras, Ditto ---
  magikarp: "Famously weak and useless in a fight — but rumored to hide incredible potential.",
  gyarados: "Once provoked, it rampages until every living thing in its path is destroyed.",
  lapras: "A gentle Pokemon that ferries people across the sea while humming ancient songs.",
  ditto: "Rearranges its cells to transform into any creature it sees — but copies are imperfect.",

  // --- Eevee line ---
  eevee: "An unstable genetic code lets it evolve into many very different forms.",
  vaporeon: "Its molecular structure is so similar to water it becomes invisible when submerged.",
  jolteon: "Crackling fur generates a 10,000-volt shock when it feels the slightest stress.",
  flareon: "Stores flames in a special sac so its internal temperature tops 1,600 degrees.",

  // --- Porygon, fossils, aerodactyl ---
  porygon: "The world's first artificial Pokemon — it exists as a stream of pure code.",
  omanyte: "Drifted the ancient seas using its many tentacles for locomotion.",
  omastar: "Grew a thick, heavy shell that eventually slowed it to extinction.",
  kabuto: "A prehistoric Pokemon resurrected from a fossil — its eyes are just visible beneath the shell.",
  kabutops: "Used its scythes to slice prey and drink the resulting juices.",
  aerodactyl: "A fearsome sky predator from ancient times, revived from DNA in amber.",

  // --- Snorlax ---
  snorlax: "Sleeps its life away, waking only to eat 400 kg of food before dozing off again.",

  // --- Legendary birds ---
  articuno: "A legendary bird said to appear to travelers lost in icy mountains.",
  zapdos: "Said to nest in thunderclouds and grow more powerful after a lightning strike.",
  moltres: "When wounded, it dips its body into an active volcano to heal itself.",

  // --- Dratini line, mewtwo, mew ---
  dratini: "A rare and elusive serpent Pokemon long thought to be a myth.",
  dragonair: "Said to control the weather around it using the crystals on its neck and tail.",
  dragonite: "A kind-hearted Dragon Pokemon that guides shipwrecked sailors back to shore.",
  mewtwo: "A Pokemon engineered in a lab from ancient DNA — ruthless, intelligent, and rarely seen.",
  mew: "An ancestral Pokemon rumored to carry the genetic code of every species alive today.",
};
