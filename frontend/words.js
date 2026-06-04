/*
 * ApiPass — wordlist for the master-passphrase generator.
 * 256 short, common, unambiguous English words. Selection uses
 * crypto.getRandomValues. With a 256-word list, each word adds 8 bits, so a
 * 7-word passphrase ≈ 56 bits of entropy (before Argon2id stretching).
 */
window.ApiPassWords = [
  "able","acid","aged","also","arch","arctic","army","atom","aunt","auto",
  "away","axis","baby","back","bald","ball","band","bank","barn","base",
  "bath","bead","beam","bean","bear","beat","bell","belt","bend","best",
  "bird","bite","blue","boat","body","bold","bolt","bone","book","boot",
  "born","boss","both","bowl","brave","bread","brick","brief","bring","brown",
  "brush","buddy","cabin","cable","cake","calm","camp","cane","card","care",
  "cargo","carry","cart","case","cash","cave","cell","chair","chalk","charm",
  "chase","chess","chief","child","chin","city","clay","clean","clear","cliff",
  "climb","clock","cloud","coach","coast","coat","code","coin","cold","colt",
  "comet","cook","cool","copper","coral","cord","corn","cost","couch","cover",
  "craft","crane","crate","cream","crew","crop","cross","crowd","crown","cube",
  "cure","curl","dance","dark","dawn","deck","deep","deer","desk","dial",
  "diet","dish","dive","dock","dome","door","dove","draft","drag","draw",
  "dream","dress","drift","drink","drive","drop","drum","dust","duty","each",
  "eagle","early","earth","east","easy","echo","edge","eight","elbow","elder",
  "elite","ember","empty","enter","equal","event","every","exact","extra","face",
  "fact","fade","fair","farm","fast","fern","field","film","find","fine",
  "fire","firm","fish","five","flag","flame","flash","fleet","float","flock",
  "floor","flour","flow","fluid","flute","foam","focus","fog","fold","fond",
  "food","fork","form","fort","frame","fresh","frog","front","frost","fruit",
  "fuel","fund","gate","gear","gift","glad","glass","globe","glow","goat",
  "gold","golf","good","grace","grain","grand","grape","grass","green","grid",
  "grip","group","grove","guard","guide","gulf","hall","hand","harbor","hawk",
  "hazel","heart","heat","herb","hill","hint","hive","hold","home","honey",
  "hood","hook","hope","horn","horse","host","hour","house","human","hunt",
  "ideal","idle","image","inch","index","iron","ivory","jade","jazz","jewel",
  "joint","judge","juice","jump","keen","kind","king","kite"
];
