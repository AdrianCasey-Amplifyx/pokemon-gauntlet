import Phaser from "phaser";

// 16x16 pixel art sprites defined as palette + grid
// Each character maps to a color, '.' = transparent

interface SpriteData {
  palette: Record<string, string>;
  grid: string[];
}

const SPRITES: Record<string, SpriteData> = {
  bulbasaur: {
    palette: {
      g: "#78C850", // green body
      d: "#3A7840", // dark green bulb
      b: "#58A848", // medium green
      c: "#98D878", // light green
      e: "#C03028", // red eyes
      k: "#282828", // dark
      t: "#487848", // teal
    },
    grid: [
      "................",
      "......dddd......",
      ".....dddddd.....",
      ".....dbddbd.....",
      "....ddbccbdd....",
      "....ddccccdd....",
      ".....gggggg.....",
      "....geggggeg....",
      "....gggggggg....",
      "....gggggggg....",
      ".....gg..gg.....",
      "....gg....gg....",
      "....tt....tt....",
      "................",
      "................",
      "................",
    ],
  },
  ivysaur: {
    palette: {
      g: "#78C850", // green body
      d: "#3A7840", // dark green
      c: "#98D878", // light green
      e: "#C03028", // red eyes
      p: "#E85888", // pink bud
      b: "#58A848", // medium green
    },
    grid: [
      "................",
      ".......pp.......",
      "......dppd......",
      ".....ddppdd.....",
      "....ddbccbdd....",
      "....ddccccdd....",
      ".....gggggg.....",
      "....geggggeg....",
      "....gggggggg....",
      "...gggggggggg...",
      "....gggggggg....",
      ".....gg..gg.....",
      "....gg....gg....",
      "....gg....gg....",
      "................",
      "................",
    ],
  },
  venusaur: {
    palette: {
      g: "#78C850", // green body
      d: "#3A7840", // dark green
      c: "#98D878", // light green
      e: "#C03028", // red eyes
      p: "#E85888", // pink flower
      f: "#F08080", // flower light
    },
    grid: [
      "....d..pp..d....",
      "...dd.pppp.dd...",
      "...ddppffppdd...",
      "....dppffppd....",
      "....ddppppdd....",
      ".....dddddd.....",
      "....gggggggg....",
      "...geggggggeg...",
      "..gggggggggggg..",
      "..gggggggggggg..",
      "...gggggggggg...",
      "....gg....gg....",
      "...gg......gg...",
      "...gg......gg...",
      "................",
      "................",
    ],
  },
  charmander: {
    palette: {
      o: "#E87040", // orange body
      c: "#F8D8A8", // cream belly
      e: "#282828", // eyes
      r: "#D03028", // flame red
      y: "#F8E838", // flame yellow
      d: "#C05830", // dark orange
    },
    grid: [
      "................",
      "......oooo......",
      ".....oooooo.....",
      ".....oeooeo.....",
      ".....oooooo.....",
      "......oooo......",
      "......odoo......",
      ".....oocoo......",
      "....oooccooo....",
      "....oocccoo.....",
      ".....oocoo..r...",
      ".....oo.oo.ry...",
      ".....o...o.y....",
      "....oo...oo.....",
      "....d.....d.....",
      "................",
    ],
  },
  charmeleon: {
    palette: {
      o: "#D04830", // darker red-orange
      c: "#F8D8A8", // cream belly
      e: "#282828", // eyes
      r: "#D03028", // flame red
      y: "#F8E838", // flame yellow
      d: "#A03020", // dark red
    },
    grid: [
      "................",
      ".....oooo.......",
      "....oooooo......",
      "....oeooeoo.....",
      "....oooooo......",
      ".....oooo.......",
      "......oo........",
      ".....oocoo......",
      "....oooccoo.....",
      "....oocccooo....",
      ".....oocoo..r...",
      ".....oo.oo..ry..",
      "....oo...o..y...",
      "....od...od.....",
      "....d.....d.....",
      "................",
    ],
  },
  charizard: {
    palette: {
      o: "#E87040", // orange body
      c: "#F8D8A8", // cream belly
      e: "#282828", // eyes
      r: "#D03028", // flame red
      y: "#F8E838", // flame yellow
      w: "#48A0C0", // blue-green wings
    },
    grid: [
      "...ww.....ww....",
      "..www.ooo.www...",
      "..ww.ooooo.ww...",
      ".ww..oeooeo.w...",
      ".w...oooooo.....",
      "......oooo......",
      "......ooo.......",
      ".....oocoo......",
      "....oooccoo.....",
      "....oocccooo....",
      ".....oocoo.r....",
      ".....oo.oo.ry...",
      "....oo...oo.y...",
      "....oo...oo.....",
      "....o.....o.....",
      "................",
    ],
  },
  squirtle: {
    palette: {
      b: "#6890F0", // blue body
      c: "#F8D8A8", // cream belly
      s: "#B08830", // shell brown
      d: "#4870C0", // dark blue
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbwwbb.....",
      "......bbbb......",
      "..sss.bbbb......",
      ".ssssscccc......",
      ".sssssccccb.....",
      ".sssssccccb.....",
      "..sss.bbbb......",
      "......bb.b......",
      ".....bb..bb.....",
      ".....dd..dd.....",
      "................",
      "................",
    ],
  },
  wartortle: {
    palette: {
      b: "#6890F0", // blue body
      c: "#F8D8A8", // cream belly
      s: "#B08830", // shell brown
      d: "#4870C0", // dark blue
      e: "#282828", // eyes
      w: "#F0F0F0", // white fluffy
    },
    grid: [
      "..ww..........ww",
      "..www...bb...www",
      "...ww.bbbbbb.w..",
      "......bebbeb....",
      "......bbwwbb....",
      ".......bbbb.....",
      "...sss.bbbb.....",
      "..ssssscccc.....",
      "..sssssccccb....",
      "..sssssccccb....",
      "...sss.bbbb.....",
      ".......bb.b.....",
      "......bb..bb....",
      "......dd..dd....",
      "................",
      "................",
    ],
  },
  blastoise: {
    palette: {
      b: "#6890F0", // blue body
      c: "#F8D8A8", // cream belly
      s: "#B08830", // shell brown
      d: "#4870C0", // dark blue
      e: "#282828", // eyes
      g: "#808080", // grey cannons
    },
    grid: [
      "................",
      "..g....bb....g..",
      "..g...bbbbbb.g..",
      "..g...bebbeb.g..",
      "..g...bbccbb.g..",
      "......bbccbb....",
      "..ssssbbccbb....",
      ".ssssssccccs....",
      ".ssssssccccss...",
      ".ssssssccccs....",
      "..ssssbbbbbb....",
      ".......bb.bb....",
      "......bb..bb....",
      ".....bbb..bbb...",
      "......d....d....",
      "................",
    ],
  },
  caterpie: {
    palette: {
      g: "#78C850", // green body
      y: "#F8E838", // yellow ring
      e: "#282828", // eyes
      r: "#C03028", // horn/antenna
      d: "#488830", // dark green
    },
    grid: [
      "................",
      "................",
      "................",
      "................",
      ".......rr.......",
      "......gggd......",
      "......geged.....",
      "......ggggd.....",
      ".....yggggyd....",
      "....gggggggd....",
      "...ygggggggyd...",
      "..ggggggggggd...",
      "..yggggggggyd...",
      "...gggggggdd....",
      "................",
      "................",
    ],
  },
  metapod: {
    palette: {
      g: "#78C850", // green shell
      d: "#488830", // dark green
      l: "#98D878", // light green
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....dggggd.....",
      "....dglgglgd....",
      "....dgegggd.....",
      "...dggggggd.....",
      "...dgdddggd.....",
      "...dgggdggd.....",
      "...dggggggd.....",
      "....dgdddgd.....",
      "....dggggd......",
      ".....dggd.......",
      "......dd........",
      "................",
      "................",
    ],
  },
  butterfree: {
    palette: {
      b: "#A0A0D0", // blue-white wings
      d: "#383868", // dark body
      w: "#F0F0F0", // white wing edge
      r: "#C03028", // red eyes
      p: "#9080C0", // purple
    },
    grid: [
      "................",
      ".bbb......bbb...",
      "bwbbbb..bbbbwb..",
      "bwbpbb..bbpbwb..",
      "bbbbbb..bbbbbb..",
      ".bbbb.dd.bbbb...",
      "..bb..dd..bb....",
      "......dd........",
      ".....drd........",
      ".....drdd.......",
      "......dd........",
      "......dd........",
      ".....d..d.......",
      "................",
      "................",
      "................",
    ],
  },
  weedle: {
    palette: {
      b: "#C0A050", // brown body
      d: "#886830", // dark brown
      r: "#C03028", // horn/stinger
      e: "#282828", // eyes
      p: "#E8C080", // light tan
    },
    grid: [
      "................",
      "................",
      "................",
      ".......r........",
      "......bbd.......",
      "......bebed.....",
      "......bbbbd.....",
      ".....pbbbpd.....",
      "....bbbbbbbd....",
      "...pbbbbbbpd....",
      "..bbbbbbbbbbd...",
      "..pbbbbbbbbpd...",
      "...bbbbbbbdd....",
      "........r.......",
      "................",
      "................",
    ],
  },
  kakuna: {
    palette: {
      y: "#D8C030", // yellow shell
      d: "#A09020", // dark yellow
      k: "#282828", // dark eyes
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....dyyyyd.....",
      "....dyyyyyd.....",
      "....dykykyd.....",
      "...dyyyyyyd.....",
      "...dyddddyd.....",
      "...dyyyyyyd.....",
      "...dyyddyyd.....",
      "....dyyyyd......",
      "....dyyyyd......",
      ".....dyyd.......",
      "......dd........",
      "................",
      "................",
    ],
  },
  beedrill: {
    palette: {
      y: "#D8C030", // yellow body
      k: "#282828", // black stripes
      w: "#F0F0F0", // wings
      r: "#C03028", // red eyes
      s: "#C0C0C0", // stinger/arms
    },
    grid: [
      "................",
      "....ww..ww......",
      "...wwww.www.....",
      "....ww..ww......",
      "s.....yyyy......",
      "ss...yryryy.....",
      ".s...yyyyyy.....",
      "......yyy.......",
      "......yky.......",
      ".....yykyy......",
      ".....ykyky......",
      "......yky.......",
      "......yyy.......",
      ".......s........",
      "......ss........",
      "................",
    ],
  },
  pidgey: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      o: "#E8A040", // orange beak
      w: "#C0A878", // wing
    },
    grid: [
      "................",
      "................",
      "......ddd.......",
      ".....dbbbd......",
      ".....bebbeb.....",
      ".....bbbbb......",
      "......bob.......",
      "......bbb.......",
      ".....bccbb......",
      "....wbccbbw.....",
      "...wwbccbwww....",
      "..www.bb.www....",
      "......bb.b......",
      "......oo.oo.....",
      "................",
      "................",
    ],
  },
  pidgeotto: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      o: "#E8A040", // orange beak
      r: "#C03028", // red crest
    },
    grid: [
      "................",
      "......rr........",
      "......rddd......",
      ".....dbbbbd.....",
      ".....bebbeb.....",
      ".....bbbbbb.....",
      "......bob.......",
      "......bbb.......",
      ".....bccbbb.....",
      "...dbbccbbbd....",
      "..ddbbccbbddd...",
      "..dd..bb..dd....",
      "......bb.bb.....",
      ".....bb..bb.....",
      "......oo.oo.....",
      "................",
    ],
  },
  pidgeot: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      o: "#E8A040", // orange beak
      r: "#C03028", // red/yellow crest
      y: "#F8E838", // yellow crest
    },
    grid: [
      ".....rr.........",
      "....rryr........",
      "....ryddd.......",
      "....ddbbbdd.....",
      "....dbebbeb.....",
      "....dbbbbbb.....",
      ".....bbob.......",
      ".....bbbb.......",
      "....bccbbbb.....",
      "..ddbccbbbdd....",
      ".dddbbccbbddd...",
      ".ddd..bb..ddd...",
      "......bb.bb.....",
      ".....bb..bb.....",
      ".....oo..oo.....",
      "................",
    ],
  },
  rattata: {
    palette: {
      p: "#A058A0", // purple body
      c: "#F0D8B0", // cream belly
      d: "#704070", // dark purple
      e: "#282828", // eyes
      w: "#F0F0F0", // whiskers/teeth
    },
    grid: [
      "................",
      "...pp.....pp....",
      "...pp.....pp....",
      "....pppppppp....",
      "....peppeppp....",
      "....pppppppp....",
      ".....ppwpp......",
      ".....pppp.......",
      "....ppccpp......",
      "....ppccpp......",
      ".....pppp.......",
      ".....pp.pp......",
      "....pp...pp.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  raticate: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream belly
      d: "#705030", // dark brown
      e: "#282828", // eyes
      w: "#F0F0F0", // whiskers/teeth
    },
    grid: [
      "................",
      "...dd.....dd....",
      "...bb.....bb....",
      "...bbbbbbbbb....",
      "...bbebbebb.....",
      "...bbbbbbbb.....",
      "....bbwwbb......",
      "....bbbbb.......",
      "...bbccbbb......",
      "..bbbccbbb......",
      "...bbbbbbb......",
      "....bb..bb......",
      "....bb..bb......",
      "...bdd..ddb.....",
      "................",
      "................",
    ],
  },
  spearow: {
    palette: {
      b: "#A06040", // brown body
      c: "#F0D8B0", // cream belly
      r: "#C03028", // red wings
      d: "#704020", // dark brown
      e: "#282828", // eyes
      o: "#E8A040", // beak
    },
    grid: [
      "................",
      "................",
      "......ddd.......",
      ".....dbbbd......",
      ".....bebbeb.....",
      ".....bbbbb......",
      "......boo.......",
      "......bbb.......",
      ".....rccbr......",
      "....rrccbrr.....",
      "...rr.bb.rr.....",
      "......bb.b......",
      "......oo.oo.....",
      "................",
      "................",
      "................",
    ],
  },
  fearow: {
    palette: {
      b: "#A06040", // brown body
      c: "#F0D8B0", // cream
      r: "#C03028", // red crest
      d: "#704020", // dark brown
      e: "#282828", // eyes
      o: "#E8A040", // long beak
    },
    grid: [
      "......rr........",
      ".....rrd........",
      "....ddbbd.......",
      "....dbebed......",
      "....dbbbbdd.....",
      ".....bbooo......",
      ".....bbbb.......",
      "....bbccbb......",
      "...dbbccbbd.....",
      "..dddbbbbddd....",
      ".ddd..bb..ddd...",
      "......bb.bb.....",
      ".....bb..bb.....",
      ".....oo..oo.....",
      "................",
      "................",
    ],
  },
  ekans: {
    palette: {
      p: "#A058A0", // purple body
      y: "#E8D060", // yellow belly/rattle
      d: "#704070", // dark purple
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      ".....pppp.......",
      "....pppppp......",
      "....peppep......",
      "....pppppp......",
      ".....pppp.......",
      "......pp........",
      ".....pppp.......",
      "....ppyypp......",
      "...ppyyyypp.....",
      "...py....yp.....",
      "...p......p.....",
      "....pp..pp......",
      ".....pppp.......",
      "................",
    ],
  },
  arbok: {
    palette: {
      p: "#A058A0", // purple body
      y: "#E8D060", // yellow pattern
      d: "#704070", // dark purple
      e: "#282828", // eyes
      r: "#C03028", // red mouth
    },
    grid: [
      ".....pppp.......",
      "....pppppp......",
      "....peppepp.....",
      "....ppprrpp.....",
      ".....pppp.......",
      "......pp........",
      "...ddppppdd.....",
      "..dppyyyyppd....",
      "..dpyeyyeypp....",
      "..dppyyyyppd....",
      "...ddppppdd.....",
      "......pp........",
      ".....pppp.......",
      "....pp..pp......",
      ".....pppp.......",
      "................",
    ],
  },
  sandshrew: {
    palette: {
      y: "#D8B860", // yellow body
      b: "#B09040", // brown
      d: "#887030", // dark
      w: "#F0E8C0", // white belly
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....dyyydy.....",
      ".....yeyeyyy....",
      ".....yyyyyy.....",
      "......yyyy......",
      ".....yywwyy.....",
      "....yywwwwyy....",
      "....yywwwwyy....",
      ".....yywwyy.....",
      ".....yy..yy.....",
      "....yy....yy....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  sandslash: {
    palette: {
      y: "#D8B860", // yellow body
      b: "#B09040", // brown spikes
      d: "#887030", // dark brown
      w: "#F0E8C0", // white belly
      e: "#282828", // eyes
    },
    grid: [
      "......dd.dd.....",
      ".....dbbdbd.....",
      "....dbbbbbd.....",
      "....dbyybbd.....",
      "...dbyeybyd.....",
      "...dbyyyybd.....",
      "....dyyyyd......",
      "...ddddddd......",
      "...yywwwwyy.....",
      "..yywwwwwwyy....",
      "...yywwwwyy.....",
      "....yy..yy......",
      "...yy....yy.....",
      "...dd....dd.....",
      "................",
      "................",
    ],
  },
  nidoran_f: {
    palette: {
      b: "#B068B0", // blue-pink body
      d: "#884888", // dark
      c: "#D098D0", // light pink
      e: "#282828", // eyes
      w: "#F0F0F0", // whisker
    },
    grid: [
      "................",
      "......d.........",
      ".....db.........",
      "....dbb.........",
      "....bbbbbb......",
      "....bebbeb......",
      "....bbbbbb......",
      ".....bbbb.......",
      "....bbccbb......",
      "....bbccbb......",
      ".....bbbb.......",
      ".....bb.bb......",
      "....bb...bb.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  nidorina: {
    palette: {
      b: "#B068B0", // blue-pink body
      d: "#884888", // dark
      c: "#D098D0", // light pink
      e: "#282828", // eyes
      s: "#A05898", // spots
    },
    grid: [
      "................",
      ".....dd.........",
      "....dbb.........",
      "....bbbbbbb.....",
      "....bebbebb.....",
      "....bbbbbbb.....",
      ".....bbbbb......",
      "....bbccbbb.....",
      "...bsbccbsbb....",
      "...bbbccbbbb....",
      "....bbbbbbb.....",
      ".....bb..bb.....",
      "....bb....bb....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  nidoqueen: {
    palette: {
      b: "#6890B0", // blue body
      d: "#486888", // dark blue
      c: "#C0B8A0", // cream belly
      e: "#282828", // eyes
      h: "#607898", // horn
    },
    grid: [
      "......h.........",
      ".....dbbb.......",
      "....dbbbbbd.....",
      "....dbebbeb.....",
      "....dbbbbbb.....",
      ".....bbbbb......",
      "....bbcccbb.....",
      "...bbbcccbbb....",
      "...bbbcccbbb....",
      "...bbbcccbbb....",
      "....bbbbbbb.....",
      ".....bb..bb.....",
      "....bb....bb....",
      "...bbb....bbb...",
      "....dd....dd....",
      "................",
    ],
  },
  nidoran_m: {
    palette: {
      p: "#B068D0", // purple body
      d: "#8848A8", // dark purple
      c: "#D098E0", // light purple
      e: "#282828", // eyes
      h: "#A060C0", // horn
    },
    grid: [
      "................",
      ".........h......",
      ".........pd.....",
      ".........ppd....",
      "....pppppp......",
      "....peppep......",
      "....pppppp......",
      ".....pppp.......",
      "....ppccpp......",
      "....ppccpp......",
      ".....pppp.......",
      ".....pp.pp......",
      "....pp...pp.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  nidorino: {
    palette: {
      p: "#B068D0", // purple body
      d: "#8848A8", // dark purple
      c: "#D098E0", // light purple
      e: "#282828", // eyes
      h: "#A060C0", // horn
    },
    grid: [
      "................",
      "........hh......",
      ".........pd.....",
      "....ppppppd.....",
      "....peppeppp....",
      "....ppppppp.....",
      ".....ppppp......",
      "....ppccppp.....",
      "...pppccpppp....",
      "...pppcccppp....",
      "....ppppppp.....",
      ".....pp..pp.....",
      "....pp....pp....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  nidoking: {
    palette: {
      p: "#A058C0", // purple body
      d: "#783898", // dark purple
      c: "#C0B8A0", // cream belly
      e: "#282828", // eyes
      h: "#906098", // horn
    },
    grid: [
      "......h.........",
      ".....dppp.......",
      "....dpppppd.....",
      "....dpeppep.....",
      "....dppppppp....",
      ".....ppppp......",
      "....ppcccpp.....",
      "...pppcccppp....",
      "...pppcccppp....",
      "...pppcccppp....",
      "....ppppppp.....",
      ".....pp..pp.....",
      "....pp....pp....",
      "...ppp....ppp...",
      "....dd....dd....",
      "................",
    ],
  },
  clefairy: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      b: "#804020", // brown ear tips
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "..b..........b..",
      "..pb........pb..",
      "...pp.pppp.pp...",
      "....pppppppp....",
      "....ppeppep.....",
      "....pppppppp....",
      ".....pppppp.....",
      "....pppppppp....",
      "....ppwwwppp....",
      "....ppwwwppp....",
      ".....pppppp.....",
      ".....pp..pp.....",
      "....pp....pp....",
      "....dd....dd....",
      "................",
    ],
  },
  clefable: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      b: "#804020", // brown ear tips
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "..b..........b..",
      "..pb........pb..",
      "...ppp.pp.ppp...",
      "....pppppppp....",
      "....ppeppep.....",
      "....pppppppp....",
      ".....pppppp.....",
      "...pppppppppp...",
      "...pppwwwpppp...",
      "...pppwwwpppp...",
      "....pppppppp....",
      ".....pp..pp.....",
      "....pp....pp....",
      "...ppp....ppp...",
      "....dd....dd....",
      "................",
    ],
  },
  vulpix: {
    palette: {
      r: "#D06030", // red-brown body
      o: "#E89060", // orange
      c: "#F0D0A0", // cream
      d: "#A04020", // dark red
      e: "#282828", // eyes
    },
    grid: [
      "..dd..dd..dd....",
      "..rd..rd..rd....",
      "..rr..rr..rr....",
      "...rr.rr.rr.....",
      "....rrrrrr......",
      "....rerrer......",
      "....rrrrrr......",
      ".....rrrr.......",
      "....rrccr.......",
      "....rrccr.......",
      ".....rrrr.......",
      ".....rr.rr......",
      "....rr...rr.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  ninetales: {
    palette: {
      y: "#E8D080", // golden body
      c: "#F8F0C0", // cream
      d: "#C0A050", // dark gold
      e: "#C03028", // red eyes
      o: "#D8B860", // darker gold
    },
    grid: [
      "dd.dd.dd.dd.dd..",
      "yd.yd.yd.yd.yd..",
      ".yy.yy.yy.yy....",
      "..yy.yyy.yy.....",
      "...yyyyyy.......",
      "....yeyey.......",
      "....yyyyyy......",
      ".....yyyy.......",
      "....yyccyy......",
      "...yyycccyy.....",
      "....yyccyy......",
      ".....yy..yy.....",
      "....yy....yy....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  jigglypuff: {
    palette: {
      p: "#F8A8B8", // pink body
      d: "#D08898", // dark pink
      e: "#48B8A8", // teal eyes
      k: "#282828", // pupils
      c: "#F0D0D8", // light pink
      h: "#C08080", // hair curl
    },
    grid: [
      "................",
      "......hh........",
      "......hppp......",
      ".....pppppp.....",
      "....pppppppp....",
      "....ppekpekp....",
      "....pppppppp....",
      "....pppppppp....",
      ".....pppppp.....",
      ".....pppppp.....",
      "......pppp......",
      ".....pp..pp.....",
      "....pp....pp....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  wigglytuff: {
    palette: {
      p: "#F8A8B8", // pink body
      d: "#D08898", // dark pink
      e: "#48B8A8", // teal eyes
      k: "#282828", // pupils
      c: "#F0D0D8", // light pink
      w: "#F0F0F0", // white belly
    },
    grid: [
      ".....pp..pp.....",
      "....pppp.pppp...",
      "....pppppppp....",
      "...pppppppppp...",
      "...ppekppekpp...",
      "...pppppppppp...",
      "...pppppppppp...",
      "....pppppppp....",
      "....ppwwwppp....",
      "...ppwwwwwpp....",
      "...ppwwwwwpp....",
      "....pppppppp....",
      ".....pp..pp.....",
      "....pp....pp....",
      "....dd....dd....",
      "................",
    ],
  },
  zubat: {
    palette: {
      b: "#7868A8", // blue-purple body
      d: "#584888", // dark purple
      w: "#A8A0C0", // lighter wings
      m: "#C03028", // mouth
      e: "#282828", // (no eyes)
    },
    grid: [
      "................",
      "................",
      "ww............ww",
      "dww..........wwd",
      "ddww........wwdd",
      "dddww..bb..wwddd",
      "ddddwwbbbbwwdddd",
      ".dddwbbbbbbwdd..",
      "..dd.bbbbbbd....",
      "......bmmb......",
      "......bbbb......",
      ".......bb.......",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  golbat: {
    palette: {
      b: "#7868A8", // blue-purple body
      d: "#584888", // dark purple
      w: "#A8A0C0", // lighter wings
      m: "#C03028", // mouth
      e: "#282828", // eyes
      f: "#F0F0F0", // fangs
    },
    grid: [
      "ww............ww",
      "dww..........wwd",
      "ddww........wwdd",
      "dddww..bb..wwddd",
      "ddddwwbbbbwwdddd",
      ".dddwbebbebwdd..",
      "..dd.bbbbbb.d...",
      "......bmmmb.....",
      ".....bfmmmfb....",
      "......bmmb......",
      "......bbbb......",
      ".......bb.......",
      "......b..b......",
      "................",
      "................",
      "................",
    ],
  },
  oddish: {
    palette: {
      b: "#4878C8", // blue body
      d: "#305898", // dark blue
      g: "#78C850", // green leaves
      k: "#488830", // dark green
      e: "#C03028", // red eyes
    },
    grid: [
      "................",
      "......g.g.g.....",
      ".....gkgkgkg....",
      "....gk.gkg.kg...",
      "....g..gkg..g...",
      ".....g.g.g.g....",
      "......bbbb......",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbebbebd....",
      "....bbbbbbbd....",
      ".....bbbbbbd....",
      "......bbbbd.....",
      "......bb.bb.....",
      "................",
      "................",
    ],
  },
  gloom: {
    palette: {
      b: "#4878C8", // blue body
      d: "#305898", // dark blue
      r: "#C03028", // red flower
      o: "#E87040", // orange petals
      e: "#282828", // eyes
      g: "#78C850", // green leaves
    },
    grid: [
      "................",
      "....or.rr.ro....",
      "...orrrrrrro....",
      "...orrrrrrro....",
      "....orrrrro.....",
      ".....gggg.......",
      "......bb........",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbebbebd....",
      "....bbbbbbbd....",
      ".....bbbbbbd....",
      "......bbbbd.....",
      "......bb.bb.....",
      "................",
      "................",
    ],
  },
  vileplume: {
    palette: {
      b: "#4878C8", // blue body
      d: "#305898", // dark blue
      r: "#C03028", // red petals
      y: "#F8E838", // yellow center
      e: "#282828", // eyes
      p: "#E05050", // petal
    },
    grid: [
      "................",
      "..rr..rr..rr....",
      ".rrrrrrrrrrrr...",
      ".rrrrryyrrrrrr..",
      ".rrrrryyrrrrrr..",
      "..rrrrrrrrrrr...",
      "..rrrr..rrrr....",
      "......bb........",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbebbebd....",
      "....bbbbbbbd....",
      ".....bbbbbbd....",
      "......bb.bb.....",
      "................",
      "................",
    ],
  },
  paras: {
    palette: {
      o: "#E87040", // orange body
      r: "#C03028", // red mushroom
      y: "#F8E838", // yellow spots
      d: "#A04020", // dark
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "....rr....rr....",
      "...ryrr..rryr...",
      "...rrrr..rrrr...",
      "....rr....rr....",
      ".....oooooo.....",
      "....oeooooeo....",
      "....oooooooo....",
      "...oooooooooo...",
      "....oooooooo....",
      "...oo.oooo.oo...",
      "..oo..o..o..oo..",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  parasect: {
    palette: {
      o: "#E87040", // orange body
      r: "#C03028", // red mushroom cap
      y: "#F8E838", // yellow spots
      d: "#A04020", // dark
      e: "#F0F0F0", // white eyes
    },
    grid: [
      "................",
      "...rrrrrrrr.....",
      "..rrryrrryrrr...",
      ".rrrrrrrrrrrr...",
      ".rrryrrrryrrrr..",
      ".rrrrrrrrrrrr...",
      "..rrrrrrrrrr....",
      "...oooooooo.....",
      "...oeoooooeo....",
      "...oooooooo.....",
      "..oooooooooo....",
      ".oo.oo..oo.oo...",
      "oo..o....o..oo..",
      "................",
      "................",
      "................",
    ],
  },
  venonat: {
    palette: {
      p: "#A058A0", // purple body
      d: "#704070", // dark purple
      r: "#C03028", // red eyes
      w: "#F0F0F0", // white eye
      f: "#C0A0C0", // fuzzy
    },
    grid: [
      "................",
      "......ffff......",
      ".....ffffff.....",
      "....ffffffff....",
      "....frrffrrf....",
      "....fwrffwrf....",
      "....ffffffff....",
      ".....pppppp.....",
      "....pppppppp....",
      "....pppppppp....",
      "....pppppppp....",
      ".....pppppp.....",
      "....pp.pp.pp....",
      "...pp..pp..pp...",
      "................",
      "................",
    ],
  },
  venomoth: {
    palette: {
      p: "#A058A0", // purple body
      w: "#C0B0D0", // wings
      d: "#704070", // dark
      e: "#282828", // eyes
      r: "#C03028", // red eyes
    },
    grid: [
      "................",
      ".www........www.",
      "wwwww..pp..wwwww",
      "wdwww.pppp.wwdww",
      "wdwwwppppppwwdww",
      ".www.prpppr.www.",
      "..ww.pppppp.ww..",
      "......pppp......",
      "......pppp......",
      ".......pp.......",
      "......p..p......",
      ".....p....p.....",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  diglett: {
    palette: {
      b: "#C0A070", // brown body
      d: "#886040", // dark brown
      p: "#F0B8C0", // pink nose
      e: "#282828", // eyes
      g: "#A08860", // ground
    },
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbppbb.....",
      ".....bbbbbb.....",
      "ggggggbbbbgggggg",
      "gggggggggggggggg",
      "gggggggggggggggg",
      "................",
    ],
  },
  dugtrio: {
    palette: {
      b: "#C0A070", // brown body
      d: "#886040", // dark brown
      p: "#F0B8C0", // pink nose
      e: "#282828", // eyes
      g: "#A08860", // ground
    },
    grid: [
      "................",
      "................",
      "................",
      "................",
      "......bb........",
      ".bb..bbbb..bb...",
      "bbbb.bebb.bbbb..",
      "bebb.bbpb.bebb..",
      "bbpb.bbbb.bbpb..",
      "bbbb.bbbb.bbbb..",
      "bbbb......bbbb..",
      "gggggggggggggggg",
      "gggggggggggggggg",
      "gggggggggggggggg",
      "................",
      "................",
    ],
  },
  meowth: {
    palette: {
      c: "#F0D8A0", // cream body
      b: "#C0A060", // brown
      d: "#A08040", // dark
      e: "#282828", // eyes
      y: "#F8E838", // gold charm
      w: "#F0F0F0", // whiskers
    },
    grid: [
      "................",
      "...cc.....cc....",
      "...cc..y..cc....",
      "....ccccccc.....",
      "....cccccccc....",
      "....ceeccecc....",
      "...wccccccccw...",
      "...w.cccccc.w...",
      "......cccc......",
      ".....cccccc.....",
      ".....cccccc.....",
      "......cccc......",
      ".....cc..cc.....",
      "....ccc..ccc....",
      "....dd....dd....",
      "................",
    ],
  },
  persian: {
    palette: {
      c: "#F0E0C0", // cream body
      b: "#C0A860", // tan
      d: "#A08040", // dark
      e: "#282828", // eyes
      r: "#C03028", // gem
      w: "#F0F0F0", // whiskers
    },
    grid: [
      "................",
      "...cc.....cc....",
      "...cc..r..cc....",
      "....ccccccc.....",
      "....cceccecc....",
      "...wcccccccw....",
      "...w.cccccc.w...",
      "......cccc......",
      ".....cccccc.....",
      "....cccccccc....",
      "...cccccccccc...",
      "....cccccccc....",
      ".....cc..cc.....",
      "....cc....cc....",
      "....dd....dd....",
      "................",
    ],
  },
  psyduck: {
    palette: {
      y: "#F0C830", // yellow body
      c: "#F8E888", // cream
      d: "#C0A020", // dark yellow
      e: "#282828", // eyes
      b: "#D0A020", // beak
    },
    grid: [
      "................",
      ".....yyyy.......",
      "....yyyyyy......",
      "....yeyyey......",
      "....yyyyyy......",
      ".....ybby.......",
      ".....yyyy.......",
      "....yyyyyy......",
      "....yyccyy......",
      "...yyyccyyy.....",
      "....yyyyyy......",
      ".....yy.yy......",
      "....yy...yy.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  golduck: {
    palette: {
      b: "#5078A0", // blue body
      d: "#384878", // dark blue
      r: "#C03028", // red gem
      c: "#C0B8A0", // cream beak
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....bbbb.......",
      "....bbrbb.......",
      "....bbbbbb......",
      "....bebbeb......",
      "....bbbbbb......",
      ".....bccb.......",
      ".....bbbb.......",
      "....bbbbbb......",
      "...bbbbbbbbb....",
      "....bbbbbbbb....",
      ".....bb..bb.....",
      "....bb....bb....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  mankey: {
    palette: {
      c: "#F0D8B0", // cream body
      b: "#C0A070", // brown
      d: "#886040", // dark
      e: "#282828", // eyes/nose
      r: "#C03028", // angry red
      p: "#F0B8C0", // pink nose
    },
    grid: [
      "................",
      "......ddd.......",
      ".....ccccc......",
      "....ccccccc.....",
      "....creccrecc...",
      "....cccpccc.....",
      ".....ccccc......",
      "......ccc.......",
      ".....ccccc......",
      "..c.ccccccc.c...",
      "..cccccccccc....",
      "......ccc.......",
      ".....cc.cc......",
      "....cc...cc.....",
      "....dd...dd.....",
      "................",
    ],
  },
  primeape: {
    palette: {
      c: "#F0D8B0", // cream body
      b: "#C0A070", // brown
      d: "#886040", // dark
      e: "#282828", // eyes
      r: "#C03028", // angry red
      p: "#F0B8C0", // pink
    },
    grid: [
      "................",
      ".....ccccc......",
      "....ccccccc.....",
      "...ccccccccc....",
      "...creccrecc....",
      "...cccpccccc....",
      "....ccccccc.....",
      ".....ccccc......",
      "..ccccccccccc...",
      "..c.ccccccc.c...",
      "....ccccccc.....",
      ".....cc.cc......",
      "....cc...cc.....",
      "...ccc...ccc....",
      "....dd...dd.....",
      "................",
    ],
  },
  growlithe: {
    palette: {
      o: "#E87040", // orange body
      c: "#F0D8A0", // cream mane
      d: "#A04820", // dark stripes
      e: "#282828", // eyes
      k: "#282828", // nose
    },
    grid: [
      "................",
      "......cccc......",
      ".....cccccc.....",
      "....oocoocoo....",
      "....oeoooeo.....",
      "....oooooo......",
      ".....okoo.......",
      "...ccooocc......",
      "..cccoocccc.....",
      "..cc.oddocc.....",
      ".....oddoo......",
      ".....oo.oo......",
      "....oo...oo.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  arcanine: {
    palette: {
      o: "#E87040", // orange body
      c: "#F0D8A0", // cream mane
      d: "#A04820", // dark stripes
      e: "#282828", // eyes
      k: "#282828", // nose
    },
    grid: [
      ".....cccc.......",
      "....ccccccc.....",
      "...cccccccc.....",
      "...ooeooeo......",
      "...oooooooo.....",
      "....ookoo.......",
      "..cccooooocc....",
      ".ccccooccccccc..",
      ".cc..oddooo.cc..",
      ".....oddoooo....",
      ".....oooooo.....",
      ".....oo..oo.....",
      "....oo....oo....",
      "...ooo....ooo...",
      "....dd....dd....",
      "................",
    ],
  },
  poliwag: {
    palette: {
      b: "#5878B0", // blue body
      d: "#3858A0", // dark blue
      w: "#F0F0F0", // white belly
      k: "#282828", // spiral
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbebbebb....",
      "....bbbbbbbb....",
      "....bbwwwwbb....",
      "....bwwkkwwb....",
      "....bwkkkkwb....",
      "....bwwkkwwb....",
      "....bbwwwwbb....",
      "......bbbb......",
      ".....b....b.....",
      "................",
      "................",
    ],
  },
  poliwhirl: {
    palette: {
      b: "#5878B0", // blue body
      d: "#3858A0", // dark blue
      w: "#F0F0F0", // white belly
      k: "#282828", // spiral
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbebbebb....",
      "....bbbbbbbb....",
      "...bbbwwwwbbb...",
      "...bbwwkkwwbb...",
      "...bbwkkkkwbb...",
      "...bbwwkkwwbb...",
      "...bbbwwwwbbb...",
      "....bbbbbbbb....",
      ".....bb..bb.....",
      "....bb....bb....",
      "....dd....dd....",
      "................",
    ],
  },
  poliwrath: {
    palette: {
      b: "#5878B0", // blue body
      d: "#3858A0", // dark blue
      w: "#F0F0F0", // white belly
      k: "#282828", // spiral
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "...bbbbbbbbbb...",
      "...bbbebbebbbb..",
      "...bbbbbbbbbb...",
      "..bbbbwwwwbbbb..",
      "..bbbwwkkwwbbb..",
      "..bbbwkkkkwbbb..",
      "..bbbwwkkwwbbb..",
      "..bbbbwwwwbbbb..",
      "...bbbbbbbbbb...",
      "....bbb..bbb....",
      "...bbb....bbb...",
      "....dd....dd....",
      "................",
    ],
  },
  kadabra: {
    palette: {
      y: "#D8A830", // yellow-brown
      b: "#A07828", // brown
      d: "#806018", // dark brown
      c: "#E8C848", // light yellow
      e: "#282828", // eyes
      s: "#C0C0C0", // spoon
    },
    grid: [
      "................",
      "..ss.yy..yy.....",
      "..s.ypy..ypy....",
      "..s.yyy..yyy....",
      ".s...yyyyyy.....",
      ".s...yeeyyy.....",
      "..s..yyycyy.....",
      "..s...yyyy......",
      "....yyyyyy......",
      "....ybccyyy.....",
      "....ybccyyy.....",
      ".....ybbyy......",
      ".....yy.yy......",
      "....bb...bb.....",
      "....d.....d.....",
      "................",
    ],
  },
  alakazam: {
    palette: {
      y: "#D8A830", // yellow-brown
      b: "#A07828", // brown
      d: "#806018", // dark brown
      c: "#E8C848", // light yellow
      e: "#282828", // eyes
      s: "#C0C0C0", // spoons
    },
    grid: [
      "ss............ss",
      ".s..yyy..yyy..s.",
      ".s..ypy..ypy.s..",
      "..s.yyy..yyy.s..",
      "..s..yyyyyy..s..",
      "..s..yeeyyy.s...",
      "...s.yyycyys....",
      "...s..yyyy.s....",
      ".....yyyyyyy....",
      "....yybccyyy....",
      "....yybccyyy....",
      ".....ybbyy......",
      ".....yy.yy......",
      "....bb...bb.....",
      "....d.....d.....",
      "................",
    ],
  },
  machop: {
    palette: {
      g: "#90A0B0", // grey-blue body
      d: "#607080", // dark grey-blue
      c: "#C0B8A0", // cream
      e: "#282828", // eyes
      r: "#C03028", // red
      h: "#A0B0B8", // head ridges
    },
    grid: [
      "................",
      ".......hh.......",
      "......hhhh......",
      ".....hggggh.....",
      ".....geggeg.....",
      ".....gggggg.....",
      "......gggg......",
      "...gggccccggg...",
      "...g.gccccg.g...",
      "...g..gccg..g...",
      "......gccg......",
      "......g..g......",
      ".....gg..gg.....",
      ".....dd..dd.....",
      ".....d....d.....",
      "................",
    ],
  },
  machoke: {
    palette: {
      g: "#90A0B0", // grey-blue body
      d: "#607080", // dark grey-blue
      c: "#C0B8A0", // cream
      e: "#282828", // eyes
      b: "#282828", // belt
      h: "#A0B0B8", // head ridges
    },
    grid: [
      "................",
      "......hhhh......",
      ".....hggggh.....",
      "....hgggggh.....",
      "....hgeggeg.....",
      "....hgggggg.....",
      ".....gggggg.....",
      "..ggggccccggg...",
      "..gggcccccggg...",
      "..gg.bbbbbbgg...",
      "......gccg......",
      "......g..g......",
      ".....gg..gg.....",
      ".....dd..dd.....",
      "....dd....dd....",
      "................",
    ],
  },
  machamp: {
    palette: {
      g: "#90A0B0", // grey-blue body
      d: "#607080", // dark grey-blue
      c: "#C0B8A0", // cream
      e: "#282828", // eyes
      b: "#282828", // belt
      h: "#A0B0B8", // head ridges
    },
    grid: [
      "......hhhh......",
      ".....hggggh.....",
      "....hgggggh.....",
      "....hgeggeg.....",
      "....hgggggg.....",
      "g..ggggggggg..g.",
      "gg.ggccccccgg.gg",
      "gg.gccccccgg.gg.",
      "gg..bbbbbbbb..gg",
      ".g...gccccg...g.",
      "......g..g......",
      ".....gg..gg.....",
      "....ggg..ggg....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  bellsprout: {
    palette: {
      g: "#78C850", // green stem/body
      y: "#F8E838", // yellow head
      d: "#488830", // dark green
      b: "#A07828", // brown
      e: "#282828", // eyes
      p: "#E85888", // pink mouth
    },
    grid: [
      "................",
      "......yyyy......",
      ".....yyyyyy.....",
      ".....yeyeyy.....",
      ".....yypyyy.....",
      "......yyyy......",
      ".......g........",
      ".......g........",
      "......gg........",
      ".....gg.........",
      "....gg..........",
      "....g...........",
      "...dg...........",
      "..ddd...........",
      "..dd............",
      "................",
    ],
  },
  weepinbell: {
    palette: {
      g: "#78C850", // green body
      y: "#F8E838", // yellow
      d: "#488830", // dark green
      e: "#282828", // eyes
      p: "#E85888", // pink mouth
    },
    grid: [
      "................",
      "...dd....dd.....",
      "...gg....gg.....",
      "...gyyyyygg.....",
      "...yyyyyyyg.....",
      "...yeyeyyyy.....",
      "...yyyppyyy.....",
      "...yyppppyy.....",
      "....yyyyyyyy....",
      ".....yyyyyyy....",
      "......g.........",
      "......g.........",
      ".....dd.........",
      "....dd..........",
      "................",
      "................",
    ],
  },
  victreebel: {
    palette: {
      g: "#78C850", // green body
      y: "#F8E838", // yellow
      d: "#488830", // dark green
      e: "#282828", // eyes
      p: "#E85888", // pink
    },
    grid: [
      "......gg........",
      ".....g..g.......",
      "....g....g......",
      "...dd....dd.....",
      "...gg....gg.....",
      "...gyyyyygg.....",
      "..gyyyyyyyg.....",
      "..gyeyeyyyyy....",
      "..gyyypppyyy....",
      "..gyypppppyy....",
      "...yyyyyyyyy....",
      "....yyyyyyyy....",
      ".....yyyyyy.....",
      "......yyyy......",
      "................",
      "................",
    ],
  },
  tentacool: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      r: "#C03028", // red gems
      c: "#80C0E0", // light blue
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bbebbeb....",
      ".....bbrrbbb....",
      ".....bbbbbb.....",
      "......bbbb......",
      "......b..b......",
      ".....b....b.....",
      "....b......b....",
      "...b........b...",
      "..b..........b..",
      "................",
      "................",
      "................",
    ],
  },
  tentacruel: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      r: "#C03028", // red gems
      c: "#80C0E0", // light blue
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....bbbbbb.....",
      "....bbbbbbbbb...",
      "....bbebbebbb...",
      "....bbrrrbbbb...",
      "....bbbbbbbbb...",
      ".....bbbbbbb....",
      "......bbbb......",
      ".....b.bb.b.....",
      "....b..bb..b....",
      "...b...bb...b...",
      "..b....bb....b..",
      ".b..b..bb..b..b.",
      "....b......b....",
      "................",
      "................",
    ],
  },
  geodude: {
    palette: {
      g: "#A09078", // grey-brown
      d: "#685848", // dark brown
      l: "#C0B098", // light
      e: "#282828", // eyes
      w: "#F0F0F0", // white eye glint
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....dgggdl.....",
      "....dggggddl....",
      "....dgegegd.....",
      "....dgggggd.....",
      ".dd.dgggggl.dd..",
      "dgdddgggggddgd..",
      "dggddddddddggd..",
      ".dggd.ddd.dggl..",
      "..dd...d...dd...",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  graveler: {
    palette: {
      g: "#A09078", // grey-brown
      d: "#685848", // dark brown
      l: "#C0B098", // light
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....dddddd.....",
      "....dggggggd....",
      "...dgggggggdl...",
      "...dgeggegdl....",
      "...dggggggdl....",
      "...dggggggdl....",
      "..dddgggggdddd..",
      ".dgddddddddgdl..",
      ".dggd.ddd.dggdl.",
      "..dggd...dggd...",
      "...ddd...ddd....",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  golem: {
    palette: {
      g: "#A09078", // grey-brown body
      d: "#685848", // dark brown
      l: "#C0B098", // light
      e: "#282828", // eyes
      r: "#887060", // rock shell
    },
    grid: [
      "................",
      "....rrrrrr......",
      "...rrrrrrrr.....",
      "..rrrrrrrrrrr...",
      "..rrrddddrrr....",
      "..rrdgggggdrr...",
      "..rrdgegeggdr...",
      "..rrdggggggdr...",
      "..rrdggggggdr...",
      "..rrdddddddrr...",
      "..rrrrrrrrrr....",
      "...rrrrrrrrr....",
      "....ggg..ggg....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  ponyta: {
    palette: {
      c: "#F0D8A0", // cream body
      r: "#D03028", // red fire mane
      y: "#F8E838", // yellow fire
      o: "#E87040", // orange fire
      e: "#282828", // eyes
      d: "#C0A070", // hooves
    },
    grid: [
      "......yr........",
      ".....yry........",
      "....yryr........",
      "....rycccc......",
      "....cecc.c......",
      "....cccc.c......",
      ".....cccc.......",
      ".yr.cccccc......",
      "yryrcccccc......",
      "ryry.cccc.......",
      ".yr..cc.cc......",
      ".....cc.cc......",
      "....cc...cc.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  rapidash: {
    palette: {
      c: "#F0D8A0", // cream body
      r: "#D03028", // red fire
      y: "#F8E838", // yellow fire
      o: "#E87040", // orange fire
      e: "#282828", // eyes
      d: "#C0A070", // hooves
      h: "#A8A0A0", // horn
    },
    grid: [
      "...yr..h........",
      "..yry..h........",
      ".yryryccc.......",
      ".ryrcccccc......",
      "..rycecc.c......",
      "..yr.ccc.c......",
      "..yr.cccc.......",
      "..yrcccccc......",
      ".yryrcccccc.....",
      ".ryry.cccc......",
      "..yr..cc.cc.....",
      "......cc.cc.....",
      ".....cc...cc....",
      "....ccc...ccc...",
      ".....dd...dd....",
      "................",
    ],
  },
  slowpoke: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      c: "#F0D0D8", // light pink
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "................",
      ".....ppppp......",
      "....ppppppp.....",
      "....ppewpep.....",
      "....ppppppp.....",
      ".....pppp.......",
      "....pppppp......",
      "...pppppppp.....",
      "...pppppppppp...",
      "...pppppppppp...",
      "....pppp.pppp...",
      "....pp....pp....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  slowbro: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      s: "#B0A0A8", // shellder
      c: "#F0D0D8", // light pink
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      ".....ppppp......",
      "....ppppppp.....",
      "....ppewpep.....",
      "....ppppppp.....",
      ".....pppp.......",
      "....pppppp......",
      "...pppppppp.....",
      "...ppppppppss...",
      "...pppppppssss..",
      "...pppppppssss..",
      "....pppp.ppss...",
      "....pp....pp....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  magnemite: {
    palette: {
      g: "#B0B0B0", // grey body
      d: "#808080", // dark grey
      b: "#5898D8", // blue
      r: "#C03028", // red
      y: "#F8E838", // yellow
      e: "#282828", // eye
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "................",
      "................",
      "......dddd......",
      ".....dggggd.....",
      "....dgggggd.....",
      "..r.dgewggd.b...",
      "..r.dgggggd.b...",
      "..r.dggggdd.b...",
      "....dgggggd.....",
      ".....dggggd.....",
      "......dddd......",
      ".......yy.......",
      "......yyyy......",
      "................",
      "................",
    ],
  },
  magneton: {
    palette: {
      g: "#B0B0B0", // grey body
      d: "#808080", // dark grey
      b: "#5898D8", // blue
      r: "#C03028", // red
      y: "#F8E838", // yellow
      e: "#282828", // eye
    },
    grid: [
      "......dddd......",
      ".....dggggd.....",
      "..r.dgewggd.b...",
      "..r.dggggdd.b...",
      "......dddd......",
      "...dddd..dddd...",
      "..dggggddggggd..",
      "rdgewgddgewgdb..",
      "rdggggddggggdb..",
      "..dgggg..ggggd..",
      "...dddd..dddd...",
      "....yy....yy....",
      "...yyyy..yyyy...",
      "................",
      "................",
      "................",
    ],
  },
  farfetchd: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      g: "#78C850", // green leek
      y: "#E8D060", // beak
    },
    grid: [
      "................",
      "..........g.....",
      ".........gg.....",
      "........gg......",
      ".......gg.......",
      ".....bbbg.......",
      "....bbbbb.......",
      "....bebb.b......",
      "....byyb........",
      ".....bbbb.......",
      "....bbccbb......",
      "....bbccbb......",
      ".....bbbb.......",
      "......yy.yy.....",
      "................",
      "................",
    ],
  },
  doduo: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      y: "#E8D060", // beak
    },
    grid: [
      "................",
      "....bb...bb.....",
      "...bbbb.bbbb....",
      "...bebb.bebb....",
      "...bbyb.bbyb....",
      "....bb...bb.....",
      ".....b...b......",
      ".....b...b......",
      "......bbb.......",
      ".....bbbbb......",
      "....bbbbbbb.....",
      ".....bbbbb......",
      "......b.b.......",
      ".....bb.bb......",
      ".....dd.dd......",
      "................",
    ],
  },
  dodrio: {
    palette: {
      b: "#A08050", // brown body
      c: "#F0D8B0", // cream
      d: "#705030", // dark brown
      e: "#282828", // eyes
      y: "#E8D060", // beak
    },
    grid: [
      "..bb..bb..bb....",
      ".bbbb.bbbb.bbb..",
      ".bebb.bebb.bebb.",
      ".bbyb.bbyb.bbyb.",
      "..bb..bb...bb...",
      "...b..b....b....",
      "...b..b..bb.....",
      "....b.b.b.......",
      ".....bbb........",
      "....bbbbb.......",
      "...bbbbbbb......",
      "....bbbbb.......",
      ".....b.b........",
      "....bb.bb.......",
      "....dd.dd.......",
      "................",
    ],
  },
  seel: {
    palette: {
      w: "#F0F0F0", // white body
      g: "#C0D0E0", // grey-blue
      d: "#90A0B0", // dark
      e: "#282828", // eyes
      n: "#282828", // nose
      c: "#D8D0E0", // light
    },
    grid: [
      "................",
      "................",
      ".....wwww.......",
      "....wwwwww......",
      "....wewwew......",
      "....wwwwww......",
      ".....wwnww......",
      ".....wwww.......",
      "....wwwwwww.....",
      "...wwwwwwwww....",
      "..gwwwwwwwwwg...",
      "..ggwwwwwwwgg...",
      "...gggwwwggg....",
      ".....gggg.......",
      "................",
      "................",
    ],
  },
  dewgong: {
    palette: {
      w: "#F0F0F0", // white body
      g: "#C0D0E0", // grey-blue
      d: "#90A0B0", // dark
      e: "#282828", // eyes
      h: "#E0D0C0", // horn
    },
    grid: [
      "......h.........",
      ".....wwww.......",
      "....wwwwww......",
      "....wewwew......",
      "....wwwwww......",
      ".....wwww.......",
      "....wwwwww......",
      "...wwwwwwww.....",
      "..wwwwwwwwww....",
      "..wwwwwwwwwww...",
      "...wwwwwwwwww...",
      "....wwwwwwww....",
      ".....gwwwg......",
      "......ggg.......",
      "......gdg.......",
      "................",
    ],
  },
  grimer: {
    palette: {
      p: "#9060A0", // purple body
      d: "#684880", // dark purple
      l: "#B080C0", // light purple
      e: "#F0F0F0", // white eyes
      k: "#282828", // pupils
    },
    grid: [
      "................",
      "................",
      "................",
      "......pppp......",
      ".....pppppp.....",
      "....ppekpekpp...",
      "....pppppppp....",
      "...pppppppppp...",
      "..pppppppppppp..",
      "..pppppppppppp..",
      ".ppppppppppppp..",
      ".pplppplppplpp..",
      "pppppppppppppp..",
      "dpppppppppppppd.",
      "................",
      "................",
    ],
  },
  muk: {
    palette: {
      p: "#9060A0", // purple body
      d: "#684880", // dark purple
      l: "#B080C0", // light purple
      e: "#F0F0F0", // white eyes
      k: "#282828", // pupils
    },
    grid: [
      "................",
      "......pppp......",
      ".....pppppp.....",
      "....pppppppp....",
      "...ppekpekppp...",
      "...pppppppppp...",
      "..ppppppppppp...",
      "..pppppppppppp..",
      ".ppppppppppppp..",
      "pppppppppppppppp",
      "ppplppplppplpppp",
      "pdppppppppppppdp",
      "dddpppppppppdddd",
      "..dddddddddddd..",
      "................",
      "................",
    ],
  },
  shellder: {
    palette: {
      p: "#A070C0", // purple shell
      d: "#705098", // dark purple
      w: "#F0F0F0", // white
      k: "#282828", // eyes
      i: "#C0A0D0", // inner
    },
    grid: [
      "................",
      "................",
      "................",
      "....dddddd......",
      "...dpppppdd.....",
      "..dppppppppd....",
      "..dpiippiipd....",
      "..dpppkpppdd....",
      "..dpppppppd.....",
      "..dppppppdd.....",
      "...dpppppd......",
      "....ddddd.......",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  cloyster: {
    palette: {
      p: "#A070C0", // purple shell
      d: "#705098", // dark purple
      k: "#282828", // face
      w: "#F0F0F0", // white
      i: "#C0A0D0", // inner
      s: "#D0D0D0", // spikes
    },
    grid: [
      "...s..s..s..s...",
      "..sdddddddds....",
      ".sddppppppddds..",
      "..dppiippipd....",
      ".dpppp..ppppd...",
      "dpppp.kk.pppds..",
      "dppp.kwkw.ppd...",
      "dpppp.kk.pppds..",
      ".dpppp..ppppd...",
      "..dppiippipd....",
      ".sddppppppddds..",
      "..sdddddddds....",
      "...s..s..s..s...",
      "................",
      "................",
      "................",
    ],
  },
  gastly: {
    palette: {
      p: "#705898", // purple
      d: "#483868", // dark purple
      g: "#9060C0", // gas/lighter purple
      e: "#F0F0F0", // white eyes
      k: "#282828", // pupils
      m: "#C03028", // mouth
    },
    grid: [
      "................",
      "...g..dddd..g...",
      "..g..dpppd...g..",
      ".g..dppppdd..g..",
      "..g.dpeppepd.g..",
      ".g..dpkppkpd..g.",
      "..g.dppmmppd.g..",
      "..g.dppmmppdg...",
      ".g...dppppd..g..",
      "..g..dppppd.g...",
      "..g...dddd...g..",
      "...g........g...",
      "....g..g..g.....",
      ".....gg.gg......",
      "................",
      "................",
    ],
  },
  haunter: {
    palette: {
      p: "#705898", // purple
      d: "#483868", // dark purple
      e: "#F0F0F0", // white eyes
      k: "#282828", // pupils
      m: "#C03028", // mouth
      h: "#9060C0", // hands
    },
    grid: [
      "................",
      "......dddd......",
      ".....dpppd......",
      "....dppppdd.....",
      "....dpeppepd....",
      "....dpkppkpd....",
      "....dppmmppd....",
      ".....dpppdd.....",
      "......dddd......",
      ".hh..........hh.",
      "hhhh........hhhh",
      ".hh..........hh.",
      "................",
      "..hh........hh..",
      "..hh........hh..",
      "................",
    ],
  },
  gengar: {
    palette: {
      p: "#705898", // purple body
      d: "#483868", // dark purple
      e: "#F0F0F0", // white eyes
      k: "#C03028", // red eyes
      m: "#F0F0F0", // white mouth/teeth
    },
    grid: [
      ".....d....d.....",
      "...ddppppppdd...",
      "..dppppppppppd..",
      ".dpppppppppppd..",
      ".dppekpppekppd..",
      ".dpppppppppppd..",
      ".dpppmmmmmppd...",
      ".dpppppppppppd..",
      "..dppppppppppd..",
      "...dppppppppd...",
      "....dpppppdd....",
      "....dpp..ppd....",
      "...dpp....ppd...",
      "...ddd....ddd...",
      "................",
      "................",
    ],
  },
  onix: {
    palette: {
      g: "#988878", // grey rock
      d: "#685850", // dark
      l: "#B8A898", // light
      e: "#282828", // eyes
      w: "#F0F0F0", // eye
    },
    grid: [
      "......ddd.......",
      ".....dggld......",
      ".....gellgd.....",
      ".....geeegd.....",
      "......gggg......",
      ".....dggd.......",
      "....dggl........",
      "...dggd.........",
      "...dggl.........",
      "....dggd........",
      ".....dgld.......",
      "......dggd......",
      ".......dgld.....",
      "........dgd.....",
      ".........dd.....",
      "................",
    ],
  },
  drowzee: {
    palette: {
      y: "#D8B860", // yellow body
      b: "#A07828", // brown
      d: "#806018", // dark brown
      e: "#282828", // eyes
      p: "#F0B8C0", // pink nose
    },
    grid: [
      "................",
      "......yyyy......",
      ".....yyyyyy.....",
      "....yyyyyyyyy...",
      "....yyeyeyyy....",
      "....yyyppyyy....",
      ".....yyyyy......",
      "......yyy.......",
      ".....bbbbb......",
      "....bbbbbbb.....",
      "....bbbbbbb.....",
      "....bbbbbbb.....",
      ".....bb.bb......",
      "....bb...bb.....",
      "....dd...dd.....",
      "................",
    ],
  },
  hypno: {
    palette: {
      y: "#D8B860", // yellow body
      b: "#A07828", // brown
      d: "#806018", // dark brown
      e: "#282828", // eyes
      w: "#F0F0F0", // white ruff
      s: "#C0C0C0", // pendulum
    },
    grid: [
      "................",
      "......yyyy......",
      ".....yyyyyy.....",
      "....yyyyyyyy....",
      "....yyeyeyy.....",
      "....yyyyyyyy....",
      ".....yyyyyy.....",
      "...wwwyyyyww....",
      "..wwwybbbywww...",
      "...w.ybbbby.w...",
      ".....ybbby......",
      ".....yb.by......",
      "....yy...yy.....",
      "....dd...dd.....",
      "......s.........",
      ".....sss........",
    ],
  },
  krabby: {
    palette: {
      r: "#D06030", // red body
      c: "#F0B080", // cream
      d: "#A04020", // dark red
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "................",
      "......e..e......",
      ".dd...rrrr...dd.",
      "drrd.rrrrrr.drrd",
      "drrd.rrrrrr.drrd",
      ".dd..rccccr..dd.",
      ".....rccccr.....",
      "......rrrr......",
      "......r..r......",
      ".....rr..rr.....",
      "....rr....rr....",
      "....dd....dd....",
      "................",
      "................",
      "................",
    ],
  },
  kingler: {
    palette: {
      r: "#D06030", // red body
      c: "#F0B080", // cream
      d: "#A04020", // dark red
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....e....e.....",
      "..dd.rrrrrr.dd..",
      "drrrdrrrrrrdddd.",
      "drrrdrrrrrrdrrrd",
      "drrrdrccccrdrrrd",
      "dddddrccccr.ddd.",
      "..dd.rccccr..dd.",
      "......rrrr......",
      "......rrrr......",
      "......r..r......",
      ".....rr..rr.....",
      "....rr....rr....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  voltorb: {
    palette: {
      r: "#D03028", // red top
      w: "#F0F0F0", // white bottom
      d: "#A02020", // dark red
      k: "#282828", // line/eyes
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "......dddd......",
      ".....drrrrd.....",
      "....drrrrrrd....",
      "....drrrrrrd....",
      "....drrrrrrd....",
      "...drrrrrrrrd...",
      "...dkkkkkkkkkd..",
      "...dwwwewwwwd...",
      "...dwwwwwwwwd...",
      "....dwwwwwwd....",
      "....dwwwwwwd....",
      ".....dwwwwd.....",
      "......dddd......",
      "................",
      "................",
    ],
  },
  electrode: {
    palette: {
      r: "#D03028", // red bottom (flipped from voltorb)
      w: "#F0F0F0", // white top
      d: "#A02020", // dark red
      k: "#282828", // line/eyes
    },
    grid: [
      "................",
      "......dddd......",
      ".....dwwwwd.....",
      "....dwwwwwwd....",
      "....dwwwwwwd....",
      "....dwwwwwwd....",
      "...dwwwewwwwd...",
      "...dkkkkkkkkkd..",
      "...drrrrrrrrrd..",
      "...drrrrrrrrrd..",
      "....drrrrrrd....",
      "....drrrrrrd....",
      ".....drrrrd.....",
      "......dddd......",
      "................",
      "................",
    ],
  },
  exeggcute: {
    palette: {
      p: "#F0B8C0", // pink shell
      c: "#F0E8A0", // cream/egg
      d: "#C09060", // dark
      e: "#282828", // eyes
      g: "#78C850", // crack green
    },
    grid: [
      "................",
      "......dd........",
      ".....dccd.......",
      "....dceced......",
      "....dcccd..dd...",
      ".....ddd..dccd..",
      "..dd.....dceced.",
      ".dccd....dcccd..",
      "dceced....ddd...",
      "dcccd..dd.......",
      ".ddd..dccd......",
      "......dceced....",
      "......dcccd.....",
      ".......ddd......",
      "................",
      "................",
    ],
  },
  exeggutor: {
    palette: {
      g: "#78C850", // green leaves
      c: "#F0E8A0", // cream/egg heads
      d: "#488830", // dark green
      b: "#A07828", // brown trunk
      e: "#282828", // eyes
    },
    grid: [
      ".gggg..gg..gggg.",
      "gcecgggcgggcecg.",
      "gccgcecggggccg..",
      ".gggccg..g.ggg..",
      "...gggg..gg.....",
      ".....bbbb.......",
      "......bb........",
      "......bb........",
      "......bb........",
      "......bb........",
      "......bb........",
      "......bb........",
      ".....bbbb.......",
      "....bb..bb......",
      "....dd..dd......",
      "................",
    ],
  },
  cubone: {
    palette: {
      b: "#C0A060", // brown body
      w: "#F0F0F0", // white skull
      d: "#886040", // dark brown
      e: "#282828", // eyes
      g: "#A09080", // bone club
    },
    grid: [
      "................",
      "......wwww......",
      ".....wwwwww.....",
      ".....wewwew.....",
      ".....wwwwww.....",
      "......wwww......",
      "......bbbb......",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "gg..bbbbbbbb....",
      ".gg..bbbbb......",
      "..g..bb.bb......",
      ".....bb.bb......",
      "....bb...bb.....",
      "....dd...dd.....",
      "................",
    ],
  },
  marowak: {
    palette: {
      b: "#C0A060", // brown body
      w: "#F0F0F0", // white skull
      d: "#886040", // dark brown
      e: "#282828", // eyes
      g: "#A09080", // bone
    },
    grid: [
      "................",
      ".....wwwww......",
      "....wwwwwww.....",
      "....wwewwew.....",
      "....wwwwwww.....",
      ".....wwwww......",
      "......bbbb......",
      ".....bbbbbb.....",
      "...gbbbbbbbbg...",
      "..gggbbbbbbggg..",
      "...g.bbbbb.g....",
      ".....bb.bb......",
      "....bb...bb.....",
      "...bbb...bbb....",
      "....dd...dd.....",
      "................",
    ],
  },
  hitmonlee: {
    palette: {
      b: "#C0A060", // brown body
      c: "#F0D8B0", // cream
      d: "#886040", // dark brown
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbbbbb.....",
      "......bbbb......",
      "......bbbb......",
      "....bbccccbb....",
      "....bbccccbb....",
      ".....bbbbbb.....",
      "......b..b......",
      ".....bb..bb.....",
      "....bb....bb....",
      "...bb......bb...",
      "...ddd....ddd...",
      "................",
    ],
  },
  hitmonchan: {
    palette: {
      b: "#C0A060", // brown body
      c: "#F0D8B0", // cream
      d: "#886040", // dark brown
      e: "#282828", // eyes
      r: "#C03028", // red gloves
    },
    grid: [
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbbbbb.....",
      "......bbbb......",
      "......bbbb......",
      "...rbbccccbbr...",
      "..rrrccccccrrr..",
      "..rr.bbbbbb.rr..",
      "......bbbb......",
      "......b..b......",
      ".....bb..bb.....",
      "....bb....bb....",
      "....dd....dd....",
      "................",
    ],
  },
  lickitung: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      r: "#D05060", // tongue
      e: "#282828", // eyes
      c: "#F0D0D8", // light pink
    },
    grid: [
      "................",
      ".....pppp.......",
      "....pppppp......",
      "....peppepp.....",
      "....pppppp......",
      ".....pprrr......",
      "......prrr......",
      ".....pppp.......",
      "...pppcccppp....",
      "...pppcccppp....",
      "...pppcccppp....",
      "....ppppppp.....",
      ".....pp.pp......",
      "....pp...pp.....",
      "....dd...dd.....",
      "................",
    ],
  },
  koffing: {
    palette: {
      p: "#9060A0", // purple body
      d: "#684880", // dark purple
      k: "#282828", // skull pattern
      w: "#F0F0F0", // white
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....ddddd......",
      "....dppppppd....",
      "...dpppppppd....",
      "...dpeppepp.d...",
      "...dppppppppd...",
      "...dppkkkppd....",
      "...dpkkwkkpd....",
      "...dppkkkppd....",
      "...dppppppppd...",
      "....dpppppd.....",
      ".....ddddd......",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  weezing: {
    palette: {
      p: "#9060A0", // purple body
      d: "#684880", // dark purple
      k: "#282828", // skull pattern
      w: "#F0F0F0", // white
      e: "#282828", // eyes
    },
    grid: [
      "......ddddd.....",
      ".....dpppppd....",
      "....dpeppepd....",
      "....dppppppd....",
      "....dpkkkpd.....",
      "....ddddddd.....",
      "..dddddd........",
      ".dppppppd.......",
      "dpeppepddd......",
      "dpppppppppd.....",
      "dppkkkppppd.....",
      "dpkkwkkpppd.....",
      "dppkkkppppd.....",
      ".dpppppppd......",
      "..ddddddd.......",
      "................",
    ],
  },
  rhyhorn: {
    palette: {
      g: "#A09080", // grey body
      d: "#686058", // dark grey
      l: "#C0B0A0", // light
      e: "#282828", // eyes
      h: "#B0A090", // horn
    },
    grid: [
      "................",
      ".....hh.........",
      "....hggggg......",
      "...gggggggg.....",
      "...gegggggg.....",
      "...ggggggggg....",
      "...ddgggggggg...",
      "..ddggggggggg...",
      "..dgggggggggg...",
      "..dggggggggg....",
      "...ggggggggg....",
      "...gg.gg.gg.....",
      "...gg.gg.gg.....",
      "...dd.dd.dd.....",
      "................",
      "................",
    ],
  },
  rhydon: {
    palette: {
      g: "#A09080", // grey body
      d: "#686058", // dark grey
      l: "#C0B0A0", // light
      e: "#282828", // eyes
      h: "#B0A090", // horn
    },
    grid: [
      ".....hh.........",
      "....hgggg.......",
      "...ggggggg......",
      "...gegggggg.....",
      "...ggggggggg....",
      "....ggggggg.....",
      "..gggggggggg....",
      "..g.gggggggg....",
      "..g.gggggggg....",
      "..g..ggggggg....",
      "......ggggg.....",
      ".....gg..gg.....",
      "....gg....gg....",
      "...ggg....ggg...",
      "....dd....dd....",
      "................",
    ],
  },
  chansey: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      w: "#F0F0F0", // white egg
      e: "#282828", // eyes
      c: "#F0D0D8", // light pink
    },
    grid: [
      "................",
      "......pppp......",
      ".....pppppp.....",
      ".....peppepp....",
      ".....pppppp.....",
      "......pppp......",
      "....pppppppp....",
      "...ppppwwpppp...",
      "...ppppwwpppp...",
      "...pppppppppp...",
      "....pppppppp....",
      ".....pp..pp.....",
      "....pp....pp....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  tangela: {
    palette: {
      b: "#5078C8", // blue body
      v: "#3858A8", // dark blue vines
      g: "#78C850", // green vines
      d: "#488830", // dark green
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "..gdgd..gdgd....",
      ".gdgdgdgdgdgd...",
      ".dgdgdgdgdgdg...",
      ".gdgdgdgdgdgd...",
      ".dgdgegegdgdg...",
      ".gdgdgdgdgdgd...",
      ".dgdgdgdgdgdg...",
      ".gdgdgdgdgdgd...",
      "..dgdgdgdgdg....",
      "...gdgdgdgd.....",
      "....bb..bb......",
      "....dd..dd......",
      "................",
      "................",
      "................",
    ],
  },
  kangaskhan: {
    palette: {
      b: "#C0A060", // brown body
      c: "#F0D8B0", // cream belly
      d: "#886040", // dark
      e: "#282828", // eyes
      p: "#D0B080", // pouch
    },
    grid: [
      "................",
      ".....bbbb.......",
      "....bbbbbb......",
      "....bebbeb......",
      "....bbbbbb......",
      ".....bbbb.......",
      "....bbbbbb......",
      "...bbbccbbb.....",
      "..bbbbccbbbb....",
      "..bb.bppbb.bb...",
      ".....bppbb......",
      "......bbbb......",
      "......bb.bb.....",
      ".....bb..bb.....",
      ".....dd..dd.....",
      "................",
    ],
  },
  horsea: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      c: "#80C0E0", // light blue
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbbb.....",
      ".....bbbbbb.....",
      "......bbb.......",
      "......bbb.......",
      ".....bbbbb......",
      "....bbbbbbb.....",
      ".....bbbbb......",
      "......bbb.......",
      ".......bb.......",
      "......bbb.......",
      "......bb........",
      "................",
    ],
  },
  seadra: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      c: "#80C0E0", // light blue
      e: "#282828", // eyes
      s: "#486888", // spines
    },
    grid: [
      "................",
      ".....sbbbb......",
      "....sbbbbbbs....",
      "....sbebb.bs....",
      "....sbbbbbs.....",
      ".....sbbb.......",
      "......bbb.......",
      ".....bbbbb......",
      "...sbbbbbbs.....",
      "..sbbbbbbbbs....",
      "...sbbbbbbs.....",
      "......bbb.......",
      ".......bb.......",
      "......bbb.......",
      ".......bb.......",
      "................",
    ],
  },
  goldeen: {
    palette: {
      r: "#E87040", // red-orange body
      w: "#F0F0F0", // white
      d: "#A04820", // dark
      e: "#282828", // eyes
      h: "#C0A080", // horn
    },
    grid: [
      "................",
      "................",
      ".......h........",
      "......wwww......",
      ".....wwwwww.....",
      ".....wewwew.....",
      "....rwwwwwwr....",
      "...rrwwwwwrrr...",
      "...rrrwwwrrr....",
      "....rrwwrr......",
      ".....rrrr.......",
      "......rr........",
      "......rr........",
      ".....rrrr.......",
      "....rr..rr......",
      "................",
    ],
  },
  seaking: {
    palette: {
      r: "#E87040", // red-orange body
      w: "#F0F0F0", // white
      d: "#A04820", // dark
      e: "#282828", // eyes
      h: "#C0A080", // horn
    },
    grid: [
      "................",
      "......hh........",
      "......wwww......",
      ".....wwwwww.....",
      "....wwwwwwww....",
      "....wewwweww....",
      "...rwwwwwwwwr...",
      "..rrrwwwwwrrrr..",
      "..rrrrwwwrrrr...",
      "...rrrwwrrr.....",
      "....rrrrrr......",
      ".....rrrr.......",
      ".....rrrr.......",
      "....rr..rr......",
      "................",
      "................",
    ],
  },
  staryu: {
    palette: {
      b: "#C0A060", // brown body
      r: "#C03028", // red gem
      d: "#886040", // dark
      y: "#F8E838", // yellow
    },
    grid: [
      "................",
      ".......bb.......",
      "......bbbb......",
      "......bbbb......",
      ".....bbbbbb.....",
      "..bbbbbrrbbbb...",
      ".bbbbbbrrbbbbb..",
      "..bbbbbbbbbb....",
      ".....bbbbbb.....",
      "......bbbb......",
      ".....bb..bb.....",
      "....bb....bb....",
      "...bb......bb...",
      "..bb........bb..",
      "................",
      "................",
    ],
  },
  starmie: {
    palette: {
      p: "#A070C0", // purple body
      r: "#C03028", // red gem
      d: "#705090", // dark purple
      g: "#D0A0E0", // light purple
    },
    grid: [
      "................",
      ".......pp.......",
      "......pppp......",
      ".....pppppp.....",
      ".....pppppp.....",
      "..ppppprppppp...",
      ".pppppprpppppp..",
      "..pppppppppp....",
      ".....pppppp.....",
      "....pppppp......",
      "....pp..pp......",
      "...pp....pp.....",
      "..pp......pp....",
      ".pp........pp...",
      "................",
      "................",
    ],
  },
  mr_mime: {
    palette: {
      p: "#F0A0B0", // pink body
      b: "#5078C8", // blue
      c: "#F0D8B0", // cream
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "................",
      "......pppp......",
      ".....pppppp.....",
      ".....peppepp....",
      ".....pppppp.....",
      "......pppp......",
      "......pppp......",
      "..bb.ppccpp.bb..",
      "..bb.ppccpp.bb..",
      "..bb..pppp..bb..",
      "......pppp......",
      "......p..p......",
      ".....pp..pp.....",
      ".....bb..bb.....",
      "................",
      "................",
    ],
  },
  scyther: {
    palette: {
      g: "#78C850", // green body
      d: "#488830", // dark green
      w: "#C0D8B0", // wings
      e: "#282828", // eyes
      s: "#F0F0F0", // scythe blades
    },
    grid: [
      "................",
      "......gggg......",
      ".....gggggg.....",
      ".....geggeg.....",
      ".....gggggg.....",
      "......gggg......",
      "..ww..gggg..ww..",
      "..www.gggg.www..",
      "s..wwggggwww...s",
      "ss..ggggggg..ss.",
      ".s...gggg...s...",
      "......g..g......",
      ".....gg..gg.....",
      "....gg....gg....",
      "....dd....dd....",
      "................",
    ],
  },
  jynx: {
    palette: {
      r: "#C03028", // red dress
      b: "#A068A0", // purple body/face
      y: "#F8E838", // yellow hair
      d: "#804080", // dark purple
      e: "#282828", // eyes
      p: "#F0A0B0", // pink lips
    },
    grid: [
      "..yyyy.yyyy.....",
      ".yyyyy.yyyyy....",
      "..yybbbbbbyy....",
      "...bbbebbeb.....",
      "...bbbbbbbb.....",
      "...bbbppbbb.....",
      "....bbbbbb......",
      "...rrrrrrrr.....",
      "..rrrrrrrrrr....",
      "..rrrrrrrrrr....",
      "..rrrrrrrrrr....",
      "..rrrrrrrrrr....",
      "...rrrrrrrr.....",
      "....rrrrrr......",
      "................",
      "................",
    ],
  },
  electabuzz: {
    palette: {
      y: "#F0C830", // yellow body
      k: "#282828", // black stripes
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      "..yy.......yy...",
      "..yy..yyy..yy...",
      "...yyyyyyyy.....",
      "...yyeyyeyy.....",
      "...yyyyyyyy.....",
      "....yyyyyy......",
      ".....yyyy.......",
      "..y.yykkyyy.y...",
      "..yyykkkkyyy....",
      "..yy.ykkyy.yy...",
      "......yyyy......",
      "......y..y......",
      ".....yy..yy.....",
      "....yy....yy....",
      "....kk....kk....",
      "................",
    ],
  },
  magmar: {
    palette: {
      r: "#D04830", // red body
      y: "#F8E838", // yellow
      o: "#E88040", // orange
      d: "#A03020", // dark red
      e: "#282828", // eyes
    },
    grid: [
      ".....yy.yy......",
      "......rrr.......",
      ".....rrrrrr.....",
      ".....rerrer.....",
      ".....rrrrrr.....",
      "......rrrr......",
      "......rrrr......",
      "..r..rryyrr..r..",
      "..rr.rryyrr.rr..",
      "..rr..rrrr..rr..",
      "......rrrr......",
      "......r..r......",
      ".....rr..rr.....",
      "....rr....rr....",
      "....dd....dd....",
      "................",
    ],
  },
  pinsir: {
    palette: {
      b: "#C0A060", // brown body
      d: "#886040", // dark brown
      g: "#A09070", // grey pincers
      e: "#282828", // eyes
    },
    grid: [
      "..g..........g..",
      "..gg........gg..",
      "...gg......gg...",
      "...ggg....ggg...",
      "....gggggggg....",
      "....gggdgggg....",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "....bbbbbbbb....",
      ".....bbbbbb.....",
      "......b..b......",
      ".....bb..bb.....",
      ".....dd..dd.....",
      "................",
    ],
  },
  tauros: {
    palette: {
      b: "#C0A060", // brown body
      d: "#886040", // dark brown
      g: "#A09080", // grey horns
      e: "#282828", // eyes
      c: "#F0D8B0", // cream
    },
    grid: [
      "gg..........gg..",
      ".gg.bbbbbb.gg...",
      "..ggbebbebgg....",
      "....bbbbbb......",
      ".....bbbb.......",
      "....bbbbbb......",
      "...bbbbbbbb.....",
      "..bbbbbbbbbb....",
      "..bbbbbbbbbb....",
      "...bbbbbbbb.....",
      "....bb..bb......",
      "...bb....bb.....",
      "...dd....dd.....",
      "................",
      "................",
      "................",
    ],
  },
  magikarp: {
    palette: {
      r: "#D06030", // red-orange body
      o: "#E89060", // orange
      y: "#F8E838", // yellow
      d: "#A04020", // dark red
      e: "#282828", // eyes
      w: "#F0F0F0", // whisker
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....drrrrd.....",
      "....drrrrrrrd...",
      "w..drrrerrrrd...",
      "w..drrrrrrrrrd..",
      "...drrrrrrrrd...",
      "....drrrrrrrd...",
      ".....drrrrrd....",
      "......ddddd..dd.",
      "..............dd",
      "...........dd...",
      "................",
      "................",
      "................",
    ],
  },
  gyarados: {
    palette: {
      b: "#5878C8", // blue body
      d: "#3850A0", // dark blue
      c: "#F0D8B0", // cream
      r: "#C03028", // red
      e: "#282828", // eyes
      w: "#F0F0F0", // white
    },
    grid: [
      ".....bbbbb......",
      "....bbbbbbb.....",
      "...bbebbbbeb....",
      "...bbbbbbbb.....",
      "...bbrrrbb......",
      "....bbbb........",
      ".....bbb........",
      "....bbbbb.......",
      "...bbbbbbb......",
      "..bbbccbbbb.....",
      "..bbccccbbb.....",
      "...bbbbbbb......",
      "....bbbbb.......",
      ".....bbb........",
      "......bb........",
      "................",
    ],
  },
  lapras: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      c: "#F0D8B0", // cream belly
      g: "#A0B8C0", // grey shell
      e: "#282828", // eyes
      h: "#607888", // horn
    },
    grid: [
      ".....h..........",
      "....bbbbb.......",
      "...bbbbbbb......",
      "...bbebbebb.....",
      "...bbbbbbb......",
      "....bbbbb.......",
      "..gggbbbbggg....",
      ".ggggbccbgggg...",
      ".ggg.bccb.ggg...",
      "...bbbccbbbb....",
      "..bbbbbbbbbbb...",
      "..bbbbcccbbbb...",
      "...bbbcccbbb....",
      "....bbbbbbb.....",
      "................",
      "................",
    ],
  },
  ditto: {
    palette: {
      p: "#B088C0", // purple-pink
      d: "#906898", // dark purple
      e: "#282828", // dot eyes
      m: "#282828", // mouth
    },
    grid: [
      "................",
      "................",
      "................",
      "......pppp......",
      ".....pppppp.....",
      "....pppppppp....",
      "....ppeppepp....",
      "....pppppppp....",
      "....pppmmpppp...",
      "....pppppppp....",
      "....pppppppp....",
      ".....pppppp.....",
      "......pppp......",
      "................",
      "................",
      "................",
    ],
  },
  eevee: {
    palette: {
      b: "#B08050", // brown body
      c: "#F0D8B0", // cream collar/mane
      d: "#805830", // dark brown
      e: "#282828", // eyes
      n: "#282828", // nose
      t: "#C09060", // tan
    },
    grid: [
      "................",
      "...dd.....dd....",
      "..dbb.....bbd...",
      "..dbb.....bbd...",
      "...bbbb.bbbb....",
      "...bbebbebb.....",
      "...bbbbnbbb.....",
      "....bbbbb.......",
      "...ccbbbbc......",
      "..ccccbcccc.....",
      "..cc.bbbbc......",
      ".....bbbbb......",
      ".....bb.bb......",
      "....bb...bb.....",
      "....dd...dd.....",
      "................",
    ],
  },
  vaporeon: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      c: "#F0E8C0", // cream collar
      e: "#282828", // eyes
      f: "#80C0E0", // fin
    },
    grid: [
      "..ff.......ff...",
      "..fb.......bf...",
      "...bb.....bb....",
      "...bbbbbbbbb....",
      "...bbebbebb.....",
      "...bbbbnbbb.....",
      "....bbbbb.......",
      "...ccbbbcc......",
      "..ccbbbbbbcc....",
      "...bbbbbbbbb....",
      "....bbbbbbb.....",
      ".....bb..bb.....",
      "....bb....bb....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  jolteon: {
    palette: {
      y: "#F8D030", // yellow body
      d: "#C0A020", // dark yellow
      w: "#F0F0F0", // white collar
      e: "#282828", // eyes
      s: "#E8C040", // spiky
    },
    grid: [
      "..ss.......ss...",
      "..sy.......ys...",
      "...yy.....yy....",
      "...yyyyyyyyy....",
      "...yyeyyeyy.....",
      "...yyyyyyyy.....",
      "....yyyyy.......",
      "...ssyyysss.....",
      "..ssyyyyysss....",
      "..ss.yyyyy.ss...",
      ".....yyyyy......",
      ".....yy..yy.....",
      "....yy....yy....",
      "....dd....dd....",
      "................",
      "................",
    ],
  },
  flareon: {
    palette: {
      o: "#E87040", // orange body
      c: "#F8E080", // cream/yellow mane
      d: "#C05830", // dark orange
      e: "#282828", // eyes
    },
    grid: [
      "..dd.......dd...",
      "..do.......od...",
      "...oo.....oo....",
      "...ooooooooo....",
      "...ooeooeoo.....",
      "...ooooonoo.....",
      "....ooooo.......",
      "...ccoooccc.....",
      "..cccooocccc....",
      "..cccooooccc....",
      "...ccooocc......",
      "....ooo.oo......",
      "....oo...oo.....",
      "....dd...dd.....",
      "................",
      "................",
    ],
  },
  porygon: {
    palette: {
      p: "#E88098", // pink body
      b: "#5898D8", // blue
      c: "#F0D0D8", // cream
      d: "#C06070", // dark pink
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "......pppp......",
      ".....pppppp.....",
      "....ppepp.pp....",
      "....pppppp.p....",
      ".....pppp.......",
      "...pppppppp.....",
      "..ppppbbpppp....",
      "..ppppbbpppp....",
      "..ppppppppp.....",
      "...pppppppp.....",
      "....pppppp......",
      "....pp..pp......",
      "....bb..bb......",
      "................",
      "................",
    ],
  },
  omanyte: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue shell
      c: "#C0B8A0", // cream
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......dddd......",
      ".....dddddd.....",
      "....dddddddd....",
      "....dddcdddd....",
      "....ddcccddd....",
      ".....ddddd......",
      "....bbbbbb......",
      "...bbbebbeb.....",
      "...bbbbbbbbb....",
      "....bbbbbbb.....",
      ".....bbbbb......",
      "................",
      "................",
      "................",
    ],
  },
  omastar: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue shell
      c: "#C0B8A0", // cream
      e: "#282828", // eyes
      s: "#486888", // spikes
    },
    grid: [
      "................",
      "...s.dddddd.s...",
      "...sddddddds....",
      "..sdddddddddds..",
      "..sddddcddddds..",
      "..sdddcccdddds..",
      "...sdddddddds...",
      "....sdddddds....",
      "...bbbbbbbbb....",
      "..bbbbbebbeb....",
      "..bbbbbbbbbbb...",
      "...bbbbbbbbb....",
      "....bbbbbbb.....",
      "................",
      "................",
      "................",
    ],
  },
  kabuto: {
    palette: {
      b: "#C0A060", // brown shell
      d: "#886040", // dark brown
      c: "#F0D8B0", // cream
      e: "#C03028", // red eyes
    },
    grid: [
      "................",
      "................",
      "................",
      "......dddd......",
      ".....dbbbbdd....",
      "....dbbbbbbdd...",
      "...dbbbbbbbbdd..",
      "...dbbbebbebdd..",
      "...dbbbbbbbbdd..",
      "...dddbbbbdddd..",
      "......cccc......",
      ".....cccccc.....",
      "......cccc......",
      "................",
      "................",
      "................",
    ],
  },
  kabutops: {
    palette: {
      b: "#C0A060", // brown body
      d: "#886040", // dark brown
      c: "#F0D8B0", // cream
      e: "#C03028", // red eyes
      s: "#B0A080", // scythes
    },
    grid: [
      "................",
      ".....ddddd......",
      "....dbbbbbd.....",
      "....dbbebbeb....",
      "....dbbbbbb.....",
      ".....dbbbd......",
      "......bbb.......",
      "..s..bbbbb..s...",
      "..ss.bccbb.ss...",
      "...s.bccbb.s....",
      ".....bbbbb......",
      "......b.b.......",
      ".....bb.bb......",
      "....bb...bb.....",
      "....dd...dd.....",
      "................",
    ],
  },
  aerodactyl: {
    palette: {
      g: "#A090B0", // grey-purple body
      d: "#706080", // dark
      c: "#C0B0C0", // light
      e: "#282828", // eyes
      w: "#B0A0C0", // wings
    },
    grid: [
      "................",
      "ww...gggg...ww..",
      "www.gggggg.www..",
      "wwwggeggegwww...",
      "wwwgggggggwww...",
      ".wwwggggwwww....",
      "..wwggggww......",
      "...wggggw.......",
      "....gggg........",
      "...ggccgg.......",
      "...ggccgg.......",
      "....gggg........",
      ".....g.g........",
      "....gg.gg.......",
      "....dd.dd.......",
      "................",
    ],
  },
  snorlax: {
    palette: {
      d: "#384848", // dark teal body
      c: "#F0D8B0", // cream belly
      b: "#506060", // body
      e: "#282828", // eyes
    },
    grid: [
      "................",
      ".....bbbbbb.....",
      "....bbbbbbbb....",
      "...bbbebbebbb...",
      "...bbbbbbbbbb...",
      "....bbbbbbbb....",
      "...bbbbbbbbbb...",
      "..bbbccccccbbb..",
      "..bbbccccccbbb..",
      ".bbbbccccccbbbb.",
      ".bbbbccccccbbbb.",
      "..bbbccccccbbb..",
      "...bbbbbbbbbb...",
      "....bbb..bbb....",
      "....ddd..ddd....",
      "................",
    ],
  },
  articuno: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      c: "#A0D0E8", // light blue
      w: "#F0F0F0", // white
      e: "#282828", // eyes
    },
    grid: [
      "..dd............",
      "..dbb...........",
      "...bbbb.........",
      "....bbebbeb.....",
      "....bbbbbb......",
      ".....bbbb.......",
      "......bbb.......",
      ".ww..bbbbb..ww..",
      "wwww.bccbb.wwww.",
      "wwwwwbccbwwwwww.",
      ".wwwwbbbbwwwww..",
      "..www.bb.www....",
      "......bb.bb.....",
      ".....bb..bb.....",
      ".....dd..dd.....",
      "................",
    ],
  },
  zapdos: {
    palette: {
      y: "#F8D030", // yellow body
      d: "#C0A020", // dark yellow
      k: "#282828", // black
      o: "#E8A040", // orange beak
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "..d...yyyy......",
      "..dy..yyyyy.....",
      "...dy.yeyyey....",
      "...dyyyyyyyy....",
      "....dyyooyy.....",
      ".....yyyyy......",
      "......yyy.......",
      ".dd..yyyyy..dd..",
      "dddd.yyyyyyydddd",
      "dddddyyyyyyydddd",
      ".dddd.yyy.dddd..",
      "......yy.yy.....",
      ".....yy..yy.....",
      ".....dd..dd.....",
      "................",
    ],
  },
  moltres: {
    palette: {
      y: "#F8D030", // yellow body
      r: "#D03028", // red fire
      o: "#E88040", // orange
      d: "#A04020", // dark
      e: "#282828", // eyes
    },
    grid: [
      "..rr..or........",
      "..ror.rr........",
      "...ryyyyy.......",
      "....yyyyyyy.....",
      "....yyeyyey.....",
      "....yyyyyyy.....",
      ".....yyyyy......",
      "......yyy.......",
      ".rr..yyyyy..rr..",
      "rror.yyyyyyyrorr",
      "rrorryyyyyrrorr.",
      ".rror.yyy.rror..",
      "......yy.yy.....",
      ".....yy..yy.....",
      ".....dd..dd.....",
      "................",
    ],
  },
  dratini: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      w: "#F0F0F0", // white belly
      e: "#282828", // eyes
    },
    grid: [
      "................",
      "................",
      "......bbbb......",
      ".....bbbbbb.....",
      ".....bebbeb.....",
      ".....bbbbbb.....",
      "......bbbb......",
      "......bbb.......",
      ".....bbwbb......",
      "....bbwwwbb.....",
      "...bbwwwwbb.....",
      "...bw....wb.....",
      "....bb..bb......",
      ".....bbbb.......",
      "................",
      "................",
    ],
  },
  dragonair: {
    palette: {
      b: "#5898D8", // blue body
      d: "#3868A8", // dark blue
      w: "#F0F0F0", // white
      e: "#282828", // eyes
      o: "#5070B0", // orbs
    },
    grid: [
      ".....dd.........",
      "....dbbbd.......",
      "....bebbeb......",
      "....bbbbbb......",
      ".....bbbb.......",
      "......bb........",
      ".....bwbb.......",
      "....bbwwbb......",
      "...obbwwbbo.....",
      "...oob..boo.....",
      "....bb..bb......",
      ".....bbbb.......",
      "......bb........",
      "......bb........",
      ".......b........",
      "................",
    ],
  },
  dragonite: {
    palette: {
      o: "#E8A040", // orange body
      c: "#F0D8A0", // cream belly
      d: "#C07828", // dark orange
      e: "#282828", // eyes
      g: "#78C850", // green wings
      h: "#C09060", // horns
    },
    grid: [
      "..h.........h...",
      "..hoooooooo.h...",
      "...ooeooeooo....",
      "...oooooooo.....",
      "....oooooo......",
      ".gg..oooo..gg...",
      "ggggooccooggg...",
      "ggg.oocccoogg...",
      ".gg.oocccoo.gg..",
      "....oocccoo.....",
      "....ooooooo.....",
      ".....oo.oo......",
      "....oo...oo.....",
      "...ooo...ooo....",
      "....dd...dd.....",
      "................",
    ],
  },
  mewtwo: {
    palette: {
      p: "#C0A0D0", // purple-white body
      d: "#9070A0", // dark purple
      c: "#E0D0E8", // light
      e: "#7060A0", // purple eyes
      t: "#A080B0", // tail
    },
    grid: [
      "................",
      ".....dpppp......",
      "....dpppppp.....",
      "....dpeppep.....",
      "....dpppppp.....",
      ".....pppp.......",
      "......pp........",
      ".....pppp.......",
      "...pppcccppp....",
      "...p.pcccp.p....",
      "...p..ppp..p....",
      "......ppp.......",
      "......p.p.......",
      ".....pp.pp......",
      ".t..ppp.ppp.....",
      "..tt............",
    ],
  },
  mew: {
    palette: {
      p: "#F0A0B0", // pink body
      d: "#C07888", // dark pink
      c: "#F0D0D8", // light pink
      e: "#5078C8", // blue eyes
      t: "#D08898", // tail
    },
    grid: [
      "................",
      "......pppp......",
      ".....pppppp.....",
      ".....peppepp....",
      ".....pppppp.....",
      "......pppp......",
      "......pppp......",
      ".....ppccpp.....",
      "....pppccppp....",
      "....pppppppp....",
      ".....pppppp.....",
      "......pppp......",
      "......pp........",
      ".....pp.........",
      "..ttpp..........",
      ".tt.............",
    ],
  },
  pikachu: {
    palette: {
      y: "#F8D030", // yellow body
      r: "#D03028", // red cheeks
      k: "#282828", // black
      t: "#705020", // brown ear tips
      c: "#F8E868", // light yellow
      w: "#F0F0F0", // white
    },
    grid: [
      "..t...........t.",
      "..ty.........yt.",
      "...yy.......yy..",
      "...yy.......yy..",
      "....yyy...yyy...",
      "....yyyyyyy.....",
      "....ykyykyyy....",
      "....yyycyyy.....",
      "...yryyyyyry....",
      "...yyyy.yyyy....",
      "....yyy.yyy.....",
      ".....yy.yy......",
      ".....yk.ky......",
      "................",
      "......kk........",
      ".....kk.........",
    ],
  },
  raichu: {
    palette: {
      o: "#E8A040", // orange body
      y: "#F8D030", // yellow
      d: "#C07820", // dark orange
      e: "#282828", // eyes
      c: "#F0D8A0", // cream belly
      k: "#282828", // dark
    },
    grid: [
      "................",
      "......oooo......",
      ".....oooooo.....",
      ".....oeooeo.....",
      ".....oooooo.....",
      "......oooo......",
      "......oooo......",
      ".....ooccoo.....",
      "....ooocccooo...",
      "....oooccoo.....",
      ".....ooooo......",
      ".....oo.oo......",
      "....oo...oo.....",
      "....dd...dd..k..",
      "..........k.k...",
      "...........k....",
    ],
  },
  abra: {
    palette: {
      y: "#D8A830", // yellow-brown
      b: "#A07828", // brown
      d: "#806018", // dark brown
      c: "#E8C848", // light yellow
      e: "#282828", // eyes/closed
      p: "#D0A0B0", // pink inner ear
    },
    grid: [
      "................",
      ".....yy..yy.....",
      "....ypy..ypy....",
      "....yyy..yyy....",
      ".....yyyyyy.....",
      ".....yeeeyy.....",
      ".....yyyyyy.....",
      "......yyyy......",
      "....yyyyyy......",
      "....ybccyyy.....",
      "....ybccyyy.....",
      ".....ybbyy......",
      ".....yy.yy......",
      "....bb...bb.....",
      "....d.....d.....",
      "................",
    ],
  },
};

/**
 * Generate all Pokemon sprite textures. Call this in PreloadScene.
 * Creates a texture key matching each Pokemon's spriteKey.
 */
export function generatePokemonSprites(scene: Phaser.Scene): void {
  for (const [id, data] of Object.entries(SPRITES)) {
    const size = 16;
    const canvas = scene.textures.createCanvas(id, size, size);
    if (!canvas) continue;

    const ctx = canvas.getContext();

    for (let row = 0; row < data.grid.length && row < size; row++) {
      const line = data.grid[row];
      for (let col = 0; col < line.length && col < size; col++) {
        const ch = line[col];
        if (ch === "." || ch === " ") continue;
        const color = data.palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(col, row, 1, 1);
      }
    }

    canvas.refresh();
  }
}
